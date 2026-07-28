import { createServerFn } from "@tanstack/react-start";
import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "./admin.functions";
import { z } from "zod";
import { models } from "@/lib/db/index.server";
import { Op } from "@/lib/db/op.server";

async function hasRole(userId: string, role: string) {
  const r = await models.user_roles.findOne({ where: { user_id: userId, role } });
  return !!r;
}

export const requireSalesmanOrAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const [isAdmin, isSales] = await Promise.all([
      hasRole(context.userId, "admin"),
      hasRole(context.userId, "salesman"),
    ]);
    if (!isAdmin && !isSales) throw new Error("Forbidden");
    return next({ context: { ...context, isAdmin, isSalesman: isSales } as any });
  });

/* ============ Admin: salesmen CRUD ============ */

const SalesmanInput = z.object({
  employee_id: z.string().trim().max(40).optional().nullable(),
  full_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().max(40).optional().nullable(),
  photo_url: z.string().url().optional().nullable(),
  territory: z.string().trim().max(120).optional().nullable(),
  joining_date: z.string().optional().nullable(),
});

export const adminListSalesmen = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: { q?: string; status?: "ALL" | "active" | "inactive" } = {}) => d)
  .handler(async ({ data }) => {
    const w: any = {};
    if (data.status && data.status !== "ALL") w.status = data.status;
    if (data.q && data.q.trim()) {
      const s = `%${data.q.trim()}%`;
      w[Op.or] = [
        { full_name: { [Op.iLike]: s } },
        { email: { [Op.iLike]: s } },
        { employee_id: { [Op.iLike]: s } },
        { phone: { [Op.iLike]: s } }
      ];
    }
    
    const salesmenRows = await models.salesmen.findAll({
      where: w,
      order: [["created_at", "DESC"]]
    });
    
    const rows = salesmenRows.map(r => r.get({ plain: true }));
    const ids = rows.map((r: any) => r.id);
    let counts = new Map<string, number>();
    
    if (ids.length) {
      const caRows = await models.customer_assignments.findAll({
        attributes: ["salesman_id"],
        where: { salesman_id: { [Op.in]: ids } }
      });
      for (const r of caRows) {
        const ca = r.get({ plain: true });
        counts.set(ca.salesman_id, (counts.get(ca.salesman_id) ?? 0) + 1);
      }
    }
    return rows.map((r: any) => ({ ...r, assigned_count: counts.get(r.id) ?? 0 }));
  });

export const adminGetSalesman = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sRow = await models.salesmen.findByPk(data.id);
    if (!sRow) throw new Error("Salesman not found");
    const s = sRow.get({ plain: true });

    const assignsRows = await models.customer_assignments.findAll({
      attributes: ["customer_id", "assigned_at", "last_activity_at"],
      where: { salesman_id: data.id }
    });
    const assigns = assignsRows.map(r => r.get({ plain: true }));
    
    const customerIds = assigns.map((a: any) => a.customer_id);
    let customers: any[] = [];
    if (customerIds.length) {
      const profRows = await models.profiles.findAll({
        attributes: ["id", "full_name", "company_name", "customer_type", "status", "created_at"],
        where: { id: { [Op.in]: customerIds } }
      });
      customers = profRows.map(r => {
        const p = r.get({ plain: true });
        const a = assigns.find((x) => x.customer_id === p.id);
        return { ...p, assigned_at: a?.assigned_at, last_activity_at: a?.last_activity_at };
      });
    }

    const [qRows, oRows] = await Promise.all([
      models.quotations.findAll({
        attributes: ["id", "status", "grand_total", "customer_id"],
        where: { salesman_id: data.id }
      }),
      models.orders.findAll({
        attributes: ["id", "status", "total", "user_id"],
        where: { salesman_id: data.id }
      })
    ]);
    
    // salesman_id column may not exist on quotations/orders yet — fall back to assignment-derived stats
    const quotes = qRows.map(r => r.get({ plain: true }));
    const orders = oRows.map(r => r.get({ plain: true }));

    let quotesByCust: any[] = [], ordersByCust: any[] = [];
    if (customerIds.length) {
      const [q2Rows, o2Rows] = await Promise.all([
        models.quotations.findAll({
          attributes: ["id", "status", "grand_total", "customer_id"],
          where: { customer_id: { [Op.in]: customerIds } }
        }),
        models.orders.findAll({
          attributes: ["id", "status", "total", "user_id"],
          where: { user_id: { [Op.in]: customerIds } }
        })
      ]);
      quotesByCust = q2Rows.map(r => r.get({ plain: true }));
      ordersByCust = o2Rows.map(r => r.get({ plain: true }));
    }
    const allQuotes = quotes.length ? quotes : quotesByCust;
    const allOrders = orders.length ? orders : ordersByCust;
    const revenue = allOrders.reduce((s, x: any) => s + Number(x.total ?? 0), 0);
    const approved = allQuotes.filter((x) => x.status === "approved" || x.status === "converted").length;

    return {
      salesman: s,
      customers,
      stats: {
        assignedCustomers: customers.length,
        totalQuotations: allQuotes.length,
        approvedQuotations: approved,
        totalOrders: allOrders.length,
        revenue,
      },
    };
  });

