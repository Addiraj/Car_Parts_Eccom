import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

/* ===== Types ===== */
export type OfferStatus = "active" | "scheduled" | "expired" | "disabled";
export type OfferDiscountType = "percentage" | "fixed";

export type ActiveOffer = {
  offer_id: string;
  offer_name: string;
  discount_type: OfferDiscountType;
  discount_value: number;
  max_discount_amount: number | null;
  end_date: string;
  start_date: string;
};

export type OfferedPart = {
  id: string;
  part_number: string;
  name: string;
  manufacturer: string | null;
  images: string[];
  brand: { name: string; slug: string } | null;
  category: { name: string; slug: string } | null;
  stock: number;
  original_price: number;
  final_price: number;
  savings: number;
  discount_pct: number;
  offer: ActiveOffer;
};

/* ===== Pure helper ===== */
export function computeOfferPrice(
  price: number,
  o: Pick<ActiveOffer, "discount_type" | "discount_value" | "max_discount_amount">,
): { final: number; discount: number } {
  if (!price || price <= 0) return { final: 0, discount: 0 };
  let discount =
    o.discount_type === "percentage"
      ? (price * Number(o.discount_value)) / 100
      : Number(o.discount_value);
  if (o.max_discount_amount && discount > Number(o.max_discount_amount)) discount = Number(o.max_discount_amount);
  if (discount < 0) discount = 0;
  if (discount > price) discount = price;
  const final = Math.max(0, +(price - discount).toFixed(2));
  return { final, discount: +discount.toFixed(2) };
}

/* ===== Public reads ===== */

export const getActiveOffersForParts = createServerFn({ method: "POST" })
  .validator((d: { partIds: string[] }) => d)
  .handler(async ({ data }) => {
    try {
      const ids = Array.from(new Set((data.partIds ?? []).filter(Boolean))).slice(0, 500);
      if (!ids.length) return {} as Record<string, ActiveOffer>;

      const { data: offers } = await supabase
        .from("special_offers")
        .select("*, special_offer_products(part_id)")
        .eq("status", "active");

      const out: Record<string, ActiveOffer> = {};
      for (const o of offers || []) {
        const ao: ActiveOffer = {
          offer_id: o.id,
          offer_name: o.offer_name,
          discount_type: o.discount_type as OfferDiscountType,
          discount_value: Number(o.discount_value),
          max_discount_amount: o.max_discount_amount == null ? null : Number(o.max_discount_amount),
          start_date: o.start_date,
          end_date: o.end_date,
        };
        for (const p of (o.special_offer_products as any[]) || []) {
          if (ids.includes(p.part_id)) {
            out[p.part_id] = ao;
          }
        }
      }
      return out;
    } catch (e) {
      console.error("getActiveOffersForParts error:", e);
      return {};
    }
  });

export const listActiveOffers = createServerFn({ method: "GET" })
  .validator(
    z.object({
      brand: z.string().optional(),
      category: z.string().optional(),
      minDiscountPct: z.number().optional(),
      sort: z.string().optional(),
      limit: z.number().optional(),
    }).default({})
  )
  .handler(async ({ data }) => {
    try {
      const { data: offers } = await supabase
        .from("special_offers")
        .select("*, special_offer_products(part_id)")
        .eq("status", "active");

      const partIds: string[] = [];
      const offerByPart = new Map<string, ActiveOffer>();

      for (const o of offers || []) {
        const ao: ActiveOffer = {
          offer_id: o.id,
          offer_name: o.offer_name,
          discount_type: o.discount_type as OfferDiscountType,
          discount_value: Number(o.discount_value),
          max_discount_amount: o.max_discount_amount == null ? null : Number(o.max_discount_amount),
          start_date: o.start_date,
          end_date: o.end_date,
        };
        for (const p of (o.special_offer_products as any[]) || []) {
          if (p.part_id) {
            partIds.push(p.part_id);
            offerByPart.set(p.part_id, ao);
          }
        }
      }

      if (!partIds.length) return [] as OfferedPart[];

      const { data: parts } = await supabase
        .from("parts")
        .select("id, part_number, name, manufacturer, images, price, stock, brand:brands(name, slug), category:categories(name, slug)")
        .in("id", partIds.slice(0, 100));

      const results: OfferedPart[] = [];
      for (const p of parts || []) {
        const ao = offerByPart.get(p.id);
        if (!ao) continue;
        const price = Number(p.price ?? 0);
        const { final, discount } = computeOfferPrice(price, ao);
        const discount_pct = price > 0 ? Math.round((discount / price) * 100) : 0;
        const brandName = (p.brand as any)?.name;
        const catSlug = (p.category as any)?.slug;

        if (data.brand && brandName !== data.brand) continue;
        if (data.category && catSlug !== data.category) continue;
        if (data.minDiscountPct && discount_pct < data.minDiscountPct) continue;

        results.push({
          id: p.id,
          part_number: p.part_number,
          name: p.name,
          manufacturer: p.manufacturer,
          images: (p.images as any) ?? [],
          brand: (p.brand as any) ?? null,
          category: (p.category as any) ?? null,
          stock: p.stock ?? 0,
          original_price: price,
          final_price: final,
          savings: discount,
          discount_pct,
          offer: ao,
        });
      }

      const sort = data.sort ?? "highest-discount";
      results.sort((a, b) => {
        if (sort === "lowest-price") return a.final_price - b.final_price;
        if (sort === "expiring-soon") return +new Date(a.offer.end_date) - +new Date(b.offer.end_date);
        if (sort === "newest") return +new Date(b.offer.start_date) - +new Date(a.offer.start_date);
        return b.discount_pct - a.discount_pct;
      });

      if (data.limit) return results.slice(0, data.limit);
      return results;
    } catch (e) {
      console.error("listActiveOffers error:", e);
      return [];
    }
  });

