import { createServerFn } from "@tanstack/react-start";
import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { z } from "zod";

import { models, sequelize } from "@/lib/db/index.server";
import { Op, col } from "sequelize";

async function hasRole(userId: string, role: string) {
  const r = await models.user_roles.findOne({ where: { user_id: userId, role } });
  return !!r;
}

export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const a = await hasRole(context.userId, "admin");
    const sa = await hasRole(context.userId, "super_admin");
    if (!a && !sa) throw new Error("Forbidden: admin role required");
    return next({ context: { ...context, isAdmin: true, isSuperAdmin: !!sa } });
  });

export const requireAdminOrSalesman = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const [a, s, sa] = await Promise.all([
      hasRole(context.userId, "admin"),
      hasRole(context.userId, "salesman"),
      hasRole(context.userId, "super_admin"),
    ]);
    if (!a && !s && !sa) throw new Error("Forbidden: admin or salesman role required");
    return next({ context: { ...context, isAdmin: !!(a || sa), isSuperAdmin: !!sa, isSalesman: !!s } });
  });

/* ===== Admin overview ===== */

export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const [partsCount, ordersRows, usersCount] = await Promise.all([
      models.parts.count(),
      models.orders.findAll({ attributes: ["status", "total"] }),
      models.profiles.count(),
    ]);
    const ordersAll = ordersRows.map(o => o.get({ plain: true }));
    const revenue = ordersAll.reduce((s, o: any) => s + Number(o.total ?? 0), 0);
    const byStatus: Record<string, number> = {};
    ordersAll.forEach((o: any) => { byStatus[o.status] = (byStatus[o.status] ?? 0) + 1; });
    return {
      parts: partsCount,
      orders: ordersAll.length,
      users: usersCount,
      revenue,
      byStatus,
    };
  });

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const rows = await models.orders.findAll({
      attributes: ["id", "order_number", "status", "total", "currency", "payment_method", "created_at", "user_id"],
      order: [["created_at", "DESC"]],
      limit: 100
    });
    return rows.map(r => r.get({ plain: true }));
  });

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: string; status: string; note?: string }) => d)
  .handler(async ({ data }) => {
    const allowed = ["placed", "confirmed", "packed", "shipped", "delivered", "cancelled"];
    if (!allowed.includes(data.status)) throw new Error("Invalid status");
    await models.orders.update({ status: data.status }, { where: { id: data.id } });
    await models.order_events.create({ order_id: data.id, status: data.status, note: data.note ?? null } as any);
    return { ok: true };
  });

/* ===== Parts CRUD ===== */

const PartSchema = z.object({
  id: z.string().uuid().optional(),
  part_number: z.string().min(1).max(80),
  oem_number: z.string().max(80).optional().nullable(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  price: z.number().min(0),
  ind_price: z.number().min(0).optional().nullable(),
  gar_price: z.number().min(0).optional().nullable(),
  export_price: z.number().min(0).optional().nullable(),
  stock: z.number().int().min(0),
  manufacturer: z.string().max(120).optional().nullable(),
  is_oem: z.boolean().default(true),
  category_id: z.string().uuid().optional().nullable(),
  brand_id: z.string().uuid().optional().nullable(),
  images: z.array(z.string().url()).max(8).default([]),
});

export const adminListParts = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: { page?: number; pageSize?: number; q?: string; brand?: string } = {}) => d)
  .handler(async ({ data }) => {
    const page = Math.max(1, data.page ?? 1);
    const pageSize = Math.min(200, data.pageSize ?? 50);
    const offset = (page - 1) * pageSize;

    const where: any = {};

    if (data.q && data.q.trim()) {
      const s = data.q.trim();
      const escaped = s.replace(/[,()]/g, " ");
      where[Op.or] = [
        { part_number: { [Op.iLike]: `%${escaped}%` } },
        { oem_number: { [Op.iLike]: `%${escaped}%` } },
        { name: { [Op.iLike]: `%${escaped}%` } },
        { manufacturer: { [Op.iLike]: `%${escaped}%` } }
      ];

      const nk = s.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (nk) {
        // Fallback for normalized search locally without rpc
        where[Op.or].push(
          sequelize.where(
            sequelize.fn('upper', sequelize.fn('regexp_replace', sequelize.col('part_number'), '[^a-zA-Z0-9]', '', 'g')),
            { [Op.like]: `%${nk}%` }
          )
        );
      }
    }

    if (data.brand && data.brand.trim()) {
      where.manufacturer = data.brand.trim();
    }

    const { rows, count } = await models.parts.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      limit: pageSize,
      offset,
      attributes: ["id", "part_number", "oem_number", "name", "price", "ind_price", "gar_price", "export_price", "stock", "manufacturer", "is_oem", "category_tag", "category_id", "images"]
    });

    const items = rows.map((r: any) => {
      const p = r.get({ plain: true });
      return {
        ...p,
        category: p.category_tag ?? null,
      };
    });

    return { items, total: count, page, pageSize };
  });

