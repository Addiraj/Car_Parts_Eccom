import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { models } from "@/lib/db/index.server";
import { Op } from "@/lib/db/op.server";
import { z } from "zod";

export const VAT_RATE = 0.05;

/* ============= ADDRESSES ============= */

const AddressSchema = z.object({
  full_name: z.string().min(2).max(120),
  phone: z.string().min(7).max(30),
  emirate: z.string().min(2).max(40),
  area: z.string().min(1).max(120),
  street: z.string().min(1).max(200),
  building: z.string().max(120).optional().nullable(),
  landmark: z.string().max(200).optional().nullable(),
  is_default: z.boolean().optional(),
});

export const getMyAddresses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const addresses = await models.addresses.findAll({
      where: { user_id: context.userId },
      order: [
        ["is_default", "DESC"],
        ["created_at", "DESC"]
      ]
    });
    return JSON.parse(JSON.stringify(addresses.map(a => a.get({ plain: true }))));
  });

export const saveAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => AddressSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (data.is_default) {
      await models.addresses.update({ is_default: false }, { where: { user_id: context.userId } });
    }
    const row = await models.addresses.create({ ...data, user_id: context.userId });
    return row.get({ plain: true });
  });

export const deleteAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await models.addresses.destroy({ where: { id: data.id, user_id: context.userId } });
    return { ok: true };
  });

/* ============= SHIPPING / COUPON ============= */

export const getShippingZones = createServerFn({ method: "GET" }).handler(async () => {
  const zones = await models.shipping_zones.findAll({ order: [["emirate", "ASC"]] });
  return zones.map(z => z.get({ plain: true }));
});

export const validateCoupon = createServerFn({ method: "POST" })
  .validator((d: { code: string; subtotal: number }) => d)
  .handler(async ({ data }) => {
    const code = data.code.trim().toUpperCase();
    if (!code) return { ok: false as const, error: "Enter a code" };
    const c = await models.coupons.findOne({ where: { code: code, active: true } });
    if (!c) return { ok: false as const, error: "Invalid code" };
    if (c.expires_at && new Date(c.expires_at) < new Date()) return { ok: false as const, error: "Code expired" };
    if (c.max_uses && Number(c.used_count) >= Number(c.max_uses)) return { ok: false as const, error: "Code limit reached" };
    if (Number(data.subtotal) < Number(c.min_order)) return { ok: false as const, error: `Min order AED ${c.min_order}` };
    const discount = c.discount_type === "percent"
      ? Math.round(((Number(data.subtotal) * Number(c.discount_value)) / 100) * 100) / 100
      : Number(c.discount_value);
    return { ok: true as const, code: c.code, discount, type: c.discount_type, value: Number(c.discount_value) };
  });

/* ============= ORDERS ============= */

