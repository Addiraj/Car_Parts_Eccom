import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "./admin.functions";
import { models } from "@/lib/db/index.server";
import { Op } from "@/lib/db/op.server";

type Json = string | number | boolean | null | { [k: string]: Json } | Json[];
type ThreadRow = {
  id: string;
  title: string;
  language: string;
  vehicle_context: Json;
  last_message_at: string;
  created_at: string;
};

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const rows = await models.ai_chat_threads.findAll({
      attributes: ["id", "title", "language", "vehicle_context", "last_message_at", "created_at"],
      where: { user_id: context.userId },
      order: [["last_message_at", "DESC"]],
      limit: 50
    });
    return rows.map((r: any) => r.get({ plain: true })) as ThreadRow[];
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { title?: string } = {}) => d)
  .handler(async ({ data, context }) => {
    const row = await models.ai_chat_threads.create({
      user_id: context.userId,
      title: data.title ?? "New conversation",
      last_message_at: new Date().toISOString()
    });
    return row.get({ plain: true }) as ThreadRow;
  });

export const renameThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string; title: string }) =>
    z.object({ id: z.string().uuid(), title: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    await models.ai_chat_threads.update(
      { title: data.title },
      { where: { id: data.id, user_id: context.userId } }
    );
    return { ok: true };
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await models.ai_chat_threads.destroy({
      where: { id: data.id, user_id: context.userId }
    });
    return { ok: true };
  });

export const getThreadMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Verify ownership
    const thread = await models.ai_chat_threads.findOne({
      where: { id: data.id, user_id: context.userId }
    });
    if (!thread) throw new Error("Thread not found or forbidden");

    const rows = await models.ai_chat_messages.findAll({
      attributes: ["id", "role", "text", "parts", "attachments", "intent", "created_at"],
      where: { thread_id: data.id },
      order: [["created_at", "ASC"]]
    });
    return rows.map((r: any) => r.get({ plain: true }));
  });

/* ============ Admin ============ */

export const adminListAllThreads = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: { q?: string; intent?: string; days?: number; user_id?: string | null } = {}) => d)
  .handler(async ({ data }) => {
    const since = new Date(Date.now() - (data.days ?? 30) * 86400_000).toISOString();
    
    const w: any = { last_message_at: { [Op.gte]: since } };
    if (data.q) w.title = { [Op.iLike]: `%${data.q}%` };
    if (data.user_id === null) w.user_id = null;
    else if (data.user_id) w.user_id = data.user_id;
    
    const rows = await models.ai_chat_threads.findAll({
      attributes: ["id", "user_id", "title", "language", "vehicle_context", "last_message_at", "created_at"],
      where: w,
      order: [["last_message_at", "DESC"]],
      limit: 200
    });
    return rows.map((r: any) => r.get({ plain: true }));
  });

export const adminListChatUsers = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: { q?: string; days?: number } = {}) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - (data.days ?? 90) * 86400_000).toISOString();
    
    const threads = await models.ai_chat_threads.findAll({
      attributes: ["user_id", "last_message_at"],
      where: { last_message_at: { [Op.gte]: since } },
      order: [["last_message_at", "DESC"]],
      limit: 5000
    });

    const map = new Map<string, { user_id: string | null; thread_count: number; last_message_at: string }>();
    for (const row of threads) {
      const t = row.get({ plain: true });
      const k = t.user_id ?? "__guest__";
      const e = map.get(k);
      if (e) { e.thread_count++; if (t.last_message_at > e.last_message_at) e.last_message_at = t.last_message_at; }
      else map.set(k, { user_id: t.user_id, thread_count: 1, last_message_at: t.last_message_at });
    }

    const userIds = [...map.values()].map((v) => v.user_id).filter((x): x is string => !!x);
    let profiles: Record<string, { full_name: string | null; phone: string | null }> = {};
    let emails: Record<string, string | null> = {};
    
    if (userIds.length) {
      const profRows = await models.profiles.findAll({
        attributes: ["id", "full_name", "phone"],
        where: { id: { [Op.in]: userIds } }
      });
      for (const row of profRows) {
        const p = row.get({ plain: true });
        profiles[p.id] = { full_name: p.full_name, phone: p.phone };
      }
      
      const results = await Promise.all(userIds.map((id) =>
        supabaseAdmin.auth.admin.getUserById(id).then((r: any) => [id, r.data.user?.email ?? null] as const).catch(() => [id, null] as const)
      ));
      for (const [id, email] of results) emails[id] = email;
    }

    const q = (data.q ?? "").trim().toLowerCase();
    const rows = [...map.values()].map((v) => {
      const prof = v.user_id ? profiles[v.user_id] : null;
      return {
        user_id: v.user_id,
        full_name: prof?.full_name ?? (v.user_id ? "Unknown" : "Guest"),
        phone: prof?.phone ?? null,
        email: v.user_id ? emails[v.user_id] ?? null : null,
        thread_count: v.thread_count,
        last_message_at: v.last_message_at,
      };
    }).filter((r) => !q || [r.full_name, r.phone, r.email].some((x) => (x ?? "").toLowerCase().includes(q)))
      .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
    return rows;
  });