export const listHomepageOffers = createServerFn({ method: "GET" })
  .validator(z.object({ limit: z.number().optional() }))
  .handler(async ({ data }) => {
    const limit = data?.limit ?? 8;
    const items = await (listActiveOffers as any)({ data: { sort: "highest-discount", limit } });
    return (items || []) as OfferedPart[];
  });

/* ===== Admin ===== */

const OfferInputSchema = z.object({
  id: z.string().uuid().optional(),
  offer_name: z.string().min(1).max(160),
  description: z.string().max(2000).optional().nullable(),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.number().min(0),
  start_date: z.string(),
  end_date: z.string(),
  status: z.enum(["active", "scheduled", "expired", "disabled"]),
  max_discount_amount: z.number().min(0).optional().nullable(),
  min_order_value: z.number().min(0).optional().nullable(),
  allow_stacking: z.boolean().default(false),
  eligible_customer_types: z.array(z.enum(["IND", "GAR", "EXP"])).default(["IND", "GAR", "EXP"]),
  product_ids: z.array(z.string().uuid()).default([]),
  brand_ids: z.array(z.string().uuid()).default([]),
  category_ids: z.array(z.string().uuid()).default([]),
  manufacturers: z.array(z.string()).default([]),
});

export const adminListOffers = createServerFn({ method: "GET" })
  .validator(z.object({ q: z.string().optional(), status: z.string().optional() }))
  .handler(async ({ data }) => {
    try {
      let q = supabase
        .from("special_offers")
        .select("*, special_offer_products(part_id), special_offer_brands(brand_id, brand:brands(name, slug)), special_offer_categories(category_id, category:categories(name, slug))")
        .order("created_at", { ascending: false });

      if (data?.status && data.status !== "all") {
        q = q.eq("status", data.status);
      }
      if (data?.q?.trim()) {
        q = q.ilike("offer_name", `%${data.q.trim()}%`);
      }

      const { data: rows, error } = await q;
      if (error) return [];
      return (rows || []).map((r: any) => ({
        ...r,
        products: r.special_offer_products,
        brands: r.special_offer_brands,
        categories: r.special_offer_categories,
      }));
    } catch (e) {
      console.error("adminListOffers error:", e);
      return [];
    }
  });

export const adminGetOffer = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { data: row, error } = await supabase
      .from("special_offers")
      .select("*, special_offer_products(part_id, part:parts(id, part_number, name, manufacturer)), special_offer_brands(brand_id), special_offer_categories(category_id)")
      .eq("id", data.id)
      .maybeSingle();

    if (error || !row) throw new Error("Offer not found");
    return {
      ...row,
      products: row.special_offer_products,
      brands: row.special_offer_brands,
      categories: row.special_offer_categories,
    };
  });

export const adminUpsertOffer = createServerFn({ method: "POST" })
  .validator((d: unknown) => OfferInputSchema.parse(d))
  .handler(async ({ data }) => {
    const base: any = {
      offer_name: data.offer_name,
      description: data.description ?? null,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      start_date: data.start_date,
      end_date: data.end_date,
      status: data.status,
      max_discount_amount: data.max_discount_amount ?? null,
      min_order_value: data.min_order_value ?? null,
      allow_stacking: data.allow_stacking,
      eligible_customer_types: data.eligible_customer_types,
    };

    let offerId = data.id;
    if (offerId) {
      await supabase.from("special_offers").update(base).eq("id", offerId);
    } else {
      const { data: inserted } = await supabase.from("special_offers").insert(base).select().single();
      offerId = inserted?.id;
    }

    if (offerId) {
      await supabase.from("special_offer_products").delete().eq("offer_id", offerId);
      if (data.product_ids.length) {
        await supabase.from("special_offer_products").insert(
          data.product_ids.map((part_id) => ({ offer_id: offerId!, part_id }))
        );
      }
    }

    return { id: offerId, success: true };
  });

export const adminDuplicateOffer = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { data: original } = await supabase.from("special_offers").select("*").eq("id", data.id).maybeSingle();
    if (!original) throw new Error("Original offer not found");

    const copy = {
      ...original,
      id: undefined,
      offer_name: `${original.offer_name} (Copy)`,
      status: "disabled",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    delete copy.id;

    const { data: created, error } = await supabase.from("special_offers").insert(copy).select().single();
    if (error) throw new Error(error.message);
    return { ok: true, id: created.id };
  });

export const adminSetOfferStatus = createServerFn({ method: "POST" })
  .validator((d: { id: string; status: OfferStatus }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabase.from("special_offers").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const adminToggleOfferStatus = adminSetOfferStatus;

export const adminDeleteOffer = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabase.from("special_offers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const adminSearchPartsForOffer = createServerFn({ method: "GET" })
  .validator(z.object({ q: z.string().optional(), limit: z.number().optional() }))
  .handler(async ({ data }) => {
    const limit = Math.min(50, data?.limit ?? 20);
    let q = supabase
      .from("parts")
      .select("id, part_number, name, manufacturer, price")
      .limit(limit);

    if (data?.q?.trim()) {
      q = q.or(`name.ilike.%${data.q.trim()}%,part_number.ilike.%${data.q.trim()}%`);
    }

    const { data: rows } = await q;
    return rows || [];
  });

export const adminListOfferEligibleParts = adminSearchPartsForOffer;

export const adminListPartManufacturersForOffer = createServerFn({ method: "GET" }).handler(async () => {
  const { data: parts } = await supabase.from("parts").select("manufacturer").not("manufacturer", "is", null);
  const m = Array.from(new Set((parts || []).map((p) => p.manufacturer).filter(Boolean))).sort();
  return m;
});