export const adminCreateSalesman = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) =>
    SalesmanInput.extend({ password: z.string().min(8).max(72) }).parse(d),
  )
  .handler(async ({ data, context }: any) => {
    const { password, ...rest } = data;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: rest.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: rest.full_name, role: "salesman" },
    });
    if (createErr) throw new Error(createErr.message);
    const uid = created.user!.id;

    // mark as salesman role
    await models.user_roles.create({ user_id: uid, role: "salesman" });

    try {
      await models.salesmen.create({
        id: uid,
        employee_id: rest.employee_id || null,
        full_name: rest.full_name,
        email: rest.email,
        phone: rest.phone || null,
        photo_url: rest.photo_url || null,
        territory: rest.territory || null,
        joining_date: rest.joining_date || null,
        created_by: context.userId,
      });
    } catch (insErr: any) {
      // best-effort cleanup
      try { await supabaseAdmin.auth.admin.deleteUser(uid); } catch {}
      throw new Error(insErr.message);
    }
    return { id: uid };
  });

export const adminUpdateSalesman = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) =>
    SalesmanInput.partial().extend({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    const update: any = {};
    for (const [k, v] of Object.entries(rest)) if (v !== undefined) update[k] = v;
    await models.salesmen.update(update, { where: { id } });
    return { ok: true };
  });

export const adminSetSalesmanStatus = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: string; status: "active" | "inactive" }) =>
    z.object({ id: z.string().uuid(), status: z.enum(["active", "inactive"]) }).parse(d),
  )
  .handler(async ({ data }) => {
    await models.salesmen.update({ status: data.status }, { where: { id: data.id } });
    return { ok: true };
  });

export const adminResetSalesmanPassword = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: string; password: string }) =>
    z.object({ id: z.string().uuid(), password: z.string().min(8).max(72) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteSalesman = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await models.customer_assignments.destroy({ where: { salesman_id: data.id } });
    await models.salesmen.destroy({ where: { id: data.id } });
    try { await supabaseAdmin.auth.admin.deleteUser(data.id); } catch {}
    return { ok: true };
  });

/* ============ Admin: assignments ============ */