export const adminGetThread = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const [threadRow, msgsRows] = await Promise.all([
      models.ai_chat_threads.findByPk(data.id),
      models.ai_chat_messages.findAll({
        attributes: ["id", "role", "text", "parts", "attachments", "intent", "created_at"],
        where: { thread_id: data.id },
        order: [["created_at", "ASC"]]
      })
    ]);
    return {
      thread: threadRow ? threadRow.get({ plain: true }) : null,
      messages: msgsRows.map((r: any) => r.get({ plain: true }))
    };
  });

export const getChatAnalytics = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: { days?: number } = {}) => d)
  .handler(async ({ data }) => {
    const days = data.days ?? 30;
    const since = new Date(Date.now() - days * 86400_000).toISOString();
    
    const [threadsResult, messagesResult, eventsRows, leadsRows] = await Promise.all([
      models.ai_chat_threads.findAndCountAll({
        attributes: ["id", "user_id", "language", "created_at"],
        where: { created_at: { [Op.gte]: since } }
      }),
      models.ai_chat_messages.findAndCountAll({
        attributes: ["id", "intent", "role", "created_at"],
        where: { created_at: { [Op.gte]: since } }
      }),
      models.ai_chat_events.findAll({
        attributes: ["event_type", "payload", "created_at"],
        where: { created_at: { [Op.gte]: since } }
      }),
      models.ai_leads.findAll({
        attributes: ["id", "status", "created_at"],
        where: { created_at: { [Op.gte]: since } }
      })
    ]);
    
    const evRows = eventsRows.map((r: any) => r.get({ plain: true }));
    const byEvent: Record<string, number> = {};
    for (const r of evRows) byEvent[r.event_type] = (byEvent[r.event_type] ?? 0) + 1;
    
    const tRows = threadsResult.rows.map((r: any) => r.get({ plain: true }));
    const byLanguage: Record<string, number> = {};
    for (const r of tRows) byLanguage[r.language ?? "unknown"] = (byLanguage[r.language ?? "unknown"] ?? 0) + 1;

    const topMap = (filter: (e: typeof evRows[number]) => string | undefined | null) => {
      const m = new Map<string, number>();
      for (const r of evRows) {
        const k = filter(r);
        if (!k) continue;
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([name, value]) => ({ name, value }));
    };
    const topParts = topMap((e) => e.event_type === "part_search" ? String((e.payload as any)?.query ?? "").trim().toLowerCase() : null);
    const topPartNumbers = topMap((e) =>
      e.event_type === "part_search"
        ? (() => {
            const q = String((e.payload as any)?.query ?? "");
            return /[A-Z0-9-]{4,}/i.test(q) ? q.toUpperCase() : null;
          })()
        : null);
    const topVins = topMap((e) => (e.event_type === "vin_search" || e.event_type === "vin_ocr") ? String((e.payload as any)?.vin ?? (e.payload as any)?.VIN ?? "").toUpperCase() : null);
    const topWarningLights = topMap((e) => e.event_type === "warning_light" ? String((e.payload as any)?.name ?? "") : null);
    const topImageParts = topMap((e) => e.event_type === "image_id" ? String((e.payload as any)?.partName ?? "") : null);
    const topBrands = topMap((e) => e.event_type === "part_search" ? (String((e.payload as any)?.brand ?? "") || null) : null);

    // Daily time series
    const dayMap = new Map<string, { messages: number; threads: number }>();
    const fmt = (d: string) => d.slice(0, 10);
    for (let i = 0; i < days; i++) {
      const k = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
      dayMap.set(k, { messages: 0, threads: 0 });
    }
    const msgsRowsPlain = messagesResult.rows.map((r: any) => r.get({ plain: true }));
    for (const m of msgsRowsPlain) {
      const k = fmt(m.created_at); const e = dayMap.get(k); if (e) e.messages++;
    }
    for (const t of tRows) {
      const k = fmt(t.created_at); const e = dayMap.get(k); if (e) e.threads++;
    }
    const timeseries = [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({ date, ...v }));

    const leadsByStatus: Record<string, number> = {};
    const leadsRowsPlain = leadsRows.map((r: any) => r.get({ plain: true }));
    for (const l of leadsRowsPlain) leadsByStatus[l.status] = (leadsByStatus[l.status] ?? 0) + 1;

    return {
      totalThreads: threadsResult.count ?? 0,
      totalMessages: messagesResult.count ?? 0,
      uniqueUsers: new Set(tRows.map((r) => r.user_id).filter(Boolean)).size,
      totalLeads: leadsRowsPlain.length,
      voiceMessages: byEvent["voice_transcribe"] ?? 0,
      imageUploads: (byEvent["image_id"] ?? 0) + (byEvent["warning_light"] ?? 0) + (byEvent["vin_ocr"] ?? 0),
      eventsByType: byEvent,
      threadsByLanguage: byLanguage,
      timeseries,
      topParts,
      topPartNumbers,
      topVins,
      topWarningLights,
      topImageParts,
      topBrands,
      leadsByStatus,
    };
  });

