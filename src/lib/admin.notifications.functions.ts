import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/admin.functions";
import { requireSalesmanOrAdmin } from "@/lib/admin.salesmen.functions";
import { z } from "zod";
import { models } from "@/lib/db/index.server";
import { Op } from "@/lib/db/op.server";

export const listAdminNotifications = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: unknown) =>
    z.object({
      limit: z.coerce.number().int().min(1).max(100).default(20),
      offset: z.coerce.number().int().min(0).default(0),
      type: z.enum(["all", "signup", "order", "quotation"]).default("all"),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const where: any = {};
    if (data.type !== "all") where.type = data.type;
    
    const { rows: itemsRows, count } = await models.admin_notifications.findAndCountAll({
      attributes: ["id", "type", "title", "body", "entity_type", "entity_id", "metadata", "created_at"],
      where,
      order: [["created_at", "DESC"]],
      limit: data.limit,
      offset: data.offset
    });
    
    const reads = await models.admin_notification_reads.findAll({
      attributes: ["notification_id"],
      where: { admin_id: context.userId }
    });
    
    const readSet = new Set(reads.map((r: any) => r.notification_id));
    return {
      items: itemsRows.map((n: any) => ({ ...n.get({ plain: true }), read: readSet.has(n.id) })),
      total: count,
    };
  });

export const getUnreadCount = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const [total, reads] = await Promise.all([
      models.admin_notifications.count(),
      models.admin_notification_reads.findAll({ attributes: ["notification_id"], where: { admin_id: context.userId } }),
    ]);
    const readIds = reads.map((r: any) => r.notification_id);
    if (readIds.length === 0) return { unread: total };
    const readCount = await models.admin_notifications.count({
      where: { id: { [Op.in]: readIds } }
    });
    return { unread: Math.max(0, total - readCount) };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const existing = await models.admin_notification_reads.findOne({
      where: { notification_id: data.id, admin_id: context.userId }
    });
    if (!existing) {
      await models.admin_notification_reads.create({ notification_id: data.id, admin_id: context.userId } as any);
    }
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const all = await models.admin_notifications.findAll({ attributes: ["id"] });
    const reads = await models.admin_notification_reads.findAll({
      attributes: ["notification_id"], where: { admin_id: context.userId }
    });
    const readSet = new Set(reads.map((r: any) => r.notification_id));
    const rows = all
      .filter((n: any) => !readSet.has(n.id))
      .map((n: any) => ({ notification_id: n.id, admin_id: context.userId }));
    if (rows.length === 0) return { ok: true, marked: 0 };
    await models.admin_notification_reads.bulkCreate(rows as any[]);
    return { ok: true, marked: rows.length };
  });

/* ============ Salesman-scoped notifications ============ */

export const listSalesmanNotifications = createServerFn({ method: "GET" })
  .middleware([requireSalesmanOrAdmin])
  .validator((d: unknown) =>
    z.object({
      limit: z.coerce.number().int().min(1).max(100).default(20),
      offset: z.coerce.number().int().min(0).default(0),
      type: z.enum(["all", "assignment", "cart", "order", "ai_lead", "lead", "activity", "quotation", "wishlist"]).default("all"),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }: any) => {
    const where: any = { salesman_id: context.userId };
    if (data.type !== "all") where.type = data.type;
    
    const { rows: itemsRows, count } = await models.admin_notifications.findAndCountAll({
      attributes: ["id", "type", "title", "body", "entity_type", "entity_id", "metadata", "created_at"],
      where,
      order: [["created_at", "DESC"]],
      limit: data.limit,
      offset: data.offset
    });
    
    const reads = await models.admin_notification_reads.findAll({
      attributes: ["notification_id"],
      where: { admin_id: context.userId }
    });
    
    const readSet = new Set(reads.map((r: any) => r.notification_id));
    return {
      items: itemsRows.map((n: any) => ({ ...n.get({ plain: true }), read: readSet.has(n.id) })),
      total: count,
    };
  });

export const getSalesmanUnreadCount = createServerFn({ method: "GET" })
  .middleware([requireSalesmanOrAdmin])
  .handler(async ({ context }: any) => {
    const [total, reads] = await Promise.all([
      models.admin_notifications.count({ where: { salesman_id: context.userId } }),
      models.admin_notification_reads.findAll({ attributes: ["notification_id"], where: { admin_id: context.userId } }),
    ]);
    const readIds = reads.map((r: any) => r.notification_id);
    if (readIds.length === 0) return { unread: total };
    const readCount = await models.admin_notifications.count({
      where: { salesman_id: context.userId, id: { [Op.in]: readIds } }
    });
    return { unread: Math.max(0, total - readCount) };
  });

export const markSalesmanNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSalesmanOrAdmin])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }: any) => {
    const existing = await models.admin_notification_reads.findOne({
      where: { notification_id: data.id, admin_id: context.userId }
    });
    if (!existing) {
      await models.admin_notification_reads.create({ notification_id: data.id, admin_id: context.userId } as any);
    }
    return { ok: true };
  });

export const markAllSalesmanNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSalesmanOrAdmin])
  .handler(async ({ context }: any) => {
    const all = await models.admin_notifications.findAll({ attributes: ["id"], where: { salesman_id: context.userId } });
    const reads = await models.admin_notification_reads.findAll({
      attributes: ["notification_id"], where: { admin_id: context.userId }
    });
    const readSet = new Set(reads.map((r: any) => r.notification_id));
    const rows = all
      .filter((n: any) => !readSet.has(n.id))
      .map((n: any) => ({ notification_id: n.id, admin_id: context.userId }));
    if (rows.length === 0) return { ok: true, marked: 0 };
    await models.admin_notification_reads.bulkCreate(rows as any[]);
    return { ok: true, marked: rows.length };
  });