const PlaceOrderSchema = z.object({
  address_id: z.string().uuid(),
  payment_method: z.enum(["cod", "wallet"]).default("cod"),
  coupon_code: z.string().max(40).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  price_tier: z.enum(["rate", "ind", "gar", "exp"]).optional().nullable(),
});

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => PlaceOrderSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Load address
    const addr = await models.addresses.findOne({ where: { id: data.address_id, user_id: userId } });
    if (!addr) throw new Error("Address not found");

    // Resolve customer tier server-side (never trust client)
    const profile = await models.profiles.findOne({ where: { id: userId }, attributes: ["customer_type"] });
    let tier = ((profile?.customer_type ?? "IND") as "IND" | "GAR" | "EXP");
    let tierCol: "price" | "ind_price" | "gar_price" | "export_price" =
      tier === "GAR" ? "gar_price" : tier === "EXP" ? "export_price" : "ind_price";

    // Staff override: allow admin/super_admin/salesman to pick tier at checkout
    if (data.price_tier) {
      const { isStaffUser } = await import("@/lib/account.functions");
      if (await isStaffUser(context.supabase, userId)) {
        const map = { rate: "price", ind: "ind_price", gar: "gar_price", exp: "export_price" } as const;
        tierCol = map[data.price_tier];
        tier = data.price_tier === "gar" ? "GAR" : data.price_tier === "exp" ? "EXP" : "IND";
      }
    }

    // Load cart + part tier prices via admin to ignore client-side projection
    const cart = await models.cart_items.findAll({ where: { user_id: userId }, attributes: ["part_id", "quantity"] });
    if (!cart || cart.length === 0) throw new Error("Cart is empty");

    const ids = cart.map(c => c.part_id).filter(Boolean);
    const parts = await models.parts.findAll({
      where: { id: { [Op.in]: ids } },
      attributes: ["id", "part_number", "name", "manufacturer", "images", "stock", "price", tierCol]
    });
    const byId = new Map<string, any>(parts.map(p => [p.id, p.get({ plain: true })]));

    const lines = cart
      .filter(it => byId.has(it.part_id))
      .map(it => {
        const p = byId.get(it.part_id!);
        const unit = Number(p[tierCol] ?? p.price ?? 0);
        return {
          part: p,
          quantity: it.quantity,
          unit_price: unit,
        };
      });
    if (!lines.length) throw new Error("Cart is empty");

    const subtotal = lines.reduce((s, l) => s + l.unit_price * (l.quantity ?? 1), 0);

    // Shipping
    const zone = await models.shipping_zones.findOne({ where: { emirate: addr.emirate } });
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

    if (data.payment_method === "wallet") {
      throw new Error("Wallet payment is not currently supported.");
    }

    // Insert order
    const order = await models.orders.create({
      user_id: userId,
      payment_method: data.payment_method,
      subtotal, vat, shipping_fee, discount, total,
      coupon_code,
      customer_type: tier,
      shipping_address: {
        full_name: addr.full_name, phone: addr.phone, emirate: addr.emirate,
        area: addr.area, street: addr.street, building: addr.building, landmark: addr.landmark,
      },
      notes: data.notes ?? null,
    });

    // Insert items with tier-resolved price snapshot
    const items = lines.map((l) => ({
      order_id: order.id,
      part_id: l.part?.id ?? null,
      part_number: l.part?.part_number ?? "",
      name: l.part?.name ?? "",
      manufacturer: l.part?.manufacturer ?? null,
      image_url: l.part?.images?.[0] ?? null,
      unit_price: l.unit_price,
      quantity: l.quantity,
      line_total: Math.round(l.unit_price * (l.quantity ?? 1) * 100) / 100,
      customer_type: tier,
      price_tier: tierCol,
    }));
    await models.order_items.bulkCreate(items);

    await models.order_events.create({
      order_id: order.id, status: "placed", note: "Cash on delivery",
    });

    if (coupon_code) {
      const c = await models.coupons.findOne({ where: { code: coupon_code }, attributes: ["id", "used_count"] });
      if (c) await models.coupons.update({ used_count: (c.used_count || 0) + 1 }, { where: { id: c.id } });
    }
    await models.cart_items.destroy({ where: { user_id: userId } });

    return order.get({ plain: true });
  });

export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const orders = await models.orders.findAll({
      where: { user_id: context.userId },
      attributes: ["id", "order_number", "status", "total", "currency", "payment_method", "created_at"],
      order: [["created_at", "DESC"]]
    });
    return orders.map(o => o.get({ plain: true }));
  });

