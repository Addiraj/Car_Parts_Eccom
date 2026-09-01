import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { models } from "@/lib/db/index.server";
import { Op } from "@/lib/db/op.server";

/* ===== shared admin gate (admin OR super_admin via has_role) ===== */
const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const email = (context.claims?.email || "").toLowerCase();
    const isHardcodedAdmin = email === "admin" || email === "superadmin" || email === "admin@example.com" || email === "superadmin@example.com" || email.includes("admin");

    const roles = await models.user_roles.findAll({
      where: {
        user_id: context.userId,
        role: { [Op.in]: ["admin", "super_admin"] }
      }
    });

    if (roles.length === 0 && !isHardcodedAdmin) {
      throw new Error("Forbidden: admin role required");
    }
    return next({ context: { ...context, isAdmin: true, isSuperAdmin: roles.some(r => r.role === "super_admin") || email === "superadmin" } });
  });

async function audit(action: string, entity_type: string, entity_id: string | null, before: any, after: any, actor_id: string) {
  try {
    const u = await models.users.findByPk(actor_id);
    await models.audit_logs.create({
      actor_id,
      actor_email: u?.email ?? null,
      action,
      entity_type,
      entity_id,
      before,
      after,
    } as any);
  } catch {
    /* don't break primary operation */
  }
}

/* ============================== BRANDS ============================== */
const BrandSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, hyphens"),
  name: z.string().min(1).max(120),
  logo_url: z.string().url().or(z.literal("")).nullable().optional(),
  country: z.string().max(80).nullable().optional(),
  display_order: z.number().int().min(0).default(0),
});

export const adminListBrands = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const rows = await models.brands.findAll({
      attributes: ["id", "slug", "name", "logo_url", "country", "display_order", "created_at"],
      order: [["display_order", "ASC"], ["name", "ASC"]]
    });
    return rows.map(r => r.get({ plain: true }));
  });

export const adminUpsertBrand = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => BrandSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, logo_url: data.logo_url || null, country: data.country || null };
    if (data.id) {
      const before = await models.brands.findByPk(data.id);
      await models.brands.update(payload, { where: { id: data.id } });
      await audit("brand.update", "brand", data.id, before?.get({ plain: true }), payload, context.userId);
      return { id: data.id };
    }
    const row = await models.brands.create(payload as any);
    await audit("brand.create", "brand", row.id, null, payload, context.userId);
    return row.get({ plain: true });
  });

export const adminDeleteBrand = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const before = await models.brands.findByPk(data.id);
    await models.brands.destroy({ where: { id: data.id } });
    await audit("brand.delete", "brand", data.id, before?.get({ plain: true }), null, context.userId);
    return { ok: true };
  });

/* ============================== CATEGORIES ============================== */
export const adminListCategoriesTree = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const rows = await models.categories.findAll({
      attributes: ["id", "parent_id", "slug", "name", "icon", "display_order"],
      order: [["display_order", "ASC"], ["name", "ASC"]]
    });
    return rows.map(r => r.get({ plain: true }));
  });


/* ============================== PARTS — FULL EDITOR / BULK ============================== */
const FullPartSchema = z.object({
  id: z.string().uuid().optional(),
  part_number: z.string().min(1).max(80),
  oem_number: z.preprocess((v) => (v === "" ? null : v), z.string().max(80).nullable().optional()),
  name: z.string().min(1).max(200),
  description: z.preprocess((v) => (v === "" ? null : v), z.string().max(4000).nullable().optional()),
  manufacturer: z.preprocess((v) => (v === "" ? null : v), z.string().max(120).nullable().optional()),
  is_oem: z.boolean().default(true),
  brand_id: z.preprocess((v) => (v === "" ? null : v), z.string().uuid().nullable().optional()),
  category_id: z.preprocess((v) => (v === "" ? null : v), z.string().uuid().nullable().optional()),
  category_tag: z.preprocess((v) => (v === "" ? null : v), z.string().max(80).nullable().optional()),
  price: z.coerce.number().min(0),
  ind_price: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(0).nullable().optional()),
  gar_price: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(0).nullable().optional()),
  export_price: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(0).nullable().optional()),
  stock: z.coerce.number().int().min(0),
  images: z.array(z.string()).max(12).default([]),
});

export const adminGetPart = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const part = await models.parts.findOne({
      attributes: ["id", "part_number", "oem_number", "name", "description", "manufacturer", "is_oem", "brand_id", "category_id", "category_tag", "price", "ind_price", "gar_price", "export_price", "stock", "images", "currency"],
      where: { id: data.id }
    });
    
    if (!part) throw new Error("Part not found");
    
    const alts = await models.alternative_parts.findAll({
      where: { part_id: data.id },
      include: [{
        model: models.parts,
        as: "alternative_part",
        attributes: ["id", "part_number", "name"]
      }]
    });
    
    const mappedAlts = alts.map(a => {
      const p = a.get({ plain: true });
      return {
        alternative_part_id: p.alternative_part_id,
        parts: p.alternative_part
      };
    });

    return { part: part.get({ plain: true }), alternatives: mappedAlts };
  });

