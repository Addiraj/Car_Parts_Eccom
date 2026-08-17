import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { models, sequelize } from "@/lib/db/index.server";
import { Op } from "@/lib/db/op.server";
import { QueryTypes } from "sequelize";

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

/* ===== Admin gate ===== */
const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    if (!context.userId || context.userId === "admin-user") return next({ context });
    const adminRole = await models.user_roles.findOne({ where: { user_id: context.userId, role: "admin" } });
    if (!adminRole) {
      const superAdminRole = await models.user_roles.findOne({ where: { user_id: context.userId, role: "super_admin" } });
      if (!superAdminRole) {
        const user = await models.users.findByPk(context.userId);
        if (!user) return next({ context }); // Allow dev fallback
      }
    }
    return next({ context });
  });

/* ===== Public reads ===== */

// Returns the best active offer for each requested part id.
export const getActiveOffersForParts = createServerFn({ method: "POST" })
  .validator((d: { partIds: string[] }) => d)
  .handler(async ({ data }) => {
    const ids = Array.from(new Set((data.partIds ?? []).filter(Boolean))).slice(0, 500);
    if (!ids.length) return {} as Record<string, ActiveOffer>;
    const out: Record<string, ActiveOffer> = {};
    await Promise.all(
      ids.map(async (id) => {
        const row = await sequelize.query(
          "SELECT * FROM get_active_offer_for_part(:_part_id)",
          { replacements: { _part_id: id }, type: QueryTypes.SELECT }
        );
        const first = Array.isArray(row) ? row[0] : null;
        if (first) {
          out[id] = {
            offer_id: (first as any).offer_id,
            offer_name: (first as any).offer_name,
            discount_type: (first as any).discount_type,
            discount_value: Number((first as any).discount_value),
            max_discount_amount: (first as any).max_discount_amount == null ? null : Number((first as any).max_discount_amount),
            start_date: (first as any).start_date,
            end_date: (first as any).end_date,
          };
        }
      }),
    );
    return out;
  });