export const adminListPartBrands = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const parts = await models.parts.findAll({
      attributes: ['manufacturer', [sequelize.fn('COUNT', sequelize.col('manufacturer')), 'count']],
      where: { manufacturer: { [Op.not]: null } },
      group: ['manufacturer'],
    });

    const items = parts.map((r: any) => {
      const p = r.get({ plain: true });
      return { brand: p.manufacturer, count: parseInt(p.count || '0', 10) };
    }).sort((a, b) => b.count - a.count);

    const total = items.reduce((s, i) => s + i.count, 0);
    return { items, total };
  });

export const adminUpsertPart = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => PartSchema.parse(d))
  .handler(async ({ data }) => {
    if (data.id) {
      await models.parts.update(data, { where: { id: data.id } });
      return { id: data.id };
    }
    const row = await models.parts.create(data as any);
    return row.get({ plain: true });
  });

export const adminDeletePart = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await models.parts.destroy({ where: { id: data.id } });
    return { ok: true };
  });

/* ===== CSV import (chunked, client-driven) ===== */

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
void hashStr;


const ImportRowSchema = z.object({
  rowIndex: z.number().int().optional(),
  category_tag: z.string().nullable().optional(),
  part_number: z.string().min(1),
  manufacturer: z.string().nullable().optional(),
  oem_number: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  unique_value: z.string().nullable().optional(),
  stock: z.number().int().min(0).default(0),
  rate_price: z.number().min(0).nullable().optional(),
  price: z.number().min(0).default(0),
  ind_price: z.number().min(0).nullable().optional(),
  gar_price: z.number().min(0).nullable().optional(),
  garage_price: z.number().min(0).nullable().optional(),
  export_price: z.number().min(0).nullable().optional(),
});

export const adminCreateImport = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { filename: string; totalRows: number }) => d)
  .handler(async ({ data, context }) => {
    const row = await models.csv_imports.create({
      filename: data.filename,
      storage_path: `client://${data.filename}`,
      status: "processing",
      total_rows: data.totalRows,
      created_by: context.userId,
    });
    return { id: row.id };
  });

export type ImportRowError = {
  rowIndex: number | null;
  part_number: string | null;
  manufacturer: string | null;
  reason: string;
};

