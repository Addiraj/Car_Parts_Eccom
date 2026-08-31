import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { CustomerType } from "@/lib/pricing";
import { z } from "zod";

import { models } from "@/lib/db/index.server";
import { Op } from "@/lib/db/op.server";
import { sequelize } from "@/lib/db/index.server";

/**
 * Ensures the authenticated user exists in the local `users` table.
 * Prevents foreign key constraint errors on wishlist_items / cart_items.
 */
async function ensureUserExists(userId: string, email?: string | null) {
  try {
    const existing = await models.users.findByPk(userId);
    if (!existing) {
      console.log(`[ensureUserExists] User ${userId} not found, creating...`);
      await models.users.findOrCreate({
        where: { id: userId },
        defaults: {
          id: userId,
          email: email || `auto_${userId.slice(0, 8)}@local.dev`,
        }
      });
      console.log(`[ensureUserExists] User ${userId} created successfully.`);
    }
  } catch (err: any) {
    // If email already exists with different id, try without email
    if (err?.original?.constraint === 'users_email_key' || err?.name === 'SequelizeUniqueConstraintError') {
      try {
        console.log(`[ensureUserExists] Email conflict, creating without email...`);
        await models.users.findOrCreate({
          where: { id: userId },
          defaults: { id: userId }
        });
        console.log(`[ensureUserExists] User ${userId} created (no email).`);
      } catch (err2) {
        console.error("[ensureUserExists] Second attempt failed:", err2);
      }
    } else {
      console.error("[ensureUserExists] Failed:", err);
    }
  }
}

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
    await ensureUserExists(context.userId, context.claims?.email);
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

