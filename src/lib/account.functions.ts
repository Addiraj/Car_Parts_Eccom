import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import type { CustomerType } from "@/lib/pricing";
import { z } from "zod";

export type StaffTier = "rate" | "ind" | "gar" | "exp";
export const STAFF_TIER_COLUMN: Record<StaffTier, "price" | "ind_price" | "gar_price" | "export_price"> = {
  rate: "price",
  ind: "ind_price",
  gar: "gar_price",
  exp: "export_price",
};

async function getUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

export async function isStaffUser(_supabaseClient: any, userId: string): Promise<boolean> {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin", "salesman"]);
  return (roles?.length ?? 0) > 0;
}

async function tierFor(userId: string): Promise<{ tier: CustomerType; col: "ind_price" | "gar_price" | "export_price" }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("customer_type")
    .eq("id", userId)
    .maybeSingle();
  const tier = ((profile?.customer_type ?? "IND") as CustomerType);
  const col = tier === "GAR" ? "gar_price" : tier === "EXP" ? "export_price" : "ind_price";
  return { tier, col };
}

function applyTier(rows: any[], col: string) {
  for (const r of rows) {
    const p = r.part;
    if (p) p.price = Number((p as any)[col] ?? p.price ?? 0);
  }
  return rows;
}

export const getStaffTierPrices = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ partIds: z.array(z.string().uuid()).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) return { isStaff: false, prices: {} };
    const staff = await isStaffUser(supabase, userId);
    if (!staff || data.partIds.length === 0) return { isStaff: staff, prices: {} };

    const { data: rows } = await supabase
      .from("parts")
      .select("id, price, ind_price, gar_price, export_price")
      .in("id", data.partIds);

    const prices: Record<string, { rate: number; ind: number; gar: number; exp: number }> = {};
    for (const r of rows || []) {
      prices[r.id] = {
        rate: Number(r.price ?? 0),
        ind: Number(r.ind_price ?? 0),
        gar: Number(r.gar_price ?? 0),
        exp: Number(r.export_price ?? 0),
      };
    }
    return { isStaff: true, prices };
  });

/* ============= PROFILE ============= */

export const getMyProfile = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getUserId();
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, avatar_url, customer_type, created_at")
    .eq("id", userId)
    .maybeSingle();

  return profile || null;
});

/* ============= GARAGE ============= */

export const getMyGarage = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getUserId();
  if (!userId) return [];

  const { data: garages } = await supabase
    .from("garages")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return garages || [];
});

const AddVehicleSchema = z.object({
  nickname: z.string().max(60).optional().nullable(),
  vin: z.string().max(17).optional().nullable(),
  brand_name: z.string().min(1).max(80),
  model_name: z.string().min(1).max(80),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  engine_name: z.string().max(80).optional().nullable(),
  reference_tag: z.string().trim().max(60).optional().nullable(),
  set_default: z.boolean().optional(),
});

export const addVehicle = createServerFn({ method: "POST" })
  .validator((d: unknown) => AddVehicleSchema.parse(d))
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) throw new Error("Authentication required");

    if (data.set_default) {
      await supabase.from("garages").update({ is_default: false }).eq("user_id", userId);
    }
    const { data: row, error } = await supabase
      .from("garages")
      .insert({
        user_id: userId,
        nickname: data.nickname ?? null,
        vin: data.vin ?? null,
        brand_name: data.brand_name,
        model_name: data.model_name,
        year: data.year ?? null,
        engine_name: data.engine_name ?? null,
        reference_tag: data.reference_tag ? data.reference_tag : null,
        is_default: data.set_default ?? false,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

export const updateVehicleTag = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ id: z.string().uuid(), reference_tag: z.string().trim().max(60).nullable() }).parse(d),
  )
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) throw new Error("Authentication required");
    await supabase.from("garages").update({ reference_tag: data.reference_tag || null }).eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

export const setDefaultVehicle = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) throw new Error("Authentication required");
    await supabase.from("garages").update({ is_default: false }).eq("user_id", userId);
    await supabase.from("garages").update({ is_default: true }).eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

export const deleteVehicle = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) throw new Error("Authentication required");
    await supabase.from("garages").delete().eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

/* ============= CART ============= */

export const getMyCart = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getUserId();
  if (!userId) return [];

  const { col } = await tierFor(userId);
  const { data: items } = await supabase
    .from("cart_items")
    .select("*, part:parts(id, part_number, name, price, ind_price, gar_price, export_price, currency, images, stock, manufacturer)")
    .eq("user_id", userId)
    .order("added_at", { ascending: false });

  return applyTier(items || [], col);
});