export const adminImportPartsBatch = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { importId: string; rows: unknown[] }) => d)
  .handler(async ({ data }) => {
    const errors: ImportRowError[] = [];
    const valid: any[] = [];
    const validMeta: { rowIndex: number | null; part_number: string; manufacturer: string | null }[] = [];

    for (const raw of data.rows) {
      const parsed = ImportRowSchema.safeParse(raw);
      if (!parsed.success) {
        const r = raw as any;
        errors.push({
          rowIndex: typeof r?.rowIndex === "number" ? r.rowIndex : null,
          part_number: r?.part_number ? String(r.part_number) : null,
          manufacturer: r?.manufacturer ? String(r.manufacturer) : null,
          reason: `validation: ${parsed.error.issues[0]?.message ?? "invalid"}`,
        });
        continue;
      }
      const r = parsed.data;
      const name = (r.description?.trim() || r.part_number).slice(0, 200);
      valid.push({
        part_number: r.part_number,
        manufacturer: r.manufacturer || null,
        oem_number: r.oem_number || null,
        name,
        description: r.description || null,
        category_tag: r.category_tag || null,
        price: r.ind_price ?? r.price ?? 0,
        ind_price: r.ind_price ?? null,
        gar_price: r.gar_price ?? r.garage_price ?? null,
        export_price: r.export_price ?? null,
        stock: r.stock,
        is_oem: true,
        images: [],

        unique_value: r.unique_value ?? null,
        specs: {
          rate_price: r.rate_price ?? null,
        },
      });
      validMeta.push({
        rowIndex: r.rowIndex ?? null,
        part_number: r.part_number,
        manufacturer: r.manufacturer || null,
      });
    }

    let inserted = 0;
    let updated = 0;
    let failed = errors.length;

    if (valid.length) {
      // Deduplicate valid records by unique_value to prevent "ON CONFLICT DO UPDATE command cannot affect row a second time"
      // If unique_value is missing, fallback to deduplicating by part_number so we don't crash
      const uniqueValidMap = new Map();
      for (const v of valid) {
        const key = v.unique_value || v.part_number;
        uniqueValidMap.set(key, v);
      }
      const uniqueValid = Array.from(uniqueValidMap.values());

      const existing = await models.parts.findAll({
        attributes: ["unique_value", "part_number"],
        where: { 
          [Op.or]: [
            { unique_value: { [Op.in]: uniqueValid.map(v => v.unique_value).filter(Boolean) } },
            { part_number: { [Op.in]: uniqueValid.filter(v => !v.unique_value).map(v => v.part_number) } }
          ]
        },
      });
      const existingSet = new Set(existing.map((e) => e.unique_value || e.part_number));
      for (const v of uniqueValid) (existingSet.has(v.unique_value || v.part_number) ? updated++ : inserted++);

      try {
        await models.parts.bulkCreate(uniqueValid, {
          updateOnDuplicate: ["manufacturer", "oem_number", "name", "description", "category_tag", "price", "ind_price", "gar_price", "export_price", "stock", "is_oem", "part_number"],
          conflictAttributes: ["unique_value"]
        } as any);
      } catch (error: any) {
        failed += valid.length;
        inserted = 0;
        updated = 0;
        // record per-row db errors so the UI can list them
        for (const m of validMeta) {
          errors.push({
            rowIndex: m.rowIndex,
            part_number: m.part_number,
            manufacturer: m.manufacturer,
            reason: `db-error: ${error.message}`,
          });
        }
      }
    }

    const cur = await models.csv_imports.findByPk(data.importId);
    if (cur) {
      const log = Array.isArray(cur.error_log) ? (cur.error_log as any[]) : [];
      const newLog = [...log, ...errors].slice(0, 1000);
      await cur.update({
        processed_rows: (cur.processed_rows ?? 0) + data.rows.length,
        inserted_rows: (cur.inserted_rows ?? 0) + inserted,
        updated_rows: (cur.updated_rows ?? 0) + updated,
        failed_rows: (cur.failed_rows ?? 0) + failed,
        error_log: newLog,
      });
    }

    return { inserted, updated, failed, errors: errors.slice(0, 100) };
  });


export const adminFinishImport = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { importId: string; status: "completed" | "failed" }) => d)
  .handler(async ({ data }) => {
    await models.csv_imports.update(
      { status: data.status },
      { where: { id: data.importId } }
    );
    return { ok: true };
  });

export const adminListImports = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const data = await models.csv_imports.findAll({
      attributes: ["id", "filename", "status", "total_rows", "processed_rows", "inserted_rows", "updated_rows", "failed_rows", "created_at"],
      order: [["created_at", "DESC"]],
      limit: 20,
    });
    return (data ?? []).map((d: any) => d.get({ plain: true }));
  });

export const adminGetImportErrors = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { importId: string }) => d)
  .handler(async ({ data }) => {
    const row = await models.csv_imports.findByPk(data.importId, {
      attributes: ["filename", "error_log"],
    });
    if (!row) throw new Error("Import not found");
    return { filename: row.filename ?? "import", errors: (Array.isArray(row.error_log) ? row.error_log : []) as ImportRowError[] };
  });




