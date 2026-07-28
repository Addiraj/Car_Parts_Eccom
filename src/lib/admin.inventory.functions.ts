import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { models } from "@/lib/db/index.server";
import { Op } from "@/lib/db/op.server";
import { col } from "sequelize";

const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const roles = await models.user_roles.findAll({
      where: {
        user_id: context.userId,
        role: "admin"
      }
    });
    if (roles.length === 0) throw new Error("Forbidden: admin role required");
    return next({ context });
  });

async function audit(action: string, entity_type: string, entity_id: string | null, before: any, after: any, actor_id: string) {
  try {
    const u = await models.users.findByPk(actor_id);
    await models.audit_logs.create({
      actor_id, actor_email: u?.email ?? null,
      action, entity_type, entity_id, before, after,
    } as any);
  } catch { /* no-op */ }
}

/* ============================ WAREHOUSES ============================ */
const WarehouseSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1).max(40).regex(/^[A-Z0-9_-]+$/, "uppercase letters, numbers, _ or -"),
  name: z.string().min(1).max(120),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(80).nullable().optional(),
  country: z.string().max(80).nullable().optional(),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export const adminListWarehouses = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const rows = await models.warehouses.findAll({
      order: [["is_default", "DESC"], ["name", "ASC"]]
    });
    return rows.map(r => r.get({ plain: true }));
  });

export const adminUpsertWarehouse = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => WarehouseSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (data.is_default) {
      await models.warehouses.update(
        { is_default: false },
        { where: { id: { [Op.ne]: data.id ?? "00000000-0000-0000-0000-000000000000" } } }
      );
    }
    
    let row;
    if (data.id) {
      await models.warehouses.update(data, { where: { id: data.id } });
      row = await models.warehouses.findByPk(data.id);
    } else {
      row = await models.warehouses.create(data as any);
    }
    
    const plain = row!.get({ plain: true });
    await audit(data.id ? "warehouse.update" : "warehouse.create", "warehouse", plain.id, null, plain, context.userId);
    return plain;
  });

export const adminDeleteWarehouse = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await models.warehouses.destroy({ where: { id: data.id } });
    await audit("warehouse.delete", "warehouse", data.id, null, null, context.userId);
    return { ok: true };
  });

/* ============================ STOCK LEVELS ============================ */
export const adminListInventory = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({
    warehouse_id: z.string().uuid().optional(),
    filter: z.enum(["all","low","out"]).default("all"),
    q: z.string().optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(200).default(50),
  }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const from = (data.page - 1) * data.pageSize;
    
    const where: any = {};
    if (data.q) {
      const q = data.q;
      where[Op.or] = [
        { part_number: { [Op.iLike]: `%${q}%` } },
        { name: { [Op.iLike]: `%${q}%` } },
        { oem_number: { [Op.iLike]: `%${q}%` } }
      ];
    }
    
    const { rows: partsRows, count } = await models.parts.findAndCountAll({
      attributes: ["id", "part_number", "name", "manufacturer", "stock", "low_stock_threshold", "price"],
      where,
      order: [["stock", "ASC"]],
      limit: data.pageSize,
      offset: from
    });
    
    const parts = partsRows.map(p => p.get({ plain: true }));
    let levels: any[] = [];
    
    if (data.warehouse_id && parts.length) {
      const ids = parts.map(p => p.id);
      const lv = await models.stock_levels.findAll({
        attributes: ["part_id", "warehouse_id", "quantity", "reorder_point", "bin_location"],
        where: { warehouse_id: data.warehouse_id, part_id: { [Op.in]: ids } }
      });
      levels = lv.map(l => l.get({ plain: true }));
    }
    
    const levelMap = new Map(levels.map(l => [l.part_id, l]));
    const rows = parts.map(p => {
      const lv = levelMap.get(p.id);
      const qty = lv?.quantity ?? p.stock ?? 0;
      const rp = lv?.reorder_point ?? p.low_stock_threshold ?? 5;
      return { ...p, wh_quantity: lv?.quantity ?? null, reorder_point: rp, bin_location: lv?.bin_location ?? null, status: qty <= 0 ? "out" : qty <= rp ? "low" : "ok" };
    });
    
    const filtered = data.filter === "all" ? rows : rows.filter(r => r.status === data.filter);
    return { items: filtered, total: count, page: data.page, pageSize: data.pageSize };
  });

export const adminSetStockLevel = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({
    part_id: z.string().uuid(),
    warehouse_id: z.string().uuid(),
    quantity: z.number().int().min(0),
    reorder_point: z.number().int().min(0).default(0),
    bin_location: z.string().max(40).nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    let existingRow = await models.stock_levels.findOne({
      where: { part_id: data.part_id, warehouse_id: data.warehouse_id }
    });
    const existing = existingRow?.get({ plain: true });
    
    let row;
    if (existing) {
      await existingRow!.update(data);
      row = existingRow!;
    } else {
      row = await models.stock_levels.create(data as any);
    }
    
    const plain = row.get({ plain: true });
    await audit("stock.set_level", "stock_level", plain.id, existing, plain, context.userId);
    return plain;
  });