export const adminListAssignments = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: { salesman_id?: string; unassigned?: boolean; q?: string } = {}) => d)
  .handler(async ({ data }) => {
    const salesmenRows = await models.salesmen.findAll({
      attributes: ["id", "full_name", "email", "status"],
      order: [["full_name", "ASC"]]
    });
    const salesmen = salesmenRows.map(r => r.get({ plain: true }));

    const w: any = {
      customer_type: { [Op.in]: ["IND", "GAR", "EXP"] }
    };
    if (data.q?.trim()) {
      const s = `%${data.q.trim()}%`;
      w[Op.or] = [
        { full_name: { [Op.iLike]: s } },
        { company_name: { [Op.iLike]: s } }
      ];
    }
    const profRows = await models.profiles.findAll({
      attributes: ["id", "full_name", "company_name", "customer_type", "status", "created_at"],
      where: w,
      order: [["created_at", "DESC"]],
      limit: 500
    });
    const profiles = profRows.map(r => r.get({ plain: true }));

    const profIds = profiles.map((p: any) => p.id);
    let staffIds = new Set<string>();
    if (profIds.length) {
      const staffRoles = await models.user_roles.findAll({
        attributes: ["user_id"],
        where: {
          user_id: { [Op.in]: profIds },
          role: { [Op.in]: ["admin", "super_admin", "salesman"] }
        }
      });
      staffRoles.forEach(r => staffIds.add(r.user_id));
    }

    const assignsRows = await models.customer_assignments.findAll({
      attributes: ["customer_id", "salesman_id", "assigned_at", "last_activity_at"]
    });
    const byCust = new Map<string, any>();
    for (const row of assignsRows) {
      const a = row.get({ plain: true });
      byCust.set(a.customer_id, a);
    }

    let rows = profiles
      .filter((p: any) => !staffIds.has(p.id))
      .map((p: any) => {
        const a = byCust.get(p.id);
        return { ...p, salesman_id: a?.salesman_id ?? null, assigned_at: a?.assigned_at ?? null };
      });
      
    if (data.salesman_id) rows = rows.filter((r) => r.salesman_id === data.salesman_id);
    if (data.unassigned) rows = rows.filter((r) => !r.salesman_id);
    return { salesmen, customers: rows };
  });


export const adminAssignCustomer = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { customer_id: string; salesman_id: string }) =>
    z.object({ customer_id: z.string().uuid(), salesman_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }: any) => {
    // using findOrCreate / update to simulate upsert
    const [assignment, created] = await models.customer_assignments.findOrCreate({
      where: { customer_id: data.customer_id },
      defaults: {
        salesman_id: data.salesman_id,
        assigned_by: context.userId,
        assigned_at: new Date().toISOString()
      }
    });
    if (!created) {
      await assignment.update({
        salesman_id: data.salesman_id,
        assigned_by: context.userId,
        assigned_at: new Date().toISOString()
      });
    }
    return { ok: true };
  });

export const adminUnassignCustomer = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { customer_id: string }) => z.object({ customer_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await models.customer_assignments.destroy({ where: { customer_id: data.customer_id } });
    return { ok: true };
  });

export const adminBulkAssignCustomers = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { customer_ids: string[]; salesman_id: string }) =>
    z.object({ customer_ids: z.array(z.string().uuid()).min(1).max(500), salesman_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }: any) => {
    const now = new Date().toISOString();
    for (const id of data.customer_ids) {
      const [assignment, created] = await models.customer_assignments.findOrCreate({
        where: { customer_id: id },
        defaults: {
          salesman_id: data.salesman_id,
          assigned_by: context.userId,
          assigned_at: now
        }
      });
      if (!created) {
        await assignment.update({
          salesman_id: data.salesman_id,
          assigned_by: context.userId,
          assigned_at: now
        });
      }
    }
    return { ok: true, count: data.customer_ids.length };
  });

/* ============ Admin: performance / leaderboard ============ */