export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [adminRow, superRow] = await Promise.all([
      models.user_roles.findOne({ where: { user_id: context.userId, role: "admin" } }),
      models.user_roles.findOne({ where: { user_id: context.userId, role: "super_admin" } }),
    ]);
    const isSuperAdmin = !!superRow;
    return { isAdmin: !!adminRow || isSuperAdmin, isSuperAdmin };
  });

/* ===== Super Admin Dashboard Metrics ===== */

export const adminDashboardMetrics = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const last30 = new Date(now.getTime() - 30 * 86400_000).toISOString();

    let ordersAll, ordersToday, ordersMonth, ordersLast30, partsStats, profilesAll, recentOrders, recentUsers, topItems;
    try {
      const results = await Promise.all([
        models.orders.findAll({ attributes: ["status", "total", "created_at"] }),
        models.orders.findAll({ attributes: ["total"], where: { created_at: { [Op.gte]: startOfToday } } }),
        models.orders.findAll({ attributes: ["total"], where: { created_at: { [Op.gte]: startOfMonth } } }),
        models.orders.findAll({ attributes: ["id", "total", "created_at"], where: { created_at: { [Op.gte]: last30 } }, include: [{ model: models.order_items, as: 'order_items', attributes: ["part_id", "name", "quantity", "line_total"] }] }),
        Promise.all([
          models.parts.count(),
          models.parts.count({ where: { stock: 0 } }),
          models.parts.count({ where: { stock: { [Op.gt]: 0, [Op.lte]: col('low_stock_threshold') } } })
        ]),
        models.profiles.findAll({ attributes: ["id", "full_name", "customer_type", "created_at"] }),
        models.orders.findAll({ attributes: ["id", "order_number", "status", "total", "currency", "created_at", "user_id", "customer_type"], order: [["created_at", "DESC"]], limit: 10 }),
        models.profiles.findAll({ attributes: ["id", "full_name", "customer_type", "created_at"], order: [["created_at", "DESC"]], limit: 10 })
      ]);
      [ordersAll, ordersToday, ordersMonth, ordersLast30, partsStats, profilesAll, recentOrders, recentUsers] = results;
      topItems = ordersLast30.flatMap((o: any) => o.get({ plain: true }).order_items || []);
    } catch (err) {
      console.error("Dashboard Metrics DB Error:", err);
      throw err;
    }

    const all = ordersAll.map(o => o.get({ plain: true }));
    const totalRevenue = all.reduce((s, o: any) => s + Number(o.total ?? 0), 0);
    const todayRevenue = ordersToday.reduce((s, o: any) => s + Number(o.total ?? 0), 0);
    const monthRevenue = ordersMonth.reduce((s, o: any) => s + Number(o.total ?? 0), 0);

    const byStatus: Record<string, number> = {};
    all.forEach((o: any) => { byStatus[o.status] = (byStatus[o.status] ?? 0) + 1; });

    const [totalParts, outOfStock, lowStock] = partsStats;

    const profiles = profilesAll.map(p => p.get({ plain: true }));
    const ct: Record<string, number> = { IND: 0, GAR: 0, EXP: 0 };
    profiles.forEach((p: any) => { ct[p.customer_type] = (ct[p.customer_type] ?? 0) + 1; });

    const dailyMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400_000);
      dailyMap.set(d.toISOString().slice(0, 10), 0);
    }
    ordersLast30.forEach((o: any) => {
      const k = String(o.created_at).slice(0, 10);
      if (dailyMap.has(k)) dailyMap.set(k, (dailyMap.get(k) ?? 0) + Number(o.total ?? 0));
    });
    const dailySales = Array.from(dailyMap.entries()).map(([date, total]) => ({ date, total }));

    const monthMap = new Map<string, number>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthMap.set(d.toISOString().slice(0, 7), 0);
    }
    all.forEach((o: any) => {
      const k = String(o.created_at).slice(0, 7);
      if (monthMap.has(k)) monthMap.set(k, (monthMap.get(k) ?? 0) + Number(o.total ?? 0));
    });
    const monthlySales = Array.from(monthMap.entries()).map(([month, total]) => ({ month, total }));

    const topMap = new Map<string, { name: string; qty: number; revenue: number }>();
    topItems.forEach((it: any) => {
      const key = it.part_id ?? it.name;
      const cur = topMap.get(key) ?? { name: it.name, qty: 0, revenue: 0 };
      cur.qty += Number(it.quantity ?? 0);
      cur.revenue += Number(it.line_total ?? 0);
      topMap.set(key, cur);
    });
    const topProducts = Array.from(topMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 10);

    return {
      kpis: {
        totalRevenue, todayRevenue, monthRevenue,
        totalOrders: all.length,
        pending: byStatus["placed"] ?? 0,
        processing: (byStatus["confirmed"] ?? 0) + (byStatus["packed"] ?? 0),
        shipped: byStatus["shipped"] ?? 0,
        completed: byStatus["delivered"] ?? 0,
        cancelled: byStatus["cancelled"] ?? 0,
        totalCustomers: profiles.length,
        customersIND: ct.IND ?? 0, customersGAR: ct.GAR ?? 0, customersEXP: ct.EXP ?? 0,
        totalProducts: totalParts, outOfStock, lowStock,
      },
      byStatus, dailySales, monthlySales, topProducts,
      recentOrders: recentOrders.map(o => o.get({ plain: true })),
      recentUsers: recentUsers.map(u => u.get({ plain: true })),
    };
  });