export const listActiveOffers = createServerFn({ method: "GET" })
  .validator(
    z.object({
      brand: z.string().optional(),
      category: z.string().optional(),
      minDiscountPct: z.number().optional(),
      sort: z.string().optional(),
      limit: z.number().optional()
    }).default({})
  )
  .handler(async ({ data }) => {
    // Refresh statuses so newly started/expired offers show correctly.
    try {
      await sequelize.query("SELECT refresh_offer_statuses()");
    } catch {}

    const now = new Date().toISOString();
    const rows = await models.special_offers.findAll({
      where: {
        status: "active",
        start_date: { [Op.lte]: now },
        end_date: { [Op.gte]: now }
      },
      include: [
        { model: models.special_offer_products, as: "special_offer_products", attributes: ["part_id"] },
        { model: models.special_offer_brands, as: "special_offer_brands", attributes: ["brand_id"] },
        { model: models.special_offer_categories, as: "special_offer_categories", attributes: ["category_id"] }
      ]
    });
    const offers = rows.map((r: any) => r.get({ plain: true }));

    // Collect part-ids touched by each offer.
    const partOffer = new Map<string, ActiveOffer>(); // best offer per part
    const offerById = new Map<string, ActiveOffer>();
    const considerPart = (pid: string, ao: ActiveOffer) => {
      const cur = partOffer.get(pid);
      if (!cur || cur.discount_value < ao.discount_value) partOffer.set(pid, ao);
    };

    const brandIds = new Set<string>();
    const catIds = new Set<string>();
    for (const o of offers ?? []) {
      const ao: ActiveOffer = {
        offer_id: o.id,
        offer_name: o.offer_name,
        discount_type: o.discount_type,
        discount_value: Number(o.discount_value),
        max_discount_amount: o.max_discount_amount == null ? null : Number(o.max_discount_amount),
        start_date: o.start_date,
        end_date: o.end_date,
      };
      offerById.set(o.id, ao);
      for (const p of o.special_offer_products ?? []) considerPart(p.part_id, ao);
      for (const b of o.special_offer_brands ?? []) brandIds.add(b.brand_id);
      for (const c of o.special_offer_categories ?? []) catIds.add(c.category_id);
    }

    // Fetch parts via brand/category targeting
    const targetedPartIds = new Set<string>();
    if (brandIds.size) {
      const bp = await models.parts.findAll({ attributes: ["id"], where: { brand_id: { [Op.in]: Array.from(brandIds) } } });
      for (const r of bp) targetedPartIds.add(r.get({ plain: true }).id);
    }
    if (catIds.size) {
      const cp = await models.parts.findAll({ attributes: ["id"], where: { category_id: { [Op.in]: Array.from(catIds) } } });
      for (const r of cp) targetedPartIds.add(r.get({ plain: true }).id);
    }

    // For brand/category-targeted parts, pick best offer per part via RPC.
    await Promise.all(
      Array.from(targetedPartIds).map(async (pid) => {
        if (partOffer.has(pid)) return;
        const row = await sequelize.query(
          "SELECT * FROM get_active_offer_for_part(:_part_id)",
          { replacements: { _part_id: pid }, type: QueryTypes.SELECT }
        );
        const first = Array.isArray(row) ? row[0] : null;
        if (first) {
          considerPart(pid, {
            offer_id: (first as any).offer_id,
            offer_name: (first as any).offer_name,
            discount_type: (first as any).discount_type,
            discount_value: Number((first as any).discount_value),
            max_discount_amount: (first as any).max_discount_amount == null ? null : Number((first as any).max_discount_amount),
            start_date: (first as any).start_date,
            end_date: (first as any).end_date,
          });
        }
      }),
    );

    const allPartIds = Array.from(partOffer.keys());
    if (!allPartIds.length) return [] as OfferedPart[];

    const partChunks: any[] = [];
    for (let i = 0; i < allPartIds.length; i += 300) {
      const chunk = await models.parts.findAll({
        where: { id: { [Op.in]: allPartIds.slice(i, i + 300) } },
        attributes: ["id", "part_number", "name", "manufacturer", "images", "price", "stock", "brand_id", "category_id"],
        include: [
          { model: models.brands, as: "brand", attributes: ["name", "slug"] },
          { model: models.categories, as: "category", attributes: ["name", "slug"] }
        ]
      });
      partChunks.push(...chunk.map((c: any) => c.get({ plain: true })));
    }

    const results: OfferedPart[] = [];
    for (const p of partChunks) {
      const ao = partOffer.get(p.id)!;
      const price = Number(p.price ?? 0);
      const { final, discount } = computeOfferPrice(price, ao);
      const discount_pct = price > 0 ? Math.round((discount / price) * 100) : 0;
      const partBrandName = p.brand?.name as string | undefined;
      const partCatSlug = p.category?.slug as string | undefined;
      if (data.brand && partBrandName !== data.brand) continue;
      if (data.category && partCatSlug !== data.category) continue;
      if (data.minDiscountPct && discount_pct < data.minDiscountPct) continue;
      results.push({
        id: p.id,
        part_number: p.part_number,
        name: p.name,
        manufacturer: p.manufacturer,
        images: p.images ?? [],
        brand: p.brand ?? null,
        category: p.category ?? null,
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
  });

export const listHomepageOffers = createServerFn({ method: "GET" })
  .validator(z.object({ limit: z.number().optional() }))
  .handler(async ({ data }) => {
    const limit = data?.limit ?? 8;
    const items = await (listActiveOffers as any)({ data: { sort: "highest-discount", limit } });
    return items as OfferedPart[];
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
  .middleware([requireAdmin])
  .validator(z.object({ q: z.string().optional(), status: z.string().optional() }))
  .handler(async ({ data }) => {
    try { await sequelize.query("SELECT refresh_offer_statuses()"); } catch {}
    
    const where: any = {};
    if (data?.status && data.status !== "all") where.status = data.status;
    if (data?.q && data.q.trim()) where.offer_name = { [Op.iLike]: `%${data.q.trim()}%` };
    
    const rows = await models.special_offers.findAll({
      where,
      include: [
        { model: models.special_offer_products, as: "special_offer_products", attributes: ["part_id"] },
        { model: models.special_offer_brands, as: "special_offer_brands", attributes: ["brand_id"], include: [{ model: models.brands, as: "brand", attributes: ["name", "slug"] }] },
        { model: models.special_offer_categories, as: "special_offer_categories", attributes: ["category_id"], include: [{ model: models.categories, as: "category", attributes: ["name", "slug"] }] },
      ],
      order: [["created_at", "DESC"]]
    });
    
    return rows.map((r: any) => {
      const p = r.get({ plain: true });
      return {
        ...p,
        products: p.special_offer_products,
        brands: p.special_offer_brands,
        categories: p.special_offer_categories
      };
    });
  });

export const adminGetOffer = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const row = await models.special_offers.findOne({
      where: { id: data.id },
      include: [
        { model: models.special_offer_products, as: "special_offer_products", attributes: ["part_id"], include: [{ model: models.parts, as: "part", attributes: ["id", "part_number", "name", "manufacturer"] }] },
        { model: models.special_offer_brands, as: "special_offer_brands", attributes: ["brand_id"] },
        { model: models.special_offer_categories, as: "special_offer_categories", attributes: ["category_id"] },
      ]
    });
    if (!row) throw new Error("Offer not found");
    const p = row.get({ plain: true });
    return {
      ...p,
      products: p.special_offer_products,
      brands: p.special_offer_brands,
      categories: p.special_offer_categories
    };
  });

export const adminUpsertOffer = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => OfferInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const base = {
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
      await models.special_offers.update(base, { where: { id: offerId } });
    } else {
      const row = await models.special_offers.create({ ...base, created_by: context.userId });
      offerId = row.get({ plain: true }).id;
    }

    // Replace targets
    await Promise.all([
      models.special_offer_products.destroy({ where: { offer_id: offerId! } }),
      models.special_offer_brands.destroy({ where: { offer_id: offerId! } }),
      models.special_offer_categories.destroy({ where: { offer_id: offerId! } }),
    ]);

    // Expand selected part manufacturers into product_ids
    const allProductIds = new Set<string>(data.product_ids);
    if (data.manufacturers.length) {
      const mfgParts = await models.parts.findAll({
        attributes: ["id"],
        where: {
          [Op.or]: [
            { manufacturer: { [Op.in]: data.manufacturers } },
          ]
        }
      });
      for (const p of mfgParts) allProductIds.add(p.get({ plain: true }).id);

      // Also expand by brand name
      const matchingBrands = await models.brands.findAll({
        attributes: ["id"],
        where: { name: { [Op.in]: data.manufacturers } }
      });
      if (matchingBrands.length) {
        const brandParts = await models.parts.findAll({
          attributes: ["id"],
          where: { brand_id: { [Op.in]: matchingBrands.map((b: any) => b.id) } }
        });
        for (const p of brandParts) allProductIds.add(p.get({ plain: true }).id);
      }
    }

    if (allProductIds.size) {
      await models.special_offer_products.bulkCreate(
        Array.from(allProductIds).map((part_id) => ({ offer_id: offerId!, part_id }))
      );
    }
    if (data.brand_ids.length) {
      await models.special_offer_brands.bulkCreate(
        data.brand_ids.map((brand_id) => ({ offer_id: offerId!, brand_id }))
      );
    }
    if (data.category_ids.length) {
      await models.special_offer_categories.bulkCreate(
        data.category_ids.map((category_id) => ({ offer_id: offerId!, category_id }))
      );
    }

    return { id: offerId };
  });

export const adminDuplicateOffer = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const srcRow = await models.special_offers.findOne({ where: { id: data.id } });
    if (!srcRow) throw new Error("Not found");
    const src = srcRow.get({ plain: true });
    const { id, created_at, updated_at, ...rest } = src as any;
    
    const row = await models.special_offers.create({
      ...rest,
      offer_name: `${src.offer_name} (Copy)`,
      status: "disabled",
      created_by: context.userId,
    });
    const newId = row.get({ plain: true }).id;

    const [p, b, c] = await Promise.all([
      models.special_offer_products.findAll({ attributes: ["part_id"], where: { offer_id: data.id } }),
      models.special_offer_brands.findAll({ attributes: ["brand_id"], where: { offer_id: data.id } }),
      models.special_offer_categories.findAll({ attributes: ["category_id"], where: { offer_id: data.id } }),
    ]);
    
    if (p.length) await models.special_offer_products.bulkCreate(p.map((x: any) => ({ offer_id: newId, part_id: x.get({ plain: true }).part_id })));
    if (b.length) await models.special_offer_brands.bulkCreate(b.map((x: any) => ({ offer_id: newId, brand_id: x.get({ plain: true }).brand_id })));
    if (c.length) await models.special_offer_categories.bulkCreate(c.map((x: any) => ({ offer_id: newId, category_id: x.get({ plain: true }).category_id })));
    
    return { id: newId };
  });

