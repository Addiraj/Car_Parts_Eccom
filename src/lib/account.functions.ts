import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { CustomerType } from "@/lib/pricing";
import { z } from "zod";

import { models } from "@/lib/db/index.server";
import { Op } from "@/lib/db/op.server";

export type StaffTier = "rate" | "ind" | "gar" | "exp";
export const STAFF_TIER_COLUMN: Record<StaffTier, "price" | "ind_price" | "gar_price" | "export_price"> = {
  rate: "price",
  ind: "ind_price",
  gar: "gar_price",
  exp: "export_price",
};

export async function isStaffUser(supabase: any, userId: string): Promise<boolean> {
  const roles = await models.user_roles.findAll({
    where: {
      user_id: userId,
      role: { [Op.in]: ['admin', 'super_admin', 'salesman'] }
    }
  });
  return roles.length > 0;
}

async function tierFor(userId: string): Promise<{ tier: CustomerType; col: "ind_price" | "gar_price" | "export_price" }> {
  const profile = await models.profiles.findOne({ where: { id: userId } });
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
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ partIds: z.array(z.string().uuid()).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const staff = await isStaffUser(context.supabase, context.userId);
    if (!staff || data.partIds.length === 0) return { isStaff: staff, prices: {} as Record<string, { rate: number; ind: number; gar: number; exp: number }> };
    
    const rows = await models.parts.findAll({
      where: { id: { [Op.in]: data.partIds } },
      attributes: ["id", "price", "ind_price", "gar_price", "export_price"]
    });

    const prices: Record<string, { rate: number; ind: number; gar: number; exp: number }> = {};
    for (const r of rows) {
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

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await models.profiles.findOne({
      where: { id: context.userId },
      attributes: ["id", "full_name", "phone", "avatar_url", "customer_type", "created_at"]
    });
    if (!profile) return null;
    return {
      id: profile.id,
      full_name: profile.full_name,
      phone: profile.phone,
      avatar_url: profile.avatar_url,
      customer_type: profile.customer_type,
      created_at: profile.created_at
    };
  });

/* ============= GARAGE ============= */

export const getMyGarage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const garages = await models.garages.findAll({
      where: { user_id: context.userId },
      order: [
        ["is_default", "DESC"],
        ["created_at", "DESC"]
      ]
    });
    return garages.map(g => g.get({ plain: true }));
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
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => AddVehicleSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    if (data.set_default) {
      await models.garages.update({ is_default: false }, { where: { user_id: userId } });
    }
    const row = await models.garages.create({
      user_id: userId,
      nickname: data.nickname ?? null,
      vin: data.vin ?? null,
      brand_name: data.brand_name,
      model_name: data.model_name,
      year: data.year ?? null,
      engine_name: data.engine_name ?? null,
      reference_tag: data.reference_tag ? data.reference_tag : null,
      is_default: data.set_default ?? false,
    });
    return row.get({ plain: true });
  });

export const updateVehicleTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ id: z.string().uuid(), reference_tag: z.string().trim().max(60).nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await models.garages.update(
      { reference_tag: data.reference_tag || null },
      { where: { id: data.id, user_id: context.userId } }
    );
    return { ok: true };
  });

export const setDefaultVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await models.garages.update({ is_default: false }, { where: { user_id: context.userId } });
    await models.garages.update({ is_default: true }, { where: { id: data.id, user_id: context.userId } });
    return { ok: true };
  });

export const deleteVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await models.garages.destroy({ where: { id: data.id, user_id: context.userId } });
    return { ok: true };
  });

/* ============= CART ============= */

export const getMyCart = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { col } = await tierFor(context.userId);
    const items = await models.cart_items.findAll({
      where: { user_id: context.userId },
      include: [{
        model: models.parts,
        as: 'part',
        attributes: ["id", "part_number", "name", "price", col, "currency", "images", "stock", "manufacturer"]
      }],
      order: [["added_at", "DESC"]]
    });
    
    // Flatten so `part` is plain and price is set correctly
    const plainItems = items.map(i => i.get({ plain: true }));
    return JSON.parse(JSON.stringify(applyTier(plainItems, col)));
  });

export const addToCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { partId: string; quantity?: number }) => d)
  .handler(async ({ data, context }) => {
    const qty = Math.max(1, Math.min(99, data.quantity ?? 1));
    const partRow = await models.parts.findOne({ where: { id: data.partId }, attributes: ["stock"] });
    if (!partRow) throw new Error("Part not found");
    if (Number(partRow.stock ?? 0) <= 0) throw new Error("Out of stock");
    
    const existing = await models.cart_items.findOne({ where: { user_id: context.userId, part_id: data.partId } });
    if (existing) {
      await models.cart_items.update(
        { quantity: existing.quantity + qty },
        { where: { id: existing.id } }
      );
    } else {
      await models.cart_items.create({
        user_id: context.userId,
        part_id: data.partId,
        quantity: qty
      });
    }
    return { ok: true };
  });