/* ============================ MOVEMENTS ============================ */
const MovementSchema = z.object({
  part_id: z.string().uuid(),
  warehouse_id: z.string().uuid(),
  to_warehouse_id: z.string().uuid().nullable().optional(),
  movement_type: z.enum(["IN","OUT","ADJUST","TRANSFER","SALE","RETURN"]),
  quantity: z.number().int(),
  reference: z.string().max(120).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

export const adminRecordMovement = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => MovementSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (data.movement_type === "TRANSFER" && !data.to_warehouse_id) {
      throw new Error("Transfer requires a destination warehouse");
    }
    if (data.quantity <= 0) throw new Error("Quantity must be positive");

    const applyDelta = async (warehouse_id: string, delta: number) => {
      let lv = await models.stock_levels.findOne({
        where: { part_id: data.part_id, warehouse_id }
      });
      const current = lv ? Number(lv.quantity ?? 0) : 0;
      const next = Math.max(0, current + delta);
      
      if (lv) {
        await lv.update({ quantity: next });
      } else {
        await models.stock_levels.create({
          part_id: data.part_id, warehouse_id, quantity: next,
          reorder_point: 0, bin_location: null
        } as any);
      }
      return next;
    };

    let delta = 0;
    switch (data.movement_type) {
      case "IN": case "RETURN": delta = data.quantity; break;
      case "OUT": case "SALE": delta = -data.quantity; break;
      case "ADJUST": delta = data.quantity; break;
      case "TRANSFER":
        await applyDelta(data.warehouse_id, -data.quantity);
        await applyDelta(data.to_warehouse_id!, data.quantity);
        break;
    }
    if (data.movement_type !== "TRANSFER") {
      await applyDelta(data.warehouse_id, delta);
    }

    // sync legacy parts.stock = sum across warehouses
    const sums = await models.stock_levels.findAll({
      attributes: ["quantity"], where: { part_id: data.part_id }
    });
    const total = sums.reduce((s, r) => s + Number(r.quantity ?? 0), 0);
    await models.parts.update({ stock: total }, { where: { id: data.part_id } });

    const row = await models.stock_movements.create({
      ...data, created_by: context.userId,
    } as any);
    const plain = row.get({ plain: true });
    
    await audit(`stock.${data.movement_type.toLowerCase()}`, "stock_movement", plain.id, null, plain, context.userId);
    return plain;
  });

export const adminListMovements = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({
    part_id: z.string().uuid().optional(),
    warehouse_id: z.string().uuid().optional(),
    movement_type: z.enum(["IN","OUT","ADJUST","TRANSFER","SALE","RETURN"]).optional(),
    limit: z.number().int().min(1).max(500).default(100),
  }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const where: any = {};
    if (data.part_id) where.part_id = data.part_id;
    if (data.warehouse_id) where.warehouse_id = data.warehouse_id;
    if (data.movement_type) where.movement_type = data.movement_type;
    
    const rows = await models.stock_movements.findAll({
      where,
      include: [
        { model: models.parts, as: "part", attributes: ["part_number", "name"] },
        { model: models.warehouses, as: "warehouse", attributes: ["code", "name"] },
        { model: models.warehouses, as: "to_warehouse", attributes: ["code", "name"] }
      ],
      order: [["created_at", "DESC"]],
      limit: data.limit
    });
    
    return rows.map(r => {
      const p = r.get({ plain: true });
      return {
        ...p,
        parts: p.part,
        warehouses: p.warehouse,
        to_wh: p.to_warehouse
      };
    });
  });

export const adminInventoryStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const parts = await models.parts.findAll({ attributes: ["stock", "low_stock_threshold", "price"] });
    let totalSkus = parts.length;
    let low = 0;
    let out = 0;
    let totalValue = 0;
    for (const p of parts) {
      const stock = Number(p.stock ?? 0);
      const rp = Number(p.low_stock_threshold ?? 5);
      const price = Number(p.price ?? 0);
      totalValue += stock * price;
      if (stock <= 0) out++;
      else if (stock <= rp) low++;
    }

    const warehouseCount = await models.warehouses.count();
    
    const startOfToday = new Date(new Date().setHours(0,0,0,0));
    const movementsToday = await models.stock_movements.count({
      where: { created_at: { [Op.gte]: startOfToday } }
    });
    
    return { totalSkus, low, out, totalValue, warehouseCount, movementsToday };
  });