import { lookupPartsByNumbers } from "@/lib/inventory.functions";

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
      
      let partId: string | null = null;
      let rpcStock = 0;
      let rpcPrice = 0;
      let availEntry: any = null;

      // 1. Try lookupPartsByNumbers RPC first (matches catalog UI availability check)
      try {
        const availMap = await lookupPartsByNumbers({ data: { part_numbers: [pn] } });
        const normKey = pn.toUpperCase().replace(/[^A-Z0-9]/g, "");
        availEntry = availMap[normKey] || availMap[pn];
        if (availEntry && availEntry.id) {
          partId = availEntry.id;
          rpcStock = Number(availEntry.stock ?? 0);
          rpcPrice = Math.max(
            Number(availEntry.price ?? 0),
            Number(availEntry.ind_price ?? 0),
            Number(availEntry.gar_price ?? 0),
            Number(availEntry.export_price ?? 0)
          );
        }
      } catch (e) {
        console.error("lookupPartsByNumbers error in addCatalogPartsToCart:", e);
      }

      let validPart: any = null;

      // 1. If partId returned from RPC, verify it exists in models.parts table
      if (partId) {
        validPart = await models.parts.findOne({
          where: { id: partId },
          attributes: ["id", "stock", "price", "ind_price", "gar_price", "export_price"],
        });
      }

      // 2. Fallback: exact/iLike match on part_number or oem_number
      if (!validPart) {
        const searchPns = [pn];
        if (availEntry && availEntry.part_number) searchPns.push(availEntry.part_number);
        if (availEntry && availEntry.oem_number) searchPns.push(availEntry.oem_number);
        
        validPart = await models.parts.findOne({
          where: {
            [Op.or]: [
              { part_number: { [Op.in]: searchPns } },
              { oem_number: { [Op.in]: searchPns } },
              { part_number: { [Op.iLike]: pn } },
              { oem_number: { [Op.iLike]: pn } },
            ],
          },
          attributes: ["id", "stock", "price", "ind_price", "gar_price", "export_price"],
        });
      }

      // 3. Fallback: normalized SQL regex search on part_number or oem_number
      if (!validPart) {
        const normalized = pn.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        if (normalized.length >= 3) {
          const { sequelize } = await import("@/lib/db/index.server");
          const [rows] = await sequelize.query(
            `SELECT id, stock, price, ind_price, gar_price, export_price FROM parts 
             WHERE UPPER(REGEXP_REPLACE(part_number, '[^a-zA-Z0-9]', '', 'g')) = :normalized 
                OR UPPER(REGEXP_REPLACE(oem_number, '[^a-zA-Z0-9]', '', 'g')) = :normalized 
             LIMIT 1`,
            { replacements: { normalized }, type: "SELECT" as any }
          );
          if (Array.isArray(rows) && rows.length > 0 && (rows[0] as any)?.id) {
            validPart = await models.parts.findOne({
              where: { id: (rows[0] as any).id },
              attributes: ["id", "stock", "price", "ind_price", "gar_price", "export_price"],
            });
          }
        }
      }
      
      // 4. Auto-import from Supabase if not found locally but exists in catalog
      if (!validPart && availEntry && availEntry.id) {
        try {
          validPart = await models.parts.create({
            id: availEntry.id,
            part_number: availEntry.part_number || pn,
            oem_number: availEntry.oem_number || null,
            name: it.part_name || "Catalog Part",
            description: "Auto-imported from catalog",
            price: Number(availEntry.price ?? 0),
            ind_price: Number(availEntry.ind_price ?? 0) || null,
            gar_price: Number(availEntry.gar_price ?? 0) || null,
            export_price: Number(availEntry.export_price ?? 0) || null,
            stock: Number(availEntry.stock ?? 0),
            currency: 'AED',
            manufacturer: it.brand || null,
            is_oem: true,
          });
        } catch (e) {
          console.error("Failed to auto-import part to local DB:", e);
        }
      }
      
      if (!validPart) { skipped.push({ part_number: pn, reason: "not in inventory" }); continue; }

      const realPartId = validPart.id;
      
      // Calculate total stock from parts.stock, rpcStock, and stock_levels
      let totalStock = Math.max(Number(validPart.stock ?? 0), rpcStock);
      if (totalStock <= 0) {
        try {
          const stockSum = await models.stock_levels.sum("quantity", { where: { part_id: realPartId } });
          totalStock = Number(stockSum ?? 0);
        } catch {}
      }

      // If part exists in inventory and has stock or valid catalog price, permit adding to cart
      const validPartPrice = Math.max(
        Number(validPart.price ?? 0),
        Number(validPart.ind_price ?? 0),
        Number(validPart.gar_price ?? 0),
        Number(validPart.export_price ?? 0)
      );
      const hasPrice = validPartPrice > 0 || rpcPrice > 0 || rpcStock > 0;
      if (totalStock <= 0 && !hasPrice) {
        skipped.push({ part_number: pn, reason: "out of stock" });
        continue;
      }

      const qty = Math.max(1, Math.min(99, it.quantity ?? 1));
      
      const existingCart = await models.cart_items.findOne({
        where: { user_id: userId, part_id: realPartId }
      });
      
      if (existingCart) {
        await models.cart_items.update(
          { quantity: Math.min(99, existingCart.quantity + qty) },
          { where: { id: existingCart.id } }
        );
      } else {
        await models.cart_items.create({ user_id: userId, part_id: realPartId, quantity: qty });
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

export const getMyWishlistIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const items = await models.wishlist_items.findAll({
      where: { user_id: context.userId },
      attributes: ["part_id"]
    });
    return items.map(i => i.part_id);
  });

export const getMyWishlistPns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const items = await models.wishlist_items.findAll({
      where: { user_id: context.userId },
      include: [{
        model: models.parts,
        as: 'part',
        attributes: ["id", "part_number"]
      }]
    });
    return items.map(i => (i as any).part?.part_number).filter(Boolean) as string[];
  });

