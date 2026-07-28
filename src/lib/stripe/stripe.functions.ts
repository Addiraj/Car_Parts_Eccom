import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { validateCoupon, VAT_RATE } from "@/lib/orders.functions";
import { isStripeConfigured, STRIPE_CURRENCY, getStripePublishableKey } from "./config";
import { models } from "@/lib/db/index.server";
import { Op } from "@/lib/db/op.server";

const CheckoutSchema = z.object({
  address_id: z.string().uuid(),
  coupon_code: z.string().max(40).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  origin: z.string().url(),
  price_tier: z.enum(["rate", "ind", "gar", "exp"]).optional().nullable(),
});

export const createStripeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => CheckoutSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (!isStripeConfigured()) {
      return { ok: false as const, configured: false as const, error: "Stripe is not configured yet." };
    }

    const { userId } = context;

    // Load address (RLS scopes to user)
    const addrRow = await models.addresses.findOne({ where: { id: data.address_id, user_id: userId } });
    if (!addrRow) throw new Error("Address not found");
    const addr = addrRow.get({ plain: true });

    // Resolve tier server-side
    const profileRow = await models.profiles.findOne({ attributes: ["customer_type", "full_name"], where: { id: userId } });
    const profile = profileRow ? profileRow.get({ plain: true }) : null;
    let tier = ((profile?.customer_type ?? "IND") as "IND" | "GAR" | "EXP");
    let tierCol: "price" | "ind_price" | "gar_price" | "export_price" =
      tier === "GAR" ? "gar_price" : tier === "EXP" ? "export_price" : "ind_price";

    if (data.price_tier) {
      const { isStaffUser } = await import("@/lib/account.functions");
      if (await isStaffUser(context.supabase, userId)) {
        const map = { rate: "price", ind: "ind_price", gar: "gar_price", exp: "export_price" } as const;
        tierCol = map[data.price_tier];
        tier = data.price_tier === "gar" ? "GAR" : data.price_tier === "exp" ? "EXP" : "IND";
      }
    }


    // Load cart
    const cartRows = await models.cart_items.findAll({ attributes: ["part_id", "quantity"], where: { user_id: userId } });
    const cart = cartRows.map((c: any) => c.get({ plain: true }));
    if (!cart || cart.length === 0) throw new Error("Cart is empty");

    const ids = cart.map((c: any) => c.part_id).filter(Boolean);
    const partsRows = await models.parts.findAll({
      attributes: ["id", "part_number", "name", "manufacturer", "images", "price", tierCol],
      where: { id: { [Op.in]: ids } }
    });
    const parts = partsRows.map((p: any) => p.get({ plain: true }));
    const byId = new Map<string, any>((parts ?? []).map((p: any) => [p.id, p]));

    const lines = cart
      .filter((it: any) => byId.has(it.part_id))
      .map((it: any) => {
        const p = byId.get(it.part_id);
        const unit = Number((p as any)[tierCol] ?? p.price ?? 0);
        return { part: p, quantity: it.quantity, unit_price: unit };
      });
    if (!lines.length) throw new Error("Cart is empty");

    const subtotal = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);

    // Shipping
    const zoneRow = await models.shipping_zones.findOne({ where: { emirate: addr.emirate } });
    const zone = zoneRow ? zoneRow.get({ plain: true }) : null;
    const shipping_fee = zone
      ? (zone.free_over && subtotal >= Number(zone.free_over) ? 0 : Number(zone.fee))
      : 30;

    // Coupon
    let discount = 0;
    let coupon_code: string | null = null;
    if (data.coupon_code) {
      const v = await validateCoupon({ data: { code: data.coupon_code, subtotal } });
      if (v.ok) { discount = v.discount; coupon_code = v.code; }
    }

    const taxable = Math.max(0, subtotal - discount);
    const vat = Math.round(taxable * VAT_RATE * 100) / 100;
    const total = Math.round((taxable + vat + shipping_fee) * 100) / 100;

    // Insert order as pending
    const orderRow = await models.orders.create({
      user_id: userId,
      payment_method: "stripe",
      payment_provider: "stripe",
      payment_status: "pending",
      status: "pending_payment",
      subtotal, vat, shipping_fee, discount, total,
      currency: STRIPE_CURRENCY.toUpperCase(),
      coupon_code,
      customer_type: tier,
      shipping_address: {
        full_name: addr.full_name, phone: addr.phone, emirate: addr.emirate,
        area: addr.area, street: addr.street, building: addr.building, landmark: addr.landmark,
      },
      notes: data.notes ?? null,
    });
    const order = orderRow.get({ plain: true });

    // Insert order items snapshot
    const items = lines.map((l) => ({
      order_id: order.id,
      part_id: l.part?.id ?? null,
      part_number: l.part?.part_number ?? "",
      name: l.part?.name ?? "",
      manufacturer: l.part?.manufacturer ?? null,
      image_url: l.part?.images?.[0] ?? null,
      unit_price: l.unit_price,
      quantity: l.quantity,
      line_total: Math.round(l.unit_price * l.quantity * 100) / 100,
      customer_type: tier,
      price_tier: tierCol,
    }));
    await models.order_items.bulkCreate(items);

    // Build Stripe session
    const { getStripeClient } = await import("./stripe.server");
    const stripe = getStripeClient();
    if (!stripe) return { ok: false as const, configured: false as const, error: "Stripe is not configured yet." };

    // Fetch caller email
    let email = undefined;
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      email = authUser?.user?.email ?? undefined;
    } catch {}

    const line_items = lines.map((l) => ({
      price_data: {
        currency: STRIPE_CURRENCY,
        product_data: {
          name: l.part?.name ?? "Item",
          description: l.part?.part_number ?? undefined,
        },
        unit_amount: Math.round(l.unit_price * 100),
      },
      quantity: l.quantity,
    }));

    // Add VAT as a line item and shipping via shipping_options
    if (vat > 0) {
      line_items.push({
        price_data: {
          currency: STRIPE_CURRENCY,
          product_data: { name: `VAT (${Math.round(VAT_RATE * 100)}%)`, description: undefined },
          unit_amount: Math.round(vat * 100),
        },
        quantity: 1,
      });
    }
    if (discount > 0) {
      // negative amounts aren't allowed on line_items — use a coupon
    }

    const successUrl = `${data.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`;
    const cancelUrl = `${data.origin}/payment/cancel?order_id=${order.id}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      customer_email: email,
      success_url: successUrl,
      cancel_url: cancelUrl,
      shipping_options: shipping_fee > 0 ? [{
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: Math.round(shipping_fee * 100), currency: STRIPE_CURRENCY },
          display_name: `Shipping (${addr.emirate})`,
        },
      }] : undefined,
      discounts: discount > 0 ? [{
        coupon: (await stripe.coupons.create({
          amount_off: Math.round(discount * 100),
          currency: STRIPE_CURRENCY,
          duration: "once",
          name: coupon_code ?? "Discount",
        })).id,
      }] : undefined,
      metadata: {
        order_id: order.id,
        order_number: order.order_number ?? "",
        user_id: userId,
      },
      payment_intent_data: {
        metadata: { order_id: order.id, user_id: userId },
      },
    });

    // Persist session id
    await models.orders.update({ stripe_session_id: session.id }, { where: { id: order.id } });

    await models.order_events.create({
      order_id: order.id, status: "pending_payment", note: `Stripe session created (${session.id})`,
      created_by: userId
    });

    return {
      ok: true as const,
      configured: true as const,
      url: session.url,
      sessionId: session.id,
      publishableKey: getStripePublishableKey(),
      orderId: order.id,
    };
  });

export const getOrderPaymentStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { session_id?: string; order_id?: string }) => d)
  .handler(async ({ data, context }) => {
    const where: any = {};
    if (data.order_id) where.id = data.order_id;
    else if (data.session_id) where.stripe_session_id = data.session_id;
    else throw new Error("session_id or order_id required");
    
    const row = await models.orders.findOne({
      attributes: ["id", "order_number", "status", "payment_status", "total", "currency", "amount_paid", "paid_at", "stripe_session_id"],
      where
    });
    
    if (!row) return null;
    return row.get({ plain: true });
  });