const CatalogItemsSchema = z.object({
  items: z.array(z.object({
    part_number: z.string().min(1).max(80),
    part_name: z.string().max(200).optional().nullable(),
    quantity: z.number().int().min(1).max(99).optional(),
    brand: z.string().max(80).optional().nullable(),
  })).min(1).max(50),
});

export const addCatalogPartsToCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => CatalogItemsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    let added = 0;
    const skipped: { part_number: string; reason: string }[] = [];
    for (const it of data.items) {
      const pn = it.part_number.trim();
      if (!pn) continue;
      
      // Try exact match first, then case-insensitive, then normalized (strip spaces/dashes)
      let partRow = await models.parts.findOne({
        where: { part_number: pn },
        attributes: ["id", "stock"]
      });
      if (!partRow) {
        partRow = await models.parts.findOne({
          where: { part_number: { [Op.iLike]: pn } },
          attributes: ["id", "stock"]
        });
      }
      if (!partRow) {
        // Try stripping all non-alphanumeric characters for fuzzy match
        const normalized = pn.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        if (normalized.length >= 4) {
          const { sequelize } = await import("@/lib/db/index.server");
          const [rows] = await sequelize.query(
            `SELECT id, stock FROM parts WHERE UPPER(REGEXP_REPLACE(part_number, '[^a-zA-Z0-9]', '', 'g')) = :normalized LIMIT 1`,
            { replacements: { normalized }, type: "SELECT" as any }
          );
          if (rows && (rows as any).id) {
            partRow = rows as any;
          }
        }
      }
      
      if (!partRow) { skipped.push({ part_number: pn, reason: "not in inventory" }); continue; }
      if (Number(partRow.stock ?? 0) <= 0) { skipped.push({ part_number: pn, reason: "out of stock" }); continue; }
      const partId = partRow.id;
      const qty = Math.max(1, Math.min(99, it.quantity ?? 1));
      
      const existingCart = await models.cart_items.findOne({
        where: { user_id: userId, part_id: partId }
      });
      
      if (existingCart) {
        await models.cart_items.update(
          { quantity: Math.min(99, existingCart.quantity + qty) },
          { where: { id: existingCart.id } }
        );
      } else {
        await models.cart_items.create({ user_id: userId, part_id: partId, quantity: qty });
      }
      added++;
    }
    return { added, skipped };
  });


export const updateCartQty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string; quantity: number }) => d)
  .handler(async ({ data, context }) => {
    const qty = Math.max(1, Math.min(99, data.quantity));
    await models.cart_items.update(
      { quantity: qty },
      { where: { id: data.id, user_id: context.userId } }
    );
    return { ok: true };
  });

export const removeFromCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await models.cart_items.destroy({ where: { id: data.id, user_id: context.userId } });
    return { ok: true };
  });

/* ============= WISHLIST ============= */

export const getMyWishlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { col } = await tierFor(context.userId);
    const items = await models.wishlist_items.findAll({
      where: { user_id: context.userId },
      include: [{
        model: models.parts,
        as: 'part',
        attributes: ["id", "part_number", "name", "price", col, "currency", "images", "manufacturer"]
      }],
      order: [["added_at", "DESC"]]
    });
    
    const plainItems = items.map(i => i.get({ plain: true }));
    return applyTier(plainItems, col);
  });

export const toggleWishlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { partId: string }) => d)
  .handler(async ({ data, context }) => {
    const existing = await models.wishlist_items.findOne({
      where: { user_id: context.userId, part_id: data.partId }
    });
    
    if (existing) {
      await models.wishlist_items.destroy({ where: { id: existing.id } });
      return { added: false };
    }
    await models.wishlist_items.create({ user_id: context.userId, part_id: data.partId });
    return { added: true };
  });

/* ============= COUNTS (for navbar badges) ============= */

export const getMyCartCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const items = await models.cart_items.findAll({
      where: { user_id: context.userId },
      attributes: ["quantity"]
    });
    const count = items.reduce((s, r) => s + Number(r.quantity ?? 0), 0);
    return { count };
  });

export const getMyWishlistCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const count = await models.wishlist_items.count({
      where: { user_id: context.userId }
    });
    return { count };
  });