export const getMyWishlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { col } = await tierFor(context.userId);
    const items = await models.wishlist_items.findAll({
      where: { user_id: context.userId },
      include: [{
        model: models.parts,
        as: 'part',
        attributes: ["id", "part_number", "name", "price", col, "currency", "images", "manufacturer", "stock", "category_tag"],
        include: [{
          model: models.alternative_parts,
          as: 'part_alternative_parts',
          include: [{
            model: models.parts,
            as: 'alternative_part',
            attributes: ["id", "part_number", "name", "price", col, "currency", "images", "manufacturer", "stock", "category_tag"]
          }]
        }]
      }],
      order: [["added_at", "DESC"]]
    });
    
    const plainItems = items.map(i => i.get({ plain: true }));
    
    const partNumbers = Array.from(new Set(plainItems.map(i => i.part?.part_number).filter(Boolean)));
    
    const orConditions = partNumbers.map(pn => {
      const stripped = pn.replace(/[^a-zA-Z0-9]/g, "");
      const base = stripped.replace(/[A-Za-z]+$/, "");
      if (base.length < 4) return null;
      const regex = base.split("").join("[^a-zA-Z0-9]*");
      return { part_number: { [Op.iRegexp]: regex } };
    }).filter(Boolean);

    const allImplicitAlts = orConditions.length > 0
      ? await models.parts.findAll({
          where: { [Op.or]: orConditions },
          attributes: ["id", "part_number", "name", "price", "ind_price", "gar_price", "export_price", "currency", "images", "manufacturer", "stock", "category_tag"],
          raw: true
        })
      : [];

    const getBase = (pn: string) => pn.replace(/[^a-zA-Z0-9]/g, "").replace(/[A-Za-z]+$/, "");

    // Apply tier logic to main part and alternative parts
    for (const r of plainItems) {
      if (r.part) {
        r.part.price = Number((r.part as any)[col] ?? r.part.price ?? 0);
        
        const base = getBase(r.part.part_number);
        const implicitAlts = allImplicitAlts.filter((ap: any) => {
          if (ap.id === r.part.id) return false;
          return getBase(ap.part_number) === base;
        });
        
        const mergedAlternatives = [
          ...(r.part.part_alternative_parts || []),
          ...implicitAlts.map((ap: any) => ({
             id: `implicit-${ap.id}`,
             alternative_part: ap
          }))
        ];

        const seen = new Set();
        const uniqueAlternatives = [];
        for (const alt of mergedAlternatives) {
          if (alt.alternative_part && !seen.has(alt.alternative_part.id)) {
            seen.add(alt.alternative_part.id);
            uniqueAlternatives.push(alt);
          }
        }
        r.part.part_alternative_parts = uniqueAlternatives;

        if (r.part.part_alternative_parts) {
          for (const ap of r.part.part_alternative_parts) {
            if (ap.alternative_part) {
              ap.alternative_part.price = Number((ap.alternative_part as any)[col] ?? ap.alternative_part.price ?? 0);
            }
          }
        }
      }
    }
    
    return plainItems;
  });

export const toggleWishlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { partId?: string; partNumber?: string; name?: string; manufacturer?: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureUserExists(context.userId, context.claims?.email);
    let part: any = null;

    if (data.partId) {
      part = await models.parts.findByPk(data.partId);
    }

    if (!part && data.partNumber) {
      part = await models.parts.findOne({ where: { part_number: data.partNumber } });
    }

    if (!part && data.partNumber) {
      part = await models.parts.create({
        part_number: data.partNumber,
        name: data.name || data.partNumber,
        manufacturer: data.manufacturer || 'GLOBAL',
        stock: 0,
        price: 0,
      });
    }

    if (!part) {
      throw new Error("Missing or invalid part identifier");
    }

    const finalPartId = part.id;

    const existing = await models.wishlist_items.findOne({
      where: { user_id: context.userId, part_id: finalPartId }
    });
    
    if (existing) {
      await models.wishlist_items.destroy({ where: { id: existing.id } });
      return { added: false, partId: finalPartId, partNumber: part.part_number };
    }
    await models.wishlist_items.create({ user_id: context.userId, part_id: finalPartId });
    return { added: true, partId: finalPartId, partNumber: part.part_number };
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

export const requestPartSalesman = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { partNumber: string; name?: string }) => d)
  .handler(async ({ data, context }) => {
    const assign = await models.customer_assignments.findOne({ where: { customer_id: context.userId } });
    const salesmanId = assign?.salesman_id ?? null;

    await models.admin_notifications.create({
      type: "lead",
      title: `Part Contact Request: ${data.partNumber}`,
      body: `Customer requested contact for part ${data.partNumber}${data.name ? ` (${data.name})` : ""}`,
      entity_type: "part_contact",
      entity_id: data.partNumber,
      salesman_id: salesmanId,
      metadata: { part_number: data.partNumber, name: data.name, customer_id: context.userId },
    });

    return { ok: true };
  });