export const adminSalesmanLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const salesmenRows = await models.salesmen.findAll({
      attributes: ["id", "full_name", "email", "status", "photo_url"]
    });
    const salesmen = salesmenRows.map(r => r.get({ plain: true }));
    
    const assignsRows = await models.customer_assignments.findAll({
      attributes: ["salesman_id", "customer_id"]
    });
    const assigns = assignsRows.map(r => r.get({ plain: true }));

    const bySalesman = new Map<string, { customers: string[] }>();
    for (const a of assigns) {
      const e = bySalesman.get(a.salesman_id) ?? { customers: [] };
      e.customers.push(a.customer_id);
      bySalesman.set(a.salesman_id, e);
    }

    const allCustomerIds = Array.from(new Set(assigns.map((a) => a.customer_id)));
    const [qRes, oRes] = await Promise.all([
      allCustomerIds.length
        ? models.quotations.findAll({
            attributes: ["customer_id", "status", "grand_total"],
            where: { customer_id: { [Op.in]: allCustomerIds } }
          })
        : [],
      allCustomerIds.length
        ? models.orders.findAll({
            attributes: ["user_id", "status", "total"],
            where: { user_id: { [Op.in]: allCustomerIds } }
          })
        : []
    ]);
    
    const quotesByCust = new Map<string, any[]>();
    for (const r of qRes) {
      const q = r.get({ plain: true });
      const arr = quotesByCust.get(q.customer_id) ?? []; arr.push(q); quotesByCust.set(q.customer_id, arr);
    }
    const ordersByCust = new Map<string, any[]>();
    for (const r of oRes) {
      const o = r.get({ plain: true });
      const arr = ordersByCust.get(o.user_id) ?? []; arr.push(o); ordersByCust.set(o.user_id, arr);
    }

    const rows = salesmen.map((s: any) => {
      const cust = bySalesman.get(s.id)?.customers ?? [];
      let totalQuotes = 0, approvedQuotes = 0, totalOrders = 0, revenue = 0;
      for (const cid of cust) {
        for (const q of quotesByCust.get(cid) ?? []) {
          totalQuotes++;
          if (q.status === "approved" || q.status === "converted") approvedQuotes++;
        }
        for (const o of ordersByCust.get(cid) ?? []) {
          totalOrders++;
          revenue += Number(o.total ?? 0);
        }
      }
      const conversionRate = totalQuotes ? Math.round((approvedQuotes / totalQuotes) * 1000) / 10 : 0;
      return {
        id: s.id,
        full_name: s.full_name,
        email: s.email,
        status: s.status,
        photo_url: s.photo_url,
        assignedCustomers: cust.length,
        totalQuotes, approvedQuotes, totalOrders, revenue, conversionRate,
      };
    });
    rows.sort((a, b) => b.revenue - a.revenue);
    return rows;
  });

/* ============ Salesman-scoped ============ */

async function getMyCustomerIds(userId: string): Promise<string[]> {
  const rows = await models.customer_assignments.findAll({
    attributes: ["customer_id"],
    where: { salesman_id: userId }
  });
  return rows.map((x: any) => x.get({ plain: true }).customer_id);
}

export const salesmanMyCustomers = createServerFn({ method: "GET" })
  .middleware([requireSalesmanOrAdmin])
  .validator((d: { q?: string } = {}) => d)
  .handler(async ({ data, context }: any) => {
    const ids = await getMyCustomerIds(context.userId);
    if (!ids.length) return [];
    
    const w: any = { id: { [Op.in]: ids } };
    if (data.q?.trim()) {
      const s = `%${data.q.trim()}%`;
      w[Op.or] = [
        { full_name: { [Op.iLike]: s } },
        { company_name: { [Op.iLike]: s } }
      ];
    }
    
    const rows = await models.profiles.findAll({
      attributes: ["id", "full_name", "company_name", "customer_type", "status", "created_at", "phone"],
      where: w,
      order: [["created_at", "DESC"]]
    });
    return rows.map(r => r.get({ plain: true }));
  });

export const salesmanMyQuotations = createServerFn({ method: "GET" })
  .middleware([requireSalesmanOrAdmin])
  .handler(async ({ context }: any) => {
    const ids = await getMyCustomerIds(context.userId);
    if (!ids.length) return [];
    
    const rows = await models.quotations.findAll({
      attributes: ["id", "quotation_number", "status", "grand_total", "currency", "customer_id", "customer_snapshot", "created_at", "share_token"],
      where: { customer_id: { [Op.in]: ids } },
      order: [["created_at", "DESC"]],
      limit: 200
    });
    return rows.map(r => r.get({ plain: true }));
  });

export const salesmanMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSalesmanOrAdmin])
  .handler(async ({ context }: any) => {
    const ids = await getMyCustomerIds(context.userId);
    if (!ids.length) return [];
    
    const rows = await models.orders.findAll({
      attributes: ["id", "order_number", "status", "total", "currency", "payment_status", "user_id", "created_at"],
      where: { user_id: { [Op.in]: ids } },
      order: [["created_at", "DESC"]],
      limit: 200
    });
    return rows.map(r => r.get({ plain: true }));
  });

