import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { models } from "@/lib/db/index.server";
import { Op } from "@/lib/db/op.server";
import { z } from "zod";

const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    // Check if user has 'admin' role in user_roles table
    const roles = await models.user_roles.findAll({ where: { user_id: context.userId, role: "admin" } });
    if (!roles || roles.length === 0) throw new Error("Forbidden: admin role required");
    return next({ context });
  });

async function audit(action: string, entity_id: string | null, before: any, after: any, actor_id: string) {
  try {
    const user = await models.users.findOne({ where: { id: actor_id } });
    await models.audit_logs.create({
      actor_id, 
      actor_email: user?.email ?? null,
      action, 
      entity_type: "order", 
      entity_id, 
      before, 
      after,
    });
  } catch { /* no-op */ }
}

const STATUSES = ["placed","confirmed","packed","shipped","delivered","cancelled","refunded"] as const;
type Status = typeof STATUSES[number];

/* ============= LIST (paged + filtered) ============= */
export const adminListOrdersPaged = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(200).default(25),
    q: z.string().optional(),
    status: z.enum([...STATUSES, "ALL"]).default("ALL"),
    customer_type: z.enum(["IND","GAR","EXP","ALL"]).default("ALL"),
    payment_method: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const from = (data.page - 1) * data.pageSize;
    const where: any = {};
    if (data.status !== "ALL") where.status = data.status;
    if (data.customer_type !== "ALL") where.customer_type = data.customer_type;
    if (data.payment_method) where.payment_method = data.payment_method;
    if (data.from) where.created_at = { ...where.created_at, [Op.gte]: data.from };
    if (data.to) where.created_at = { ...where.created_at, [Op.lte]: data.to };
    if (data.q && data.q.trim()) {
      const s = `%${data.q.trim()}%`;
      where[Op.or] = [
        { order_number: { [Op.iLike]: s } },
        { tracking_number: { [Op.iLike]: s } }
      ];
    }
    const { rows, count } = await models.orders.findAndCountAll({
      attributes: ["id", "order_number", "status", "total", "currency", "payment_method", "customer_type", "created_at", "user_id", "courier", "tracking_number"],
      where,
      order: [["created_at", "DESC"]],
      limit: data.pageSize,
      offset: from,
    });
    return { items: rows.map(r => r.get({ plain: true })), total: count, page: data.page, pageSize: data.pageSize };
  });

export const adminOrderStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const today = new Date(new Date().setHours(0,0,0,0)).toISOString();
    const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
    const [all, todayCount, todayTotal, last30Total] = await Promise.all([
      models.orders.findAll({ attributes: ["status", "total"] }),
      models.orders.count({ where: { created_at: { [Op.gte]: today } } }),
      models.orders.sum('total', { where: { created_at: { [Op.gte]: today } } }),
      models.orders.sum('total', { where: { created_at: { [Op.gte]: since30 } } }),
    ]);
    const byStatus: Record<string, number> = {};
    let revenue = 0;
    all.forEach(o => {
      byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
      revenue += Number(o.total ?? 0);
    });
    return {
      total: all.length,
      revenue,
      revenue30: Number(last30Total || 0),
      today: todayCount,
      todayRevenue: Number(todayTotal || 0),
      byStatus,
    };
  });

/* ============= ORDER DETAIL ============= */
export const adminGetOrder = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const order = await models.orders.findOne({ where: { id: data.id } });
    if (!order) throw new Error("Order not found");
    const [items, events, profile] = await Promise.all([
      models.order_items.findAll({ where: { order_id: data.id } }),
      models.order_events.findAll({ where: { order_id: data.id }, order: [["created_at", "DESC"]] }),
      order.user_id ? models.profiles.findOne({ attributes: ["id", "full_name", "customer_type", "phone"], where: { id: order.user_id } }) : Promise.resolve(null),
    ]);
    let email: string | null = null;
    if (order.user_id) {
      try {
        const u = await models.users.findOne({ where: { id: order.user_id } });
        email = u?.email ?? null;
      } catch {}
    }
    return { 
      order: order.get({ plain: true }), 
      items: items.map(i => i.get({ plain: true })), 
      events: events.map(e => e.get({ plain: true })), 
      profile: profile ? profile.get({ plain: true }) : null, 
      email 
    };
  });

/* ============= STATUS / TRACKING / REFUND / CANCEL ============= */
export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(STATUSES),
    note: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const patch: any = { status: data.status };
    const now = new Date().toISOString();
    if (data.status === "shipped") patch.shipped_at = now;
    if (data.status === "delivered") patch.delivered_at = now;
    if (data.status === "cancelled") patch.cancelled_at = now;
    const before = await models.orders.findOne({ attributes: ["status"], where: { id: data.id } });
    await models.orders.update(patch, { where: { id: data.id } });
    await models.order_events.create({
      order_id: data.id, status: data.status, note: data.note ?? null, created_by: context.userId,
    });
    await audit("order.status_change", data.id, before?.get({ plain: true }), patch, context.userId);
    return { ok: true };
  });

export const adminSetTracking = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({
    id: z.string().uuid(),
    courier: z.string().max(80).nullable().optional(),
    tracking_number: z.string().max(120).nullable().optional(),
    tracking_url: z.string().url().nullable().optional().or(z.literal("")),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const patch = {
      courier: data.courier || null,
      tracking_number: data.tracking_number || null,
      tracking_url: data.tracking_url || null,
    };
    await models.orders.update(patch, { where: { id: data.id } });
    await models.order_events.create({
      order_id: data.id, status: "tracking_updated",
      note: `Courier: ${patch.courier ?? "—"} / Tracking: ${patch.tracking_number ?? "—"}`,
      created_by: context.userId,
    });
    await audit("order.tracking", data.id, null, patch, context.userId);
    return { ok: true };
  });

export const adminRefundOrder = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({
    id: z.string().uuid(),
    amount: z.number().min(0),
    reason: z.string().max(500),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const before = await models.orders.findOne({ attributes: ["total", "refund_amount"], where: { id: data.id } });
    if (!before) throw new Error("Order not found");
    if (data.amount > Number(before.total)) throw new Error("Refund exceeds order total");
    await models.orders.update({
      status: "refunded",
      refund_amount: data.amount,
      refund_reason: data.reason,
      refunded_at: new Date().toISOString(),
    }, { where: { id: data.id } });
    await models.order_events.create({
      order_id: data.id, status: "refunded",
      note: `Refunded ${data.amount}: ${data.reason}`, created_by: context.userId,
    });
    await audit("order.refund", data.id, before.get({ plain: true }), { amount: data.amount, reason: data.reason }, context.userId);
    return { ok: true };
  });

export const adminUpdateOrderNotes = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({
    id: z.string().uuid(),
    internal_notes: z.string().max(2000).nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await models.orders.update({ internal_notes: data.internal_notes }, { where: { id: data.id } });
    await audit("order.notes", data.id, null, { internal_notes: data.internal_notes }, context.userId);
    return { ok: true };
  });