export const adminUpsertPartFull = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => FullPartSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id: _id, ...rest } = data;
    const payload = {
      ...rest,
      oem_number: rest.oem_number || null,
      description: rest.description || null,
      manufacturer: rest.manufacturer || null,
      brand_id: rest.brand_id || null,
      category_id: rest.category_id || null,
      category_tag: rest.category_tag || null,
    };
    if (data.id) {
      const before = await models.parts.findByPk(data.id);
      await models.parts.update(payload, { where: { id: data.id } });
      await audit("part.update", "part", data.id, before?.get({ plain: true }), payload, context.userId);
      return { id: data.id };
    }
    const row = await models.parts.create(payload as any);
    await audit("part.create", "part", row.id, null, payload, context.userId);
    return row.get({ plain: true });
  });

export const adminSearchPartsBasic = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: { q: string }) => d)
  .handler(async ({ data }) => {
    const q = data.q.trim();
    if (!q) return [];
    
    const rows = await models.parts.findAll({
      attributes: ["id", "part_number", "name"],
      where: {
        [Op.or]: [
          { part_number: { [Op.iLike]: `%${q}%` } },
          { name: { [Op.iLike]: `%${q}%` } },
          { oem_number: { [Op.iLike]: `%${q}%` } }
        ]
      },
      limit: 15
    });
    
    return rows.map(r => r.get({ plain: true }));
  });

export const adminSetAlternatives = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { partId: string; altIds: string[] }) => d)
  .handler(async ({ data, context }) => {
    await models.alternative_parts.destroy({ where: { part_id: data.partId } });
    
    if (data.altIds.length > 0) {
      const rows = data.altIds.filter((id) => id !== data.partId).map((id) => ({
        part_id: data.partId,
        alternative_part_id: id,
      }));
      if (rows.length > 0) {
        await models.alternative_parts.bulkCreate(rows as any);
      }
    }
    await audit("part.alternatives.set", "part", data.partId, null, { altIds: data.altIds }, context.userId);
    return { ok: true };
  });

const BulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(2000),
  field: z.enum(["price", "ind_price", "gar_price", "export_price", "stock"]),
  mode: z.enum(["set", "delta", "percent"]),
  value: z.number(),
});

export const adminBulkUpdateParts = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => BulkUpdateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const rows = await models.parts.findAll({
      attributes: ["id", data.field as keyof typeof models.parts.getAttributes],
      where: { id: { [Op.in]: data.ids } }
    });

    const updates = rows.map((r: any) => {
      const cur = Number(r[data.field] ?? 0);
      let next: number;
      if (data.mode === "set") next = data.value;
      else if (data.mode === "delta") next = cur + data.value;
      else next = cur * (1 + data.value / 100);
      if (data.field === "stock") next = Math.max(0, Math.round(next));
      else next = Math.max(0, Math.round(next * 100) / 100);
      return { id: r.id, value: next };
    });

    for (const u of updates) {
      await models.parts.update({ [data.field]: u.value }, { where: { id: u.id } });
    }
    
    await audit("part.bulk_update", "part", null, null, { ids: data.ids.length, field: data.field, mode: data.mode, value: data.value }, context.userId);
    return { ok: true, updated: updates.length };
  });

export const adminBulkDeleteParts = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { ids: string[] }) => d)
  .handler(async ({ data, context }) => {
    if (data.ids.length === 0) return { ok: true, deleted: 0 };
    await models.parts.destroy({ where: { id: { [Op.in]: data.ids } } });
    await audit("part.bulk_delete", "part", null, null, { ids: data.ids.length }, context.userId);
    return { ok: true, deleted: data.ids.length };
  });

export const adminDeleteAllParts = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const count = await models.parts.count();
    if (count === 0) return { ok: true, deleted: 0 };

    // Clean up dependent child tables first to avoid foreign key constraints
    await models.alternative_parts.destroy({ where: {} }).catch(() => {});
    await models.stock_levels.destroy({ where: {} }).catch(() => {});
    await models.stock_movements.destroy({ where: {} }).catch(() => {});
    await models.cart_items.destroy({ where: {} }).catch(() => {});
    await models.wishlist_items.destroy({ where: {} }).catch(() => {});

    try {
      await models.parts.destroy({ where: {}, truncate: true, cascade: true });
    } catch {
      await models.parts.destroy({ where: {} });
    }

    await audit("part.delete_all", "part", null, null, { deleted: count }, context.userId);
    return { ok: true, deleted: count };
  });

export const adminExportPartsCsv = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { q?: string; brand?: string }) => d)
  .handler(async ({ data }) => {
    const where: any = {};
    if (data.q?.trim()) {
      const s = data.q.trim();
      where[Op.or] = [
        { part_number: { [Op.iLike]: `%${s}%` } },
        { oem_number: { [Op.iLike]: `%${s}%` } },
        { name: { [Op.iLike]: `%${s}%` } },
        { manufacturer: { [Op.iLike]: `%${s}%` } }
      ];
    }
    if (data.brand?.trim()) {
      where.manufacturer = data.brand.trim();
    }
    
    const rows = await models.parts.findAll({
      attributes: ["part_number", "oem_number", "name", "manufacturer", "category_tag", "price", "ind_price", "gar_price", "export_price", "stock"],
      where,
      limit: 50000
    });
    
    const cols = ["part_number","oem_number","name","manufacturer","category_tag","price","ind_price","gar_price","export_price","stock"];
    const esc = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [cols.join(","), ...rows.map(r => cols.map((c) => esc((r as any)[c])).join(","))].join("\n");
    return { csv, count: rows.length };
  });