/* ===== Users (admin) ===== */

const CustomerTypeEnum = z.enum(["IND", "GAR", "EXP"]);

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: { search?: string; customerType?: "IND" | "GAR" | "EXP" | "ALL"; status?: "pending" | "active" | "suspended" | "ALL"; page?: number; pageSize?: number } = {}) => d)
  .handler(async ({ data }) => {
    const page = Math.max(1, data.page ?? 1);
    const pageSize = Math.min(100, data.pageSize ?? 25);

    const staffRoles = await models.user_roles.findAll({
      attributes: ["user_id"],
      where: { role: { [Op.in]: ["admin", "super_admin", "salesman"] } }
    });
    const staffIds = Array.from(new Set(staffRoles.map(r => r.user_id)));

    const where: any = {};
    if (staffIds.length) where.id = { [Op.notIn]: staffIds };
    if (data.customerType && data.customerType !== "ALL") where.customer_type = data.customerType;
    if (data.status && data.status !== "ALL") where.status = data.status;
    if (data.search && data.search.trim()) {
      const s = data.search.trim();
      where[Op.or] = [
        { full_name: { [Op.iLike]: `%${s}%` } },
        { phone: { [Op.iLike]: `%${s}%` } },
        { company_name: { [Op.iLike]: `%${s}%` } }
      ];
    }

    const { rows: profilesRow, count } = await models.profiles.findAndCountAll({
      attributes: ["id", "full_name", "phone", "customer_type", "status", "company_name", "created_at"],
      where,
      order: [["created_at", "DESC"]],
      limit: pageSize,
      offset: (page - 1) * pageSize
    });
    const profiles = profilesRow.map(p => p.get({ plain: true }));

    const ids = profiles.map((p) => p.id);

    const emailById = new Map<string, string>();
    if (ids.length) {
      const users = await models.users.findAll({ attributes: ["id", "email"], where: { id: { [Op.in]: ids } } });
      users.forEach(u => { if (u.email) emailById.set(u.id, u.email); });
    }

    const aggById = new Map<string, { orders: number; spend: number }>();
    if (ids.length) {
      const orders = await models.orders.findAll({ attributes: ["user_id", "total"], where: { user_id: { [Op.in]: ids } } });
      for (const o of orders) {
        const cur = aggById.get(o.user_id) ?? { orders: 0, spend: 0 };
        cur.orders += 1;
        cur.spend += Number(o.total ?? 0);
        aggById.set(o.user_id, cur);
      }
    }

    let items = profiles.map((p: any) => {
      const a = aggById.get(p.id) ?? { orders: 0, spend: 0 };
      return {
        id: p.id,
        full_name: p.full_name,
        phone: p.phone,
        customer_type: p.customer_type,
        status: p.status,
        company_name: p.company_name,
        created_at: p.created_at,
        email: emailById.get(p.id) ?? null,
        total_orders: a.orders,
        total_spend: a.spend,
      };
    });

    if (data.search && data.search.trim()) {
      const s = data.search.trim().toLowerCase();
      items = items.filter(
        (u) => u.email?.toLowerCase().includes(s) || u.full_name?.toLowerCase().includes(s) || u.phone?.toLowerCase().includes(s) || u.company_name?.toLowerCase().includes(s),
      );
    }

    return { items, total: count, page, pageSize };
  });

