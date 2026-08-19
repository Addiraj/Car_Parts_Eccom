import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export const VAT_RATE = 0.05;

async function getUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

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

export const getMyAddresses = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
});

export const saveAddress = createServerFn({ method: "POST" })
  .validator((d: unknown) => AddressSchema.parse(d))
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) throw new Error("Authentication required");

    if (data.is_default) {
      await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
    }
    const { data: row, error } = await supabase
      .from("addresses")
      .insert({ ...data, user_id: userId })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAddress = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) throw new Error("Authentication required");
    const { error } = await supabase.from("addresses").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============= SHIPPING / COUPON ============= */

export const getShippingZones = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data, error } = await supabase.from("shipping_zones").select("*").order("emirate", { ascending: true });
    if (error) return [];
    return data || [];
  } catch (e) {
    return [];
  }
});

export const validateCoupon = createServerFn({ method: "POST" })
  .validator((d: { code: string; subtotal: number }) => d)
  .handler(async ({ data }) => {
    const code = data.code.trim().toUpperCase();
    if (!code) return { ok: false as const, error: "Enter a code" };
    const { data: c } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code)
      .eq("active", true)
      .maybeSingle();

    if (!c) return { ok: false as const, error: "Invalid code" };
    if (c.expires_at && new Date(c.expires_at) < new Date()) return { ok: false as const, error: "Code expired" };
    if (c.max_uses && Number(c.used_count) >= Number(c.max_uses)) return { ok: false as const, error: "Code limit reached" };
    if (Number(data.subtotal) < Number(c.min_order)) return { ok: false as const, error: `Min order AED ${c.min_order}` };

    const discount =
      c.discount_type === "percent"
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
  .validator((d: unknown) => PlaceOrderSchema.parse(d))
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) throw new Error("Authentication required");

    const { data: addr } = await supabase.from("addresses").select("*").eq("id", data.address_id).eq("user_id", userId).maybeSingle();
    if (!addr) throw new Error("Address not found");

    const { data: profile } = await supabase.from("profiles").select("customer_type").eq("id", userId).maybeSingle();
    let tier = ((profile?.customer_type ?? "IND") as "IND" | "GAR" | "EXP");
    let tierCol: "price" | "ind_price" | "gar_price" | "export_price" =
      tier === "GAR" ? "gar_price" : tier === "EXP" ? "export_price" : "ind_price";

    if (data.price_tier) {
      const map = { rate: "price", ind: "ind_price", gar: "gar_price", exp: "export_price" } as const;
      tierCol = map[data.price_tier];
      tier = data.price_tier === "gar" ? "GAR" : data.price_tier === "exp" ? "EXP" : "IND";
    }

    const { data: cart } = await supabase.from("cart_items").select("part_id, quantity").eq("user_id", userId);
    if (!cart || cart.length === 0) throw new Error("Cart is empty");

    const ids = cart.map((c) => c.part_id).filter(Boolean);
    const { data: parts } = await supabase.from("parts").select("id, part_number, name, manufacturer, images, stock, price, ind_price, gar_price, export_price").in("id", ids);
    const byId = new Map<string, any>((parts || []).map((p) => [p.id, p]));

    const lines = cart
      .filter((it) => byId.has(it.part_id!))
      .map((it) => {
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

    const { data: zone } = await supabase.from("shipping_zones").select("*").eq("emirate", addr.emirate).maybeSingle();
    const shipping_fee = zone
      ? zone.free_over && subtotal >= Number(zone.free_over)
        ? 0
        : Number(zone.fee)
      : 30;

    let discount = 0;
    let coupon_code: string | null = null;
    if (data.coupon_code) {
      const v = await validateCoupon({ data: { code: data.coupon_code, subtotal } });
      if (v.ok) {
        discount = v.discount;
        coupon_code = v.code;
      }
    }

    const taxable = Math.max(0, subtotal - discount);
    const vat = Math.round(taxable * VAT_RATE * 100) / 100;
    const total = Math.round((taxable + vat + shipping_fee) * 100) / 100;

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        payment_method: data.payment_method,
        subtotal,
        vat,
        shipping_fee,
        discount,
        total,
        coupon_code,
        customer_type: tier,
        shipping_address: {
          full_name: addr.full_name,
          phone: addr.phone,
          emirate: addr.emirate,
          area: addr.area,
          street: addr.street,
          building: addr.building,
          landmark: addr.landmark,
        },
        notes: data.notes ?? null,
      })
      .select()
      .single();

    if (orderErr || !order) throw new Error(orderErr?.message || "Failed to place order");

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

    await supabase.from("order_items").insert(items);
    await supabase.from("order_events").insert({
      order_id: order.id,
      status: "placed",
      note: "Cash on delivery",
    });

    if (coupon_code) {
      const { data: c } = await supabase.from("coupons").select("id, used_count").eq("code", coupon_code).maybeSingle();
      if (c) {
        await supabase.from("coupons").update({ used_count: (c.used_count || 0) + 1 }).eq("id", c.id);
      }
    }

    await supabase.from("cart_items").delete().eq("user_id", userId);
    return order;
  });

export const getMyOrders = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, status, total, currency, payment_method, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
});

export const getOrder = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) return null;

    const { data: order } = await supabase.from("orders").select("*").eq("id", data.id).eq("user_id", userId).maybeSingle();
    if (!order) return null;

    const { data: items } = await supabase.from("order_items").select("*").eq("order_id", order.id);
    const { data: events } = await supabase.from("order_events").select("*").eq("order_id", order.id).order("created_at", { ascending: true });

    return {
      ...order,
      items: items || [],
      events: events || [],
    };
  });

export const cancelOrder = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) throw new Error("Authentication required");

    const { data: order } = await supabase.from("orders").select("status").eq("id", data.id).eq("user_id", userId).maybeSingle();
    if (!order) throw new Error("Order not found");
    if (!["placed", "confirmed"].includes(order.status || "")) throw new Error("Cannot cancel at this stage");

    await supabase.from("orders").update({ status: "cancelled" }).eq("id", data.id);
    await supabase.from("order_events").insert({ order_id: data.id, status: "cancelled", note: "Cancelled by customer" });
    return { ok: true };
  });

export const trackView = createServerFn({ method: "POST" })
  .validator((d: { partId: string }) => d)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) return { ok: true };
    await supabase.from("recently_viewed").upsert({
      user_id: userId,
      part_id: data.partId,
      viewed_at: new Date().toISOString(),
    });
    return { ok: true };
  });

export const trackCatalogView = createServerFn({ method: "POST" })
  .validator((d: { brand: string; modelNumber: string; modelName?: string }) => d)
  .handler(async () => {
    return { ok: true };
  });

export const getRecentlyViewed = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getUserId();
  if (!userId) return [];

  const { data: views } = await supabase
    .from("recently_viewed")
    .select("*, part:parts(id, part_number, name, price, ind_price, gar_price, export_price, images, manufacturer)")
    .eq("user_id", userId)
    .order("viewed_at", { ascending: false })
    .limit(12);

  return views || [];
});