export const getOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const order = await models.orders.findOne({ where: { id: data.id, user_id: context.userId } });
    if (!order) return null;
    
    const items = await models.order_items.findAll({ where: { order_id: order.id } });
    const events = await models.order_events.findAll({ where: { order_id: order.id }, order: [["created_at", "ASC"]] });
    
    const plainOrder: any = order.get({ plain: true });
    plainOrder.items = items.map(i => i.get({ plain: true }));
    plainOrder.events = events.map(e => e.get({ plain: true }));
    return plainOrder;
  });

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const order = await models.orders.findOne({
      where: { id: data.id, user_id: context.userId },
      attributes: ["status", "user_id", "total", "order_number", "payment_method"]
    });
    if (!order) throw new Error("Order not found");
    if (!["placed", "confirmed"].includes(order.status || "")) throw new Error("Cannot cancel at this stage");
    
    await models.orders.update({ status: "cancelled" }, { where: { id: data.id } });
    await models.order_events.create({ order_id: data.id, status: "cancelled", note: "Cancelled by customer" });

    // Refund wallet if paid via wallet (currently not supported but kept for completeness)
    if (order.payment_method === "wallet") {
      throw new Error("Wallet refunds are not supported in COD only mode.");
    }
    return { ok: true };
  });

/* ============= RECENTLY VIEWED ============= */

async function notifyAssignedSalesman(opts: {
  userId: string;
  activity: "part_viewed" | "catalog_viewed";
  entityType: string;
  entityId: string;
  title: string;
  body?: string;
  metadata?: Record<string, any>;
}) {
  try {
    const assign = await models.customer_assignments.findOne({ where: { customer_id: opts.userId } });
    const salesmanId = assign?.salesman_id;
    if (!salesmanId) return;

    // We can directly insert into admin_notifications instead of calling log_customer_activity for now
    await models.admin_notifications.create({
      type: "lead",
      title: opts.title,
      body: opts.body ?? null,
      entity_type: opts.entityType,
      entity_id: opts.entityId,
      salesman_id: salesmanId,
      metadata: { ...(opts.metadata ?? {}), customer_id: opts.userId },
    });
  } catch {}
}

export const trackView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { partId: string }) => d)
  .handler(async ({ data, context }) => {
    await models.recently_viewed.upsert({ 
      user_id: context.userId, 
      part_id: data.partId, 
      viewed_at: new Date() 
    });
    
    const part = await models.parts.findOne({ where: { id: data.partId }, attributes: ["part_number", "name"] });
    await notifyAssignedSalesman({
      userId: context.userId,
      activity: "part_viewed",
      entityType: "part",
      entityId: data.partId,
      title: "Assigned customer viewed a part",
      body: part ? `${part.part_number ?? ""} ${part.name ?? ""}`.trim() : undefined,
      metadata: { part_number: part?.part_number, name: part?.name },
    });
    return { ok: true };
  });

export const trackCatalogView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { brand: string; modelNumber: string; modelName?: string }) =>
    z.object({
      brand: z.string().min(1).max(80),
      modelNumber: z.string().min(1).max(120),
      modelName: z.string().max(200).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await notifyAssignedSalesman({
      userId: context.userId,
      activity: "catalog_viewed",
      entityType: "catalog",
      entityId: `${data.brand}/${data.modelNumber}`,
      title: "Assigned customer browsed a catalog",
      body: `${data.brand} ${data.modelName ?? ""} ${data.modelNumber}`.trim(),
      metadata: { brand: data.brand, model_number: data.modelNumber, model_name: data.modelName ?? null },
    });
    return { ok: true };
  });

export const getRecentlyViewed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await models.profiles.findOne({ where: { id: context.userId }, attributes: ["customer_type"] });
    const tier = ((profile?.customer_type ?? "IND") as "IND" | "GAR" | "EXP");
    const tierCol = tier === "GAR" ? "gar_price" : tier === "EXP" ? "export_price" : "ind_price";
    
    const views = await models.recently_viewed.findAll({
      where: { user_id: context.userId },
      include: [{
        model: models.parts,
        as: 'part',
        attributes: ["id", "part_number", "name", "price", tierCol, "images", "manufacturer"]
      }],
      order: [["viewed_at", "DESC"]],
      limit: 12
    });
    
    return JSON.parse(JSON.stringify(views.map(v => {
      const r: any = v.get({ plain: true });
      if (r.part) {
        const resolved = r.part[tierCol];
        r.part.price = Number(resolved ?? r.part.price ?? 0);
      }
      return r;
    })));
  });
