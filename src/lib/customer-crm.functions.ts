import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "./admin.functions";
import { requireSalesmanOrAdmin } from "./admin.salesmen.functions";
import { z } from "zod";
import { models, sequelize } from "@/lib/db/index.server";
import { Op } from "@/lib/db/op.server";

/* ============ Notes ============ */

const NoteInput = z.object({
  customer_id: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
  pinned: z.boolean().optional(),
});

export const listCustomerNotes = createServerFn({ method: "GET" })
  .middleware([requireSalesmanOrAdmin])
  .validator((d: { customer_id: string }) => d)
  .handler(async ({ data, context }) => {
    const rows = await models.customer_notes.findAll({
      where: { customer_id: data.customer_id },
      order: [
        ["pinned", "DESC"],
        ["created_at", "DESC"]
      ]
    });
    
    const notes = rows.map((r: any) => r.get({ plain: true }));
    const authors = Array.from(new Set(notes.map((r: any) => r.author_id).filter(Boolean)));
    
    let names = new Map<string, string>();
    if (authors.length) {
      const ps = await models.profiles.findAll({
        attributes: ["id", "full_name"],
        where: { id: { [Op.in]: authors } }
      });
      for (const p of ps) {
        const pd = p.get({ plain: true });
        names.set(pd.id, pd.full_name || "");
      }
    }
    
    return notes.map((r: any) => ({ ...r, author_name: names.get(r.author_id) || "User" }));
  });

export const createCustomerNote = createServerFn({ method: "POST" })
  .middleware([requireSalesmanOrAdmin])
  .validator((d: z.infer<typeof NoteInput>) => NoteInput.parse(d))
  .handler(async ({ data, context }) => {
    const row = await models.customer_notes.create({
      ...data,
      author_id: context.userId
    });
    
    const note = row.get({ plain: true });
    
    await models.customer_activities.create({
      customer_id: data.customer_id,
      actor_id: context.userId,
      type: "note_added",
      entity_type: "note",
      entity_id: note.id,
      metadata: { preview: data.body.slice(0, 80) }
    });
    
    return note;
  });

export const updateCustomerNote = createServerFn({ method: "POST" })
  .middleware([requireSalesmanOrAdmin])
  .validator((d: { id: string; body?: string; pinned?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    await models.customer_notes.update(patch, { where: { id } });
    return { ok: true };
  });

export const deleteCustomerNote = createServerFn({ method: "POST" })
  .middleware([requireSalesmanOrAdmin])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await models.customer_notes.destroy({ where: { id: data.id } });
    return { ok: true };
  });

/* ============ Follow-ups ============ */

const FollowupInput = z.object({
  customer_id: z.string().uuid(),
  assigned_to: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  due_at: z.string(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export const listFollowups = createServerFn({ method: "GET" })
  .middleware([requireSalesmanOrAdmin])
  .validator((d: {
    customer_id?: string; assigned_to?: string;
    status?: "all" | "pending" | "completed" | "cancelled" | "overdue" | "today";
    scope?: "mine" | "all";
  } = {}) => d)
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    
    const where: any = {};
    if (!ctx.isAdmin || data.scope === "mine") {
      where.assigned_to = ctx.userId;
    }
    if (data.customer_id) where.customer_id = data.customer_id;
    if (data.assigned_to) where.assigned_to = data.assigned_to;
    
    if (data.status === "overdue") {
      where.status = "pending";
      where.due_at = { [Op.lt]: new Date().toISOString() };
    } else if (data.status === "today") {
      const start = new Date(); start.setHours(0,0,0,0);
      const end = new Date(); end.setHours(23,59,59,999);
      where.status = "pending";
      where.due_at = { [Op.gte]: start.toISOString(), [Op.lte]: end.toISOString() };
    } else if (data.status && data.status !== "all") {
      where.status = data.status;
    }
    
    const rows = await models.customer_followups.findAll({
      where,
      order: [["due_at", "ASC"]],
      limit: 500
    });
    
    const followups = rows.map((r: any) => r.get({ plain: true }));
    
    const cids = Array.from(new Set(followups.map((r: any) => r.customer_id)));
    const aids = Array.from(new Set(followups.map((r: any) => r.assigned_to)));
    const allIds = Array.from(new Set([...cids, ...aids].filter(Boolean)));
    
    let names = new Map<string, string>();
    if (allIds.length) {
      const ps = await models.profiles.findAll({
        attributes: ["id", "full_name"],
        where: { id: { [Op.in]: allIds } }
      });
      for (const p of ps) {
        const pd = p.get({ plain: true });
        names.set(pd.id, pd.full_name || "");
      }
    }
    
    return followups.map((r: any) => ({
      ...r,
      customer_name: names.get(r.customer_id) || "Customer",
      assignee_name: names.get(r.assigned_to) || "User",
      is_overdue: r.status === "pending" && new Date(r.due_at).getTime() < Date.now(),
    }));
  });

export const createFollowup = createServerFn({ method: "POST" })
  .middleware([requireSalesmanOrAdmin])
  .validator((d: z.infer<typeof FollowupInput>) => FollowupInput.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    
    const row = await models.customer_followups.create({
      ...data,
      created_by: ctx.userId
    });
    
    const followup = row.get({ plain: true });
    
    await models.customer_activities.create({
      customer_id: data.customer_id,
      actor_id: ctx.userId,
      type: "followup_created",
      entity_type: "followup",
      entity_id: followup.id,
      metadata: { title: data.title, due_at: data.due_at, priority: data.priority }
    });
    
    return followup;
  });