export const addToCart = createServerFn({ method: "POST" })
  .validator((d: { partId: string; quantity?: number }) => d)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) throw new Error("Authentication required");

    const qty = Math.max(1, Math.min(99, data.quantity ?? 1));
    const { data: partRow } = await supabase.from("parts").select("stock").eq("id", data.partId).maybeSingle();
    if (!partRow) throw new Error("Part not found");
    if (Number(partRow.stock ?? 0) <= 0) throw new Error("Out of stock");

    const { data: existing } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", userId)
      .eq("part_id", data.partId)
      .maybeSingle();

    if (existing) {
      await supabase.from("cart_items").update({ quantity: existing.quantity + qty }).eq("id", existing.id);
    } else {
      await supabase.from("cart_items").insert({ user_id: userId, part_id: data.partId, quantity: qty });
    }
    return { ok: true };
  });

const CatalogItemsSchema = z.object({
  items: z.array(
    z.object({
      part_number: z.string().min(1).max(80),
      part_name: z.string().max(200).optional().nullable(),
      quantity: z.number().int().min(1).max(99).optional(),
      brand: z.string().max(80).optional().nullable(),
    })
  ).min(1).max(50),
});

export const addCatalogPartsToCart = createServerFn({ method: "POST" })
  .validator((d: unknown) => CatalogItemsSchema.parse(d))
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) throw new Error("Authentication required");

    let added = 0;
    const skipped: { part_number: string; reason: string }[] = [];

    for (const it of data.items) {
      const pn = it.part_number.trim();
      if (!pn) continue;

      const { data: partRow } = await supabase
        .from("parts")
        .select("id, stock")
        .ilike("part_number", pn)
        .maybeSingle();

      if (!partRow) {
        skipped.push({ part_number: pn, reason: "not in inventory" });
        continue;
      }
      if (Number(partRow.stock ?? 0) <= 0) {
        skipped.push({ part_number: pn, reason: "out of stock" });
        continue;
      }

      const partId = partRow.id;
      const qty = Math.max(1, Math.min(99, it.quantity ?? 1));

      const { data: existingCart } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", userId)
        .eq("part_id", partId)
        .maybeSingle();

      if (existingCart) {
        await supabase
          .from("cart_items")
          .update({ quantity: Math.min(99, existingCart.quantity + qty) })
          .eq("id", existingCart.id);
      } else {
        await supabase.from("cart_items").insert({ user_id: userId, part_id: partId, quantity: qty });
      }
      added++;
    }
    return { added, skipped };
  });

export const updateCartQty = createServerFn({ method: "POST" })
  .validator((d: { id: string; quantity: number }) => d)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) throw new Error("Authentication required");
    const qty = Math.max(1, Math.min(99, data.quantity));
    await supabase.from("cart_items").update({ quantity: qty }).eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

export const removeFromCart = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) throw new Error("Authentication required");
    await supabase.from("cart_items").delete().eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

/* ============= WISHLIST ============= */

export const getMyWishlist = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getUserId();
  if (!userId) return [];

  const { col } = await tierFor(userId);
  const { data: items } = await supabase
    .from("wishlist_items")
    .select("*, part:parts(id, part_number, name, price, ind_price, gar_price, export_price, currency, images, manufacturer)")
    .eq("user_id", userId)
    .order("added_at", { ascending: false });

  return applyTier(items || [], col);
});

export const toggleWishlist = createServerFn({ method: "POST" })
  .validator((d: { partId: string }) => d)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) throw new Error("Authentication required");

    const { data: existing } = await supabase
      .from("wishlist_items")
      .select("id")
      .eq("user_id", userId)
      .eq("part_id", data.partId)
      .maybeSingle();

    if (existing) {
      await supabase.from("wishlist_items").delete().eq("id", existing.id);
      return { added: false };
    }
    await supabase.from("wishlist_items").insert({ user_id: userId, part_id: data.partId });
    return { added: true };
  });

/* ============= COUNTS (for navbar badges) ============= */

export const getMyCartCount = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getUserId();
  if (!userId) return { count: 0 };

  const { data: items } = await supabase.from("cart_items").select("quantity").eq("user_id", userId);
  const count = (items || []).reduce((s, r) => s + Number(r.quantity ?? 0), 0);
  return { count };
});

export const getMyWishlistCount = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getUserId();
  if (!userId) return { count: 0 };

  const { count } = await supabase.from("wishlist_items").select("*", { count: "exact", head: true }).eq("user_id", userId);
  return { count: count ?? 0 };
});