export const salesmanDashboard = createServerFn({ method: "GET" })
  .middleware([requireSalesmanOrAdmin])
  .handler(async ({ context }: any) => {
    const ids = await getMyCustomerIds(context.userId);
    if (!ids.length) {
      return { customers: 0, quotations: 0, approvedQuotations: 0, orders: 0, revenue: 0, activeCarts: 0 };
    }
    
    const [qRows, oRows, cRows] = await Promise.all([
      models.quotations.findAll({
        attributes: ["status", "grand_total"],
        where: { customer_id: { [Op.in]: ids } }
      }),
      models.orders.findAll({
        attributes: ["status", "total"],
        where: { user_id: { [Op.in]: ids } }
      }),
      models.cart_items.findAll({
        attributes: ["user_id"],
        where: { user_id: { [Op.in]: ids } }
      })
    ]);
    
    const quotes = qRows.map(r => r.get({ plain: true }));
    const orders = oRows.map(r => r.get({ plain: true }));
    const cartUsers = new Set(cRows.map(x => x.get({ plain: true }).user_id));
    
    return {
      customers: ids.length,
      quotations: quotes.length,
      approvedQuotations: quotes.filter((x: any) => x.status === "approved" || x.status === "converted").length,
      orders: orders.length,
      revenue: orders.reduce((s, x: any) => s + Number(x.total ?? 0), 0),
      activeCarts: cartUsers.size,
    };
  });

export const salesmanAssignedCarts = createServerFn({ method: "GET" })
  .middleware([requireSalesmanOrAdmin])
  .handler(async ({ context }: any) => {
    const ids = await getMyCustomerIds(context.userId);
    if (!ids.length) return [];
    
    const itemsRows = await models.cart_items.findAll({
      attributes: ["id", "user_id", "part_id", "quantity", "added_at"],
      where: { user_id: { [Op.in]: ids } },
      order: [["added_at", "DESC"]]
    });
    const rows = itemsRows.map(r => r.get({ plain: true }));
    if (!rows.length) return [];

    const partIds = Array.from(new Set(rows.map((r) => r.part_id)));
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    
    const [partsRows, profilesRows] = await Promise.all([
      models.parts.findAll({
        attributes: ["id", "name", "part_number", "oem_number", "price", "images", "brand_id", "manufacturer"],
        where: { id: { [Op.in]: partIds } }
      }),
      models.profiles.findAll({
        attributes: ["id", "full_name", "company_name", "phone"],
        where: { id: { [Op.in]: userIds } }
      })
    ]);
    
    const partMap = new Map<string, any>(partsRows.map((p: any) => {
      const pl = p.get({ plain: true });
      return [pl.id, {
        ...pl,
        image_url: Array.isArray(pl.images) && pl.images.length ? pl.images[0] : null,
      }];
    }));
    const profMap = new Map<string, any>(profilesRows.map((p: any) => [p.id, p.get({ plain: true })]));

    const byCustomer = new Map<string, any>();
    for (const it of rows) {
      const part = partMap.get(it.part_id) ?? {};
      const lineTotal = Number(part.price ?? 0) * Number(it.quantity ?? 0);
      const cur = byCustomer.get(it.user_id) ?? {
        customer_id: it.user_id,
        customer: profMap.get(it.user_id) ?? null,
        item_count: 0,
        total_value: 0,
        last_updated: it.added_at,
        items: [] as any[],
      };
      cur.item_count += Number(it.quantity ?? 0);
      cur.total_value += lineTotal;
      if (new Date(it.added_at) > new Date(cur.last_updated)) cur.last_updated = it.added_at;
      cur.items.push({
        id: it.id,
        quantity: it.quantity,
        added_at: it.added_at,
        part_id: it.part_id,
        part_name: part.name ?? "Unknown part",
        part_number: part.part_number ?? "",
        price: Number(part.price ?? 0),
        image_url: part.image_url ?? null,
        line_total: lineTotal,
      });
      byCustomer.set(it.user_id, cur);
    }
    return Array.from(byCustomer.values()).sort(
      (a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime(),
    );
  });

export const getMyRoleInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const [a, sup, sm] = await Promise.all([
        hasRole(context.userId, "admin"),
        hasRole(context.userId, "super_admin"),
        hasRole(context.userId, "salesman"),
      ]);
      return {
        isAdmin: a || sup,
        isSuperAdmin: sup,
        isSalesman: sm,
      };
    } catch (e: any) {
      require("fs").writeFileSync("error.log", e.stack || e.message);
      throw e;
    }
  });