/* ===== Our Team (admins, super admins, salesmen) ===== */

export const adminListTeam = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const rolesRows = await models.user_roles.findAll({
      attributes: ["user_id", "role"],
      where: { role: { [Op.in]: ["admin", "super_admin", "salesman"] } }
    });

    const rolesById = new Map<string, string[]>();
    for (const r of rolesRows) {
      const arr = rolesById.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesById.set(r.user_id, arr);
    }
    const ids = Array.from(rolesById.keys());
    if (!ids.length) return { items: [] as any[] };

    const [profilesRows, salesmenRows, usersRows] = await Promise.all([
      models.profiles.findAll({ attributes: ["id", "full_name", "phone", "status", "created_at"], where: { id: { [Op.in]: ids } } }),
      models.salesmen.findAll({ attributes: ["id", "employee_id", "territory", "status"], where: { id: { [Op.in]: ids } } }),
      models.users.findAll({ attributes: ["id", "email"], where: { id: { [Op.in]: ids } } })
    ]);

    const profById = new Map<string, any>(profilesRows.map(p => [p.id, p.get({ plain: true })]));
    const smById = new Map<string, any>(salesmenRows.map(s => [s.id, s.get({ plain: true })]));
    const emailById = new Map<string, string>(usersRows.filter(u => u.email).map(u => [u.id, u.email as string]));

    const items = ids.map((id) => {
      const p = profById.get(id) ?? {};
      const sm = smById.get(id);
      const r = rolesById.get(id) ?? [];
      return {
        id,
        full_name: p.full_name ?? null,
        phone: p.phone ?? null,
        status: sm?.status ?? p.status ?? null,
        created_at: p.created_at ?? null,
        email: emailById.get(id) ?? null,
        roles: r,
        employee_id: sm?.employee_id ?? null,
        territory: sm?.territory ?? null,
      };
    });
    items.sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
    return { items };
  });


export const adminUpdateUserCustomerType = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { userId: string; customerType: "IND" | "GAR" | "EXP" }) =>
    z.object({ userId: z.string().uuid(), customerType: CustomerTypeEnum }).parse(d),
  )
  .handler(async ({ data }) => {
    await models.profiles.update({ customer_type: data.customerType }, { where: { id: data.userId } });
    return { ok: true };
  });

/* ===== Analytics ===== */

export const adminAnalyticsOverview = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const types = ["IND", "GAR", "EXP"] as const;

    const [profiles, orders] = await Promise.all([
      models.profiles.findAll({ attributes: ["customer_type"] }),
      models.orders.findAll({ attributes: ["customer_type", "total", "created_at"] }),
    ]);

    const usersByType: Record<string, number> = { IND: 0, GAR: 0, EXP: 0 };
    for (const p of profiles) usersByType[(p.customer_type as string) ?? "IND"] = (usersByType[(p.customer_type as string) ?? "IND"] ?? 0) + 1;

    const ordersByType: Record<string, number> = { IND: 0, GAR: 0, EXP: 0 };
    const revenueByType: Record<string, number> = { IND: 0, GAR: 0, EXP: 0 };
    for (const o of orders) {
      const t = (o.customer_type as string) ?? "IND";
      ordersByType[t] = (ordersByType[t] ?? 0) + 1;
      revenueByType[t] = (revenueByType[t] ?? 0) + Number(o.total ?? 0);
    }

    // Monthly orders grouped by tier (last 12 months)
    const months: Record<string, Record<string, number>> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[k] = { IND: 0, GAR: 0, EXP: 0 };
    }
    for (const o of orders) {
      const d = new Date(o.created_at as any);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (months[k]) months[k][(o.customer_type as string) ?? "IND"] = (months[k][(o.customer_type as string) ?? "IND"] ?? 0) + 1;
    }
    const monthly = Object.entries(months).map(([month, vals]) => ({ month, ...vals }));

    return {
      types,
      usersByType,
      ordersByType,
      revenueByType,
      monthly,
    };
  });