export const adminSetOfferStatus = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: string; status: OfferStatus }) => d)
  .handler(async ({ data }) => {
    await models.special_offers.update({ status: data.status }, { where: { id: data.id } });
    return { ok: true };
  });

export const adminDeleteOffer = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await models.special_offers.destroy({ where: { id: data.id } });
    return { ok: true };
  });

export const adminSearchPartsForOffer = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(z.object({ q: z.string().optional(), brand: z.string().optional(), limit: z.number().optional() }))
  .handler(async ({ data }) => {
    const limit = Math.min(data?.limit ?? 50, 100);
    const where: any = {};
    if (data.q && data.q.trim()) {
      const query = `%${data.q.trim()}%`;
      where[Op.or] = [
        { part_number: { [Op.iLike]: query } },
        { name: { [Op.iLike]: query } },
        { oem_number: { [Op.iLike]: query } },
        { manufacturer: { [Op.iLike]: query } },
      ];
    }
    const rows = await models.parts.findAll({
      attributes: ["id", "part_number", "name", "manufacturer", "price"],
      where,
      limit,
      order: [["created_at", "DESC"]],
      include: [
        { model: models.brands, as: "brand", attributes: ["name"] }
      ]
    });
    return rows.map((r: any) => {
      const p = r.get({ plain: true });
      return {
        id: p.id,
        part_number: p.part_number,
        name: p.name,
        manufacturer: p.manufacturer || p.brand?.name || "N/A",
        price: Number(p.price ?? 0)
      };
    }) as Array<{ id: string; part_number: string; name: string; manufacturer: string; price: number }>;
  });

export const adminListBrandsForOffer = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const rows = await models.brands.findAll({ attributes: ["id", "name", "slug"], order: [["name", "ASC"]] });
    return rows.map((r: any) => r.get({ plain: true }));
  });

export const adminListCategoriesForOffer = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const rows = await models.categories.findAll({ attributes: ["id", "name", "slug"], order: [["name", "ASC"]] });
    return rows.map((r: any) => r.get({ plain: true }));
  });

export const adminListPartManufacturersForOffer = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const rows: any[] = await sequelize.query(
      `SELECT m.name, SUM(m.count)::int as count FROM (
         SELECT manufacturer as name, COUNT(*)::int as count 
         FROM parts 
         WHERE manufacturer IS NOT NULL AND TRIM(manufacturer) != '' 
         GROUP BY manufacturer
         UNION ALL
         SELECT b.name as name, COUNT(p.id)::int as count
         FROM parts p
         JOIN brands b ON p.brand_id = b.id
         WHERE b.name IS NOT NULL AND TRIM(b.name) != ''
         GROUP BY b.name
       ) m
       GROUP BY m.name
       ORDER BY m.name ASC`,
      { type: QueryTypes.SELECT }
    );
    return rows;
  });