export const salesmanMyLiveActivity = createServerFn({ method: "GET" })
  .middleware([requireSalesmanOrAdmin])
  .handler(async ({ context }: any) => {
    const rows = await models.admin_notifications.findAll({
      attributes: ["id", "type", "title", "body", "entity_type", "entity_id", "metadata", "created_at"],
      where: { salesman_id: context.userId },
      order: [["created_at", "DESC"]],
      limit: 30
    });
    const data = rows.map(r => r.get({ plain: true }));
    if (!data?.length) return [];
    
    const customerIds = Array.from(new Set(data.map((n: any) => n.metadata?.customer_id).filter(Boolean)));
    let namesById = new Map<string, string>();
    if (customerIds.length) {
      const profsRows = await models.profiles.findAll({
        attributes: ["id", "full_name", "company_name"],
        where: { id: { [Op.in]: customerIds } }
      });
      for (const p of profsRows) {
        const pl = p.get({ plain: true });
        namesById.set(pl.id, pl.company_name || pl.full_name || "Customer");
      }
    }
    return data.map((n: any) => ({
      ...n,
      customer_name: n.metadata?.customer_id ? namesById.get(n.metadata.customer_id) ?? null : null,
    }));
  });

/* ============ Salesman: customer detail + search ============ */

export const salesmanGetCustomer = createServerFn({ method: "GET" })
  .middleware([requireSalesmanOrAdmin])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }: any) => {
    if (!context.isAdmin) {
      const ids = await getMyCustomerIds(context.userId);
      if (!ids.includes(data.id)) throw new Error("Forbidden");
    }
    const profileRow = await models.profiles.findByPk(data.id, {
      attributes: ["id", "full_name", "phone", "company_name", "customer_type", "status", "created_at", "trade_license", "vat_number", "credit_limit", "admin_notes"]
    });
    if (!profileRow) throw new Error("Customer not found");
    return profileRow.get({ plain: true });
  });

export const salesmanCustomerActivity = createServerFn({ method: "GET" })
  .middleware([requireSalesmanOrAdmin])
  .validator((d: { customer_id: string; limit?: number }) =>
    z.object({ customer_id: z.string().uuid(), limit: z.number().int().min(1).max(500).optional() }).parse(d))
  .handler(async ({ data, context }: any) => {
    if (!context.isAdmin) {
      const ids = await getMyCustomerIds(context.userId);
      if (!ids.includes(data.customer_id)) throw new Error("Forbidden");
    }
    const rows = await models.customer_activities.findAll({
      attributes: ["id", "activity_type", "entity_type", "entity_id", "metadata", "actor_id", "created_at"],
      where: { customer_id: data.customer_id },
      order: [["created_at", "DESC"]],
      limit: data.limit ?? 100
    });
    return rows.map(r => r.get({ plain: true }));
  });

export const salesmanSearchCustomersForQuotation = createServerFn({ method: "GET" })
  .middleware([requireSalesmanOrAdmin])
  .validator((d: { q: string }) => z.object({ q: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }: any) => {
    const s = `%${data.q.trim()}%`;
    const w: any = {
      [Op.or]: [
        { full_name: { [Op.iLike]: s } },
        { phone: { [Op.iLike]: s } },
        { company_name: { [Op.iLike]: s } }
      ]
    };
    
    if (!context.isAdmin) {
      const ids = await getMyCustomerIds(context.userId);
      if (!ids.length) return [];
      w.id = { [Op.in]: ids };
    }
    
    const rows = await models.profiles.findAll({
      attributes: ["id", "full_name", "phone", "company_name", "customer_type"],
      where: w,
      limit: 20
    });
    return rows.map(r => r.get({ plain: true }));
  });