export const completeFollowup = createServerFn({ method: "POST" })
  .middleware([requireSalesmanOrAdmin])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    
    await models.customer_followups.update({
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_by: ctx.userId
    }, { where: { id: data.id } });
    
    const row = await models.customer_followups.findOne({ where: { id: data.id } });
    if (!row) throw new Error("Not found");
    const followup = row.get({ plain: true });
    
    await models.customer_activities.create({
      customer_id: followup.customer_id,
      actor_id: ctx.userId,
      type: "followup_completed",
      entity_type: "followup",
      entity_id: followup.id,
      metadata: { title: followup.title }
    });
    
    return followup;
  });

export const cancelFollowup = createServerFn({ method: "POST" })
  .middleware([requireSalesmanOrAdmin])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    
    await models.customer_followups.update({
      status: "cancelled",
    }, { where: { id: data.id } });
    
    const row = await models.customer_followups.findOne({ where: { id: data.id } });
    if (!row) throw new Error("Not found");
    const followup = row.get({ plain: true });
    
    await models.customer_activities.create({
      customer_id: followup.customer_id,
      actor_id: ctx.userId,
      type: "followup_cancelled",
      entity_type: "followup",
      entity_id: followup.id,
      metadata: { title: followup.title }
    });
    
    return followup;
  });

/* ============ Activities ============ */

export const listCustomerActivities = createServerFn({ method: "GET" })
  .middleware([requireSalesmanOrAdmin])
  .validator((d: { customer_id: string; limit?: number }) => d)
  .handler(async ({ data, context }) => {
    const rows = await models.customer_activities.findAll({
      where: { customer_id: data.customer_id },
      order: [["created_at", "DESC"]],
      limit: data.limit ?? 200
    });
    
    const activities = rows.map((r: any) => r.get({ plain: true }));
    const actors = Array.from(new Set(activities.map((r: any) => r.actor_id).filter(Boolean)));
    
    let names = new Map<string, string>();
    if (actors.length) {
      const ps = await models.profiles.findAll({
        attributes: ["id", "full_name"],
        where: { id: { [Op.in]: actors } }
      });
      for (const p of ps) {
        const pd = p.get({ plain: true });
        names.set(pd.id, pd.full_name || "");
      }
    }
    
    return activities.map((r: any) => ({ ...r, actor_name: r.actor_id ? (names.get(r.actor_id) || "User") : "System" }));
  });

/* ============ Audit Logs (admin only) ============ */

export const adminListAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: {
    actor_id?: string; customer_id?: string; entity_type?: string; action?: string; q?: string;
    from?: string; to?: string; page?: number; per_page?: number;
  } = {}) => d)
  .handler(async ({ data }) => {
    const per = Math.min(data.per_page ?? 50, 200);
    const page = Math.max(1, data.page ?? 1);
    
    const where: any = {};
    if (data.actor_id) where.actor_id = data.actor_id;
    if (data.customer_id) where.customer_id = data.customer_id;
    if (data.entity_type) where.entity_type = data.entity_type;
    if (data.action && data.action.trim()) {
      where.action = { [Op.iLike]: `%${data.action.trim()}%` };
    }
    if (data.q && data.q.trim()) {
      const s = `%${data.q.trim().replace(/,/g, " ")}%`;
      where[Op.or] = [
        { action: { [Op.iLike]: s } },
        { entity_type: { [Op.iLike]: s } },
        { actor_email: { [Op.iLike]: s } },
        { entity_id: { [Op.iLike]: s } },
      ];
    }
    if (data.from || data.to) {
      where.created_at = {};
      if (data.from) where.created_at[Op.gte] = data.from;
      if (data.to) where.created_at[Op.lte] = data.to;
    }
    
    const { rows, count } = await models.audit_logs.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      limit: per,
      offset: (page - 1) * per
    });
    
    return { rows: rows.map((r: any) => r.get({ plain: true })), total: count, page, per_page: per };
  });