export const adminTopCustomersByType = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: { type: "IND" | "GAR" | "EXP"; limit?: number }) => d)
  .handler(async ({ data }) => {
    const limit = Math.min(20, data.limit ?? 10);
    const orders = await models.orders.findAll({
      attributes: ["user_id", "total"],
      where: { customer_type: data.type }
    });

    const agg = new Map<string, { orders: number; spend: number }>();
    for (const o of orders) {
      const cur = agg.get(o.user_id) ?? { orders: 0, spend: 0 };
      cur.orders += 1;
      cur.spend += Number(o.total ?? 0);
      agg.set(o.user_id, cur);
    }
    const sorted = Array.from(agg.entries()).sort((a, b) => b[1].spend - a[1].spend).slice(0, limit);
    const ids = sorted.map(([id]) => id);

    const profiles = await models.profiles.findAll({
      attributes: ["id", "full_name"],
      where: { id: { [Op.in]: ids.length ? ids : ["00000000-0000-0000-0000-000000000000"] } }
    });

    const nameById = new Map(profiles.map((p) => [p.id, p.full_name]));

    const users = await models.users.findAll({
      attributes: ["id", "email"],
      where: { id: { [Op.in]: ids.length ? ids : ["00000000-0000-0000-0000-000000000000"] } }
    });
    const emailById = new Map<string, string>(users.filter(u => u.email).map(u => [u.id, u.email as string]));

    return sorted.map(([id, v]) => ({
      user_id: id,
      full_name: nameById.get(id) ?? "—",
      email: emailById.get(id) ?? null,
      orders: v.orders,
      spend: v.spend,
    }));
  });

export const adminTopPartsByType = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: { type: "IND" | "GAR" | "EXP"; limit?: number }) => d)
  .handler(async ({ data }) => {
    const limit = Math.min(20, data.limit ?? 10);
    const items = await models.order_items.findAll({
      attributes: ["part_id", "part_number", "name", "quantity", "line_total"],
      where: { customer_type: data.type }
    });

    const agg = new Map<string, { part_number: string; name: string; qty: number; revenue: number }>();
    for (const it of items) {
      const key = (it.part_id ?? it.part_number) as string;
      const cur = agg.get(key) ?? { part_number: it.part_number, name: it.name, qty: 0, revenue: 0 };
      cur.qty += Number(it.quantity ?? 0);
      cur.revenue += Number(it.line_total ?? 0);
      agg.set(key, cur);
    }
    return Array.from(agg.values()).sort((a, b) => b.qty - a.qty).slice(0, limit);
  });

function toCsv(rows: Record<string, any>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

export const adminExportAnalyticsCsv = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { report: "overview" | "top-customers" | "top-parts" | "monthly"; type?: "IND" | "GAR" | "EXP" }) => d)
  .handler(async ({ data }) => {
    if (data.report === "overview") {
      const o = await (adminAnalyticsOverview as any)({});
      const rows = (["IND", "GAR", "EXP"] as const).map((t) => ({
        customer_type: t,
        users: o.usersByType[t] ?? 0,
        orders: o.ordersByType[t] ?? 0,
        revenue: o.revenueByType[t] ?? 0,
      }));
      return { filename: "analytics-overview.csv", csv: toCsv(rows) };
    }
    if (data.report === "monthly") {
      const o = await (adminAnalyticsOverview as any)({});
      return { filename: "monthly-orders.csv", csv: toCsv(o.monthly) };
    }
    if (data.report === "top-customers" && data.type) {
      const rows = await (adminTopCustomersByType as any)({ data: { type: data.type, limit: 50 } });
      return { filename: `top-customers-${data.type}.csv`, csv: toCsv(rows) };
    }
    if (data.report === "top-parts" && data.type) {
      const rows = await (adminTopPartsByType as any)({ data: { type: data.type, limit: 50 } });
      return { filename: `top-parts-${data.type}.csv`, csv: toCsv(rows) };
    }
    throw new Error("Unknown report");
  });