export const adminListAiLeads = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const rows = await models.ai_leads.findAll({
      order: [["created_at", "DESC"]],
      limit: 200
    });
    return rows.map((r: any) => r.get({ plain: true }));
  });

export const salesmanListAiLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isSalesman = await models.user_roles.findOne({
      where: { user_id: context.userId, role: "salesman" }
    });
    if (!isSalesman) return [];
    
    const rows = await models.ai_leads.findAll({
      where: {
        [Op.or]: [
          { assigned_salesman_id: context.userId },
          {
            assigned_salesman_id: null,
            status: "new"
          }
        ]
      },
      order: [["created_at", "DESC"]]
    });
    return rows.map((r: any) => r.get({ plain: true }));
  });

export const updateAiLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string; status?: string; notes?: string }) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["new", "assigned", "contacted", "closed"]).optional(),
      notes: z.string().max(2000).optional(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    // Basic verification - checking if the lead is accessible to the user
    // RLS in Supabase would handle this, we can emulate it
    const isAdmin = await models.user_roles.findOne({ where: { user_id: context.userId, role: "admin" } });
    if (!isAdmin) {
      const isSalesman = await models.user_roles.findOne({ where: { user_id: context.userId, role: "salesman" } });
      if (!isSalesman) throw new Error("Forbidden");
    }

    const patch: Record<string, unknown> = {};
    if (data.status) patch.status = data.status;
    if (data.notes !== undefined) patch.notes = data.notes;
    
    await models.ai_leads.update(patch, { where: { id: data.id } });
    return { ok: true };
  });

/* ============ Salesman: view assigned customers' AI conversations ============ */

async function ensureSalesmanCanAccessCustomer(userId: string, customerId: string) {
  const [isAdmin, isSm] = await Promise.all([
    models.user_roles.findOne({ where: { user_id: userId, role: "admin" } }),
    models.user_roles.findOne({ where: { user_id: userId, role: "salesman" } }),
  ]);
  
  if (isAdmin) return;
  if (!isSm) throw new Error("Forbidden");
  
  const ca = await models.customer_assignments.findOne({
    attributes: ["customer_id"],
    where: { salesman_id: userId, customer_id: customerId }
  });
  if (!ca) throw new Error("Forbidden");
}

export const salesmanListCustomerAiThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { customer_id: string }) =>
    z.object({ customer_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureSalesmanCanAccessCustomer(context.userId, data.customer_id);
    
    const threads = await models.ai_chat_threads.findAll({
      attributes: ["id", "title", "language", "vehicle_context", "last_message_at", "created_at"],
      where: { user_id: data.customer_id },
      order: [["last_message_at", "DESC"]],
      limit: 50
    });
    return threads.map((r: any) => r.get({ plain: true }));
  });

export const salesmanGetAiThreadMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { thread_id: string }) =>
    z.object({ thread_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const threadRow = await models.ai_chat_threads.findOne({
      attributes: ["id", "user_id", "title", "vehicle_context", "created_at"],
      where: { id: data.thread_id }
    });
    if (!threadRow) throw new Error("Not found");
    const thread = threadRow.get({ plain: true });
    
    if (!thread.user_id) throw new Error("Not found");
    await ensureSalesmanCanAccessCustomer(context.userId, thread.user_id);
    
    const msgsRows = await models.ai_chat_messages.findAll({
      attributes: ["id", "role", "text", "parts", "intent", "created_at"],
      where: { thread_id: data.thread_id },
      order: [["created_at", "ASC"]],
      limit: 500
    });
    return { thread, messages: msgsRows.map((r: any) => r.get({ plain: true })) };
  });

export const salesmanListAllAiThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { q?: string } = {}) => d)
  .handler(async ({ data, context }) => {
    const assigns = await models.customer_assignments.findAll({
      attributes: ["customer_id"],
      where: { salesman_id: context.userId }
    });
    const ids = assigns.map((a: any) => a.get({ plain: true }).customer_id);
    if (!ids.length) return [];
    
    const w: any = { user_id: { [Op.in]: ids } };
    if (data.q && data.q.trim()) w.title = { [Op.iLike]: `%${data.q.trim()}%` };
    
    const threadsRows = await models.ai_chat_threads.findAll({
      attributes: ["id", "user_id", "title", "language", "last_message_at", "created_at"],
      where: w,
      order: [["last_message_at", "DESC"]],
      limit: 200
    });
    const threads = threadsRows.map((r: any) => r.get({ plain: true }));
    if (!threads.length) return [];
    
    const uids = Array.from(new Set(threads.map((t: any) => t.user_id).filter(Boolean))) as string[];
    const profsRows = await models.profiles.findAll({
      attributes: ["id", "full_name", "company_name"],
      where: { id: { [Op.in]: uids } }
    });
    const pmap = new Map(profsRows.map((p: any) => {
      const pl = p.get({ plain: true });
      return [pl.id, pl];
    }));
    
    return threads.map((t: any) => ({ ...t, customer: pmap.get(t.user_id) ?? null }));
  });
