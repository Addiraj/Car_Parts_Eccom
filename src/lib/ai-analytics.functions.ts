import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./admin.functions";
import { models } from "@/lib/db/index.server";
import { Op } from "sequelize";

type RangeInput = { range: "30d" | "12w" | "custom"; from?: string; to?: string };

const rangeValidator = (d: RangeInput) =>
  z.object({
    range: z.enum(["30d", "12w", "custom"]),
    from: z.string().optional(),
    to: z.string().optional(),
  }).parse(d);

function computeWindow(r: RangeInput) {
  const now = new Date();
  let from: Date;
  let to: Date = now;
  let bucket: "day" | "week" = "day";
  if (r.range === "30d") {
    from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (r.range === "12w") {
    from = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
    bucket = "week";
  } else {
    from = r.from ? new Date(r.from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    to = r.to ? new Date(r.to) : now;
  }
  return { from, to, bucket };
}

function bucketKey(d: Date, bucket: "day" | "week") {
  if (bucket === "week") {
    const t = new Date(d);
    const day = t.getUTCDay();
    const diff = (day + 6) % 7; // Monday-start
    t.setUTCDate(t.getUTCDate() - diff);
    return t.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

export const aiAnalyticsKpis = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(rangeValidator)
  .handler(async ({ data }) => {
    const { from, to } = computeWindow(data);

    // user messages in range
    const msgs = await models.ai_chat_messages.findAll({
      attributes: ["created_at", "thread_id", "role"],
      where: {
        role: "user",
        created_at: {
          [Op.gte]: from.toISOString(),
          [Op.lte]: to.toISOString(),
        }
      }
    });

    const totalQueries = msgs.length;

    // unique users: look up threads
    const threadIds = Array.from(new Set(msgs.map((m) => m.thread_id).filter(Boolean)));
    let uniqueUsers = 0;
    if (threadIds.length) {
      const tRows = await models.ai_chat_threads.findAll({
        attributes: ["user_id", "guest_token"],
        where: { id: { [Op.in]: threadIds as string[] } }
      });
      const set = new Set<string>();
      for (const t of tRows) set.add(t.user_id ?? `guest:${t.guest_token ?? ""}`);
      uniqueUsers = set.size;
    }

    // peak hour today
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const hourly = Array.from({ length: 24 }, () => 0);
    for (const m of msgs ?? []) {
      const d = new Date(m.created_at);
      if (d >= todayStart) hourly[d.getHours()] += 1;
    }
    const peakCount = Math.max(...hourly);
    const peakHour = peakCount > 0 ? hourly.indexOf(peakCount) : null;

    return {
      totalQueries,
      uniqueUsers,
      peakHour, // 0-23 or null
      peakCount,
      hourlyToday: hourly,
    };
  });

export const aiQueryVolume = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(rangeValidator)
  .handler(async ({ data }) => {
    const { from, to, bucket } = computeWindow(data);
    const msgs = await models.ai_chat_messages.findAll({
      attributes: ["created_at"],
      where: {
        role: "user",
        created_at: {
          [Op.gte]: from.toISOString(),
          [Op.lte]: to.toISOString(),
        }
      }
    });

    const counts = new Map<string, number>();
    // Pre-seed buckets so chart has full range
    const stepMs = bucket === "week" ? 7 * 86400_000 : 86400_000;
    for (let t = from.getTime(); t <= to.getTime(); t += stepMs) {
      counts.set(bucketKey(new Date(t), bucket), 0);
    }
    for (const m of msgs ?? []) {
      const k = bucketKey(new Date(m.created_at), bucket);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));
  });

export const aiUniqueUsers = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(rangeValidator)
  .handler(async ({ data }) => {
    const { from, to } = computeWindow(data);
    const msgs = await models.ai_chat_messages.findAll({
      attributes: ["thread_id"],
      where: {
        role: "user",
        created_at: {
          [Op.gte]: from.toISOString(),
          [Op.lte]: to.toISOString(),
        }
      }
    });
    const threadIds = Array.from(new Set(msgs.map((m) => m.thread_id).filter(Boolean)));
    if (!threadIds.length) return [];
    
    const tRows = await models.ai_chat_threads.findAll({
      attributes: ["user_id", "guest_token", "language"],
      where: { id: { [Op.in]: threadIds as string[] } }
    });
    const map = new Map<string, { user_id: string | null; guest_token: string | null; threads: number; name?: string | null; email?: string | null }>();
    for (const t of tRows) {
      const key = t.user_id ?? `guest:${t.guest_token ?? ""}`;
      const cur = map.get(key) ?? { user_id: t.user_id ?? null, guest_token: t.guest_token ?? null, threads: 0 };
      cur.threads += 1;
      map.set(key, cur);
    }
    // Look up names/emails
    const userIds = Array.from(map.values()).map((u) => u.user_id).filter(Boolean) as string[];
    if (userIds.length) {
      const profs = await models.profiles.findAll({
        attributes: ["id", "full_name"],
        where: { id: { [Op.in]: userIds } }
      });
      const pmap = new Map(profs.map((p) => [p.id, p.full_name]));
      for (const u of map.values()) if (u.user_id) u.name = pmap.get(u.user_id) ?? null;
    }
    return Array.from(map.values());
  });

export const aiAnalyticsExportCsv = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(rangeValidator)
  .handler(async ({ data }) => {
    const { from, to, bucket } = computeWindow(data);
    const msgs = await models.ai_chat_messages.findAll({
      attributes: ["created_at"],
      where: {
        role: "user",
        created_at: {
          [Op.gte]: from.toISOString(),
          [Op.lte]: to.toISOString(),
        }
      }
    });
    const counts = new Map<string, number>();
    const stepMs = bucket === "week" ? 7 * 86400_000 : 86400_000;
    for (let t = from.getTime(); t <= to.getTime(); t += stepMs) counts.set(bucketKey(new Date(t), bucket), 0);
    for (const m of msgs ?? []) {
      const k = bucketKey(new Date(m.created_at), bucket);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const rows = Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b));
    const csv = ["bucket,queries", ...rows.map(([d, n]) => `${d},${n}`)].join("\n");
    return { csv, filename: `ai-query-volume-${data.range}.csv` };
  });

// ============================================================
// Web Analytics — Part Demand
// ============================================================

const COMMON_PART_NAMES = [
  "Brake Pad", "Boot", "Maxi Flush", "Air Filter", "Dipstick", "Brake Disc", "Atf", "Waterpump", "Thermostat", "Engine Oil", "Spark Plug", "Battery", "Wiper", "Alternator", "Starter", "Radiator", "Shock Absorber", "Strut", "Control Arm", "Tie Rod", "Wheel Bearing", "Clutch", "Timing Belt", "Serpentine Belt", "Fuel Pump", "Fuel Injector", "Oxygen Sensor"
];

function extractPartNameFromText(text?: string | null): string | undefined {
  if (!text) return undefined;
  const t = text.toLowerCase();
  for (const name of COMMON_PART_NAMES) {
    if (t.includes(name.toLowerCase())) {
      return name;
    }
  }
  return undefined;
}

export const webPartDemandStats = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(rangeValidator)
  .handler(async ({ data }) => {
    const { from, to } = computeWindow(data);

    // 1. Fetch Web catalog activities
    const webActivities = await models.customer_activities.findAll({
      attributes: ["activity_type", "metadata", "created_at", "customer_id", "actor_id"],
      where: {
        activity_type: { [Op.in]: ["part_viewed", "catalog_viewed"] },
        created_at: {
          [Op.gte]: from.toISOString(),
          [Op.lte]: to.toISOString()
        }
      }
    });

    // 2. Fetch AI Avatar searches (messages & threads)
    const aiMsgs = await models.ai_chat_messages.findAll({
      attributes: ["thread_id", "user_message", "bot_response", "created_at"],
      where: {
        role: "user",
        created_at: {
          [Op.gte]: from.toISOString(),
          [Op.lte]: to.toISOString()
        }
      }
    });
    const threadIds = Array.from(new Set(aiMsgs.map(m => m.thread_id).filter(Boolean)));
    const aiThreads = threadIds.length ? await models.ai_chat_threads.findAll({
      attributes: ["id", "user_id", "guest_token"],
      where: { id: { [Op.in]: threadIds as string[] } }
    }) : [];
    const threadMap = new Map(aiThreads.map(t => [t.id, t.user_id ?? `guest:${t.guest_token ?? ""}`]));

    // Fetch user profiles to attach names
    const allUserIds = new Set<string>();
    webActivities.forEach(a => { if (a.customer_id) allUserIds.add(a.customer_id); if (a.actor_id) allUserIds.add(a.actor_id); });
    aiThreads.forEach(t => { if (t.user_id) allUserIds.add(t.user_id); });
    const userProfiles = allUserIds.size ? await models.profiles.findAll({
      attributes: ["id", "full_name"],
      where: { id: { [Op.in]: Array.from(allUserIds) } }
    }) : [];
    const profileMap = new Map(userProfiles.map(p => [p.id, p.full_name]));

    const partNumbersCount = new Map<string, number>();
    const itemNamesCount = new Map<string, number>();
    
    // structure for table: Customer -> { parts, items, total, last_activity }
    const userStats = new Map<string, { name: string, parts: Set<string>, items: Set<string>, total: number, last_seen: Date }>();

    const trackUserActivity = (userId: string | null, partNo?: string, itemName?: string, dateStr?: string) => {
      const uKey = userId ?? "Guest";
      const uName = userId ? (profileMap.get(userId) ?? `User ${userId.slice(0, 8)}`) : "Guest User";
      const cur = userStats.get(uKey) ?? { name: uName, parts: new Set(), items: new Set(), total: 0, last_seen: new Date(0) };
      cur.total += 1;
      if (partNo) cur.parts.add(partNo);
      if (itemName) cur.items.add(itemName);
      if (dateStr) {
        const d = new Date(dateStr);
        if (d > cur.last_seen) cur.last_seen = d;
      }
      userStats.set(uKey, cur);
    };

    // Process Web Activities
    for (const a of webActivities) {
      const meta = (a.metadata ?? {}) as any;
      const partNo = meta.part_number || meta.oem_number || meta.query;
      const itemName = meta.part_name || meta.name || extractPartNameFromText(meta.query || meta.search_query);
      
      if (partNo) {
        const p = partNo.toUpperCase();
        partNumbersCount.set(p, (partNumbersCount.get(p) ?? 0) + 1);
      }
      if (itemName) {
        // capitalize words
        const i = itemName.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        itemNamesCount.set(i, (itemNamesCount.get(i) ?? 0) + 1);
      }
      
      const uId = a.customer_id || a.actor_id || null;
      if (partNo || itemName) {
        trackUserActivity(uId, partNo, itemName, String(a.created_at));
      }
    }

    // Process AI Avatar Messages
    for (const m of aiMsgs) {
      const partNo = extractPartFromText(m.user_message, m.bot_response);
      const itemName = extractPartNameFromText(m.user_message) ?? extractPartNameFromText(m.bot_response);
      
      if (partNo) {
        partNumbersCount.set(partNo, (partNumbersCount.get(partNo) ?? 0) + 1);
      }
      if (itemName) {
        itemNamesCount.set(itemName, (itemNamesCount.get(itemName) ?? 0) + 1);
      }

      if (partNo || itemName) {
        const uId = threadMap.get(m.thread_id);
        trackUserActivity(uId, partNo, itemName, String(m.created_at));
      }
    }

    const topPartNumbers = Array.from(partNumbersCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([value, count]) => ({ value, count }));

    const topItemNames = Array.from(itemNamesCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([value, count]) => ({ value, count }));

    const userSearchActivity = Array.from(userStats.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 50)
      .map(u => ({
        customer: u.name,
        part_numbers: u.parts.size,
        item_names: u.items.size,
        total_searches: u.total,
        last_activity: u.last_seen.toISOString()
      }));

    return {
      topPartNumbers,
      topItemNames,
      userSearchActivity
    };
  });

// ============================================================
// WhatsApp analytics — wa_chat_logs + wa_analytics_events
// ============================================================

export const waKpis = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(rangeValidator)
  .handler(async ({ data }) => {
    const { from, to } = computeWindow(data);
    const rows = await models.wa_chat_logs.findAll({
      attributes: ["occurred_at", "whatsapp_user_id"],
      where: {
        occurred_at: {
          [Op.gte]: from.toISOString(),
          [Op.lte]: to.toISOString()
        }
      }
    });
    const list = rows.map(r => r.get({ plain: true }));
    const totalQueries = list.length;
    const uniqueUsers = new Set(list.map((r) => r.whatsapp_user_id)).size;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const hourly = Array.from({ length: 24 }, () => 0);
    for (const m of list) {
      const d = new Date(m.occurred_at);
      if (d >= todayStart) hourly[d.getHours()] += 1;
    }
    const peakCount = Math.max(...hourly);
    const peakHour = peakCount > 0 ? hourly.indexOf(peakCount) : null;
    return { totalQueries, uniqueUsers, peakHour, peakCount, hourlyToday: hourly };
  });

export const waQueryVolume = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(rangeValidator)
  .handler(async ({ data }) => {
    const { from, to, bucket } = computeWindow(data);
    const rows = await models.wa_chat_logs.findAll({
      attributes: ["occurred_at"],
      where: {
        occurred_at: {
          [Op.gte]: from.toISOString(),
          [Op.lte]: to.toISOString()
        }
      }
    });
    const counts = new Map<string, number>();
    const stepMs = bucket === "week" ? 7 * 86400_000 : 86400_000;
    for (let t = from.getTime(); t <= to.getTime(); t += stepMs) counts.set(bucketKey(new Date(t), bucket), 0);
    for (const m of rows) {
      const k = bucketKey(new Date(m.occurred_at as any), bucket);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
  });

export const waTopUsers = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(rangeValidator)
  .handler(async ({ data }) => {
    const { from, to } = computeWindow(data);
    const rows = await models.wa_chat_logs.findAll({
      attributes: ["whatsapp_user_id", "occurred_at"],
      where: {
        occurred_at: {
          [Op.gte]: from.toISOString(),
          [Op.lte]: to.toISOString()
        }
      }
    });
    const map = new Map<string, { phone: string; messages: number; last_seen: string }>();
    for (const rw of rows) {
      const r = rw.get({ plain: true });
      const cur = map.get(r.whatsapp_user_id) ?? { phone: r.whatsapp_user_id, messages: 0, last_seen: String(r.occurred_at) };
      cur.messages += 1;
      if (r.occurred_at > cur.last_seen) cur.last_seen = r.occurred_at;
      map.set(r.whatsapp_user_id, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.messages - a.messages).slice(0, 50);
  });

const convoValidator = (d: { range: "30d" | "12w" | "custom"; from?: string; to?: string; search?: string; limit?: number; offset?: number }) =>
  z.object({
    range: z.enum(["30d", "12w", "custom"]),
    from: z.string().optional(),
    to: z.string().optional(),
    search: z.string().optional(),
    limit: z.number().int().min(1).max(200).optional(),
    offset: z.number().int().min(0).optional(),
  }).parse(d);

export const waRecentConversations = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(convoValidator)
  .handler(async ({ data }) => {
    const { from, to } = computeWindow(data);
    const limit = data.limit ?? 50;
    const offset = data.offset ?? 0;
    
    const where: any = {
      occurred_at: {
        [Op.gte]: from.toISOString(),
        [Op.lte]: to.toISOString()
      }
    };

    if (data.search && data.search.trim()) {
      const s = `%${data.search.trim().replace(/[%,]/g, "")}%`;
      where[Op.or] = [
        { whatsapp_user_id: { [Op.iLike]: s } },
        { user_message: { [Op.iLike]: s } },
        { bot_response: { [Op.iLike]: s } },
        { intent: { [Op.iLike]: s } }
      ];
    }
    
    const { rows, count } = await models.wa_chat_logs.findAndCountAll({
      attributes: ["id", "whatsapp_user_id", "user_locale", "user_message", "bot_response", "intent", "occurred_at"],
      where,
      order: [["occurred_at", "DESC"]],
      limit,
      offset
    });
    
    return { rows: rows.map(r => r.get({ plain: true })), total: count };
  });

const VIN_RE = /\b[A-HJ-NPR-Z0-9]{17}\b/i;
const PART_LABEL_RE = /(?:part\s*(?:number|no\.?|#)|oem\s*(?:number|no\.?|#))\s*[:*\- ]+([A-Z0-9][A-Z0-9 \-]{3,})/i;
const PART_RE_GROUPED = /\b\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}\b/;
const PART_RE_LONGDIGITS = /\b\d{10,13}\b/;
const PART_RE_SKU = /\b[A-Z]{2,}\d{3,}[A-Z0-9-]*\b/;
const STOPWORDS = new Set([
  "hi", "hello", "hey", "ok", "okay", "yes", "no", "thanks", "thank", "please",
  "namaste", "bonjour", "salam", "system", "user", "bot", "the", "and", "for",
  "text", "transcribed", "transcription", "vehicle", "passenger", "filter",
  "nozzle", "oil", "air", "brake", "pads", "engine", "chassis", "make", "model",
  "year", "front", "rear", "kg", "lbs", "available", "options", "stock", "price",
  "brand", "quantity", "part", "number", "oem",
]);

function cleanAnalyticsValue(value?: string | null): string | undefined {
  let cleaned = (value ?? "")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  // stop at end-of-line markers or "Availability"
  cleaned = cleaned.split(/\s*(?:availability|brand|price|quantity)\b/i)[0]?.trim() ?? cleaned;
  cleaned = cleaned.replace(/[.,;:|/]+$/g, "").toUpperCase();
  if (!cleaned || STOPWORDS.has(cleaned.toLowerCase())) return undefined;
  if (cleaned.length < 4) return undefined;
  return cleaned;
}

function extractPartFromText(userMsg?: string | null, botResp?: string | null): string | undefined {
  // Prioritize bot_response (canonical answer), then user_message.
  const sources = [botResp ?? "", userMsg ?? ""];
  for (const src of sources) {
    const labeled = src.match(PART_LABEL_RE);
    if (labeled?.[1]) {
      const v = cleanAnalyticsValue(labeled[1]);
      if (v) return v;
    }
  }
  for (const src of sources) {
    const g = src.match(PART_RE_GROUPED);
    if (g) { const v = cleanAnalyticsValue(g[0]); if (v) return v; }
  }
  for (const src of sources) {
    const d = src.match(PART_RE_LONGDIGITS);
    if (d) { const v = cleanAnalyticsValue(d[0]); if (v) return v; }
  }
  for (const src of sources) {
    const s = src.match(PART_RE_SKU);
    if (s) { const v = cleanAnalyticsValue(s[0]); if (v) return v; }
  }
  return undefined;
}

function extractVinFromText(userMsg?: string | null, botResp?: string | null): string | undefined {
  const m = `${userMsg ?? ""}\n${botResp ?? ""}`.match(VIN_RE);
  return m?.[0]?.toUpperCase();
}

function eventDataStrings(data: unknown): string[] {
  if (!data) return [];
  if (typeof data === "string") return [data];
  if (typeof data !== "object") return [];
  const out: string[] = [];
  for (const value of Object.values(data as Record<string, unknown>)) {
    if (typeof value === "string") out.push(value);
    else if (value && typeof value === "object") out.push(...eventDataStrings(value));
  }
  return out;
}


export const waEventStats = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(rangeValidator)
  .handler(async ({ data }) => {
    const { from, to, bucket } = computeWindow(data);
    const [evRes, logRes] = await Promise.all([
      models.wa_analytics_events.findAll({
        attributes: ["event_type", "event_data", "occurred_at", "whatsapp_user_id"],
        where: {
          occurred_at: {
            [Op.gte]: from.toISOString(),
            [Op.lte]: to.toISOString()
          }
        }
      }),
      models.wa_chat_logs.findAll({
        attributes: ["whatsapp_user_id", "user_message", "bot_response", "occurred_at"],
        where: {
          occurred_at: {
            [Op.gte]: new Date(from.getTime() - 5 * 60_000).toISOString(),
            [Op.lte]: new Date(to.getTime() + 5 * 60_000).toISOString()
          }
        }
      }),
    ]);

    const list = evRes.map(r => r.get({ plain: true }));
    const logs = logRes.map(r => r.get({ plain: true }));
    // Index chat logs by whatsapp_user_id with timestamps for nearest-match lookup.
    const logIdx = new Map<string, Array<{ t: number; user: string; bot: string }>>();
    for (const l of logs) {
      const arr = logIdx.get(l.whatsapp_user_id) ?? [];
      arr.push({ t: new Date(l.occurred_at).getTime(), user: l.user_message ?? "", bot: l.bot_response ?? "" });
      logIdx.set(l.whatsapp_user_id, arr);
    }
    const findNearestLog = (uid: string, atIso: string) => {
      const arr = logIdx.get(uid);
      if (!arr?.length) return null;
      const t = new Date(atIso).getTime();
      let best = arr[0]; let bestD = Math.abs(arr[0].t - t);
      for (const a of arr) {
        const d = Math.abs(a.t - t);
        if (d < bestD) { best = a; bestD = d; }
      }
      return bestD <= 5 * 60_000 ? best : best; // prefer ≤5min but fall back to closest in window
    };

    const vinList = list.filter((r) => r.event_type === "vin_search");
    const partList = list.filter((r) => r.event_type === "part_search");

    const seedTrend = () => {
      const counts = new Map<string, number>();
      const stepMs = bucket === "week" ? 7 * 86400_000 : 86400_000;
      for (let t = from.getTime(); t <= to.getTime(); t += stepMs) counts.set(bucketKey(new Date(t), bucket), 0);
      return counts;
    };
    const fillTrend = (items: any[]) => {
      const c = seedTrend();
      for (const r of items) {
        const k = bucketKey(new Date(r.occurred_at), bucket);
        c.set(k, (c.get(k) ?? 0) + 1);
      }
      return Array.from(c.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
    };

    const PART_KEYS = ["part_number", "partNumber", "part", "oem", "query", "q", "search", "text", "message", "keyword"];
    const VIN_KEYS = ["vin", "VIN", "query", "q", "text", "message"];

    const resolveValue = (
      r: any,
      keys: string[],
      extractFromRaw: (raw?: string | null) => string | undefined,
      fallback: (l: { user: string; bot: string } | null) => string | undefined,
    ): string | undefined => {
      const ed = (r.event_data ?? {}) as Record<string, unknown>;
      for (const k of keys) {
        const raw = ed[k];
        if (typeof raw === "string" && raw.trim()) {
          const extracted = extractFromRaw(raw);
          if (extracted) return extracted;
        }
      }
      for (const raw of eventDataStrings(ed)) {
        const extracted = extractFromRaw(raw);
        if (extracted) return extracted;
      }
      const log = findNearestLog(r.whatsapp_user_id, r.occurred_at);
      return fallback(log);
    };

    const aggregate = (items: any[], resolver: (r: any) => string | undefined) => {
      const m = new Map<string, number>();
      for (const r of items) {
        const v = resolver(r);
        if (!v) continue;
        m.set(v, (m.get(v) ?? 0) + 1);
      }
      return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([value, count]) => ({ value, count }));
    };

    const logTopParts = aggregate(logs.filter((l) => new Date(l.occurred_at) >= from && new Date(l.occurred_at) <= to), (l) => extractPartFromText(l.user_message, l.bot_response));
    const logTopVins = aggregate(logs.filter((l) => new Date(l.occurred_at) >= from && new Date(l.occurred_at) <= to), (l) => extractVinFromText(l.user_message, l.bot_response));
    const eventTopParts = aggregate(partList, (r) => resolveValue(r, PART_KEYS, (raw) => extractPartFromText(raw, raw), (l) => extractPartFromText(l?.user, l?.bot)));
    const eventTopVins = aggregate(vinList, (r) => resolveValue(r, VIN_KEYS, (raw) => extractVinFromText(raw, raw), (l) => extractVinFromText(l?.user, l?.bot)));

    // Build per-day log-derived counts for parts/vins so trends reflect
    // actual extractions (events are often empty `{}`).
    const partLogMatches = logs.filter((l) => {
      const d = new Date(l.occurred_at);
      return d >= from && d <= to && !!extractPartFromText(l.user_message, l.bot_response);
    });
    const vinLogMatches = logs.filter((l) => {
      const d = new Date(l.occurred_at);
      return d >= from && d <= to && !!extractVinFromText(l.user_message, l.bot_response);
    });
    const mergeTrend = (a: { date: string; value: number }[], b: { date: string; value: number }[]) => {
      const m = new Map<string, number>();
      for (const r of a) m.set(r.date, Math.max(m.get(r.date) ?? 0, r.value));
      for (const r of b) m.set(r.date, Math.max(m.get(r.date) ?? 0, r.value));
      return Array.from(m.entries()).sort(([x], [y]) => x.localeCompare(y)).map(([date, value]) => ({ date, value }));
    };

    return {
      vinSearches: Math.max(vinList.length, vinLogMatches.length),
      partSearches: Math.max(partList.length, partLogMatches.length),
      vinTrend: mergeTrend(fillTrend(vinList), fillTrend(vinLogMatches)),
      partTrend: mergeTrend(fillTrend(partList), fillTrend(partLogMatches)),
      topVins: logTopVins.length ? logTopVins : eventTopVins,
      // Prefer chat-log extraction for parts because many WhatsApp bots send `{}`
      // in analytics events while the exact part number is present in the saved conversation.
      topParts: logTopParts.length ? logTopParts : eventTopParts,
    };
  });


const exportValidator = (d: { range: "30d" | "12w" | "custom"; from?: string; to?: string; type: "chat_logs" | "events" }) =>
  z.object({
    range: z.enum(["30d", "12w", "custom"]),
    from: z.string().optional(),
    to: z.string().optional(),
    type: z.enum(["chat_logs", "events"]),
  }).parse(d);

const csvEscape = (v: unknown) => {
  const s = v == null ? "" : typeof v === "string" ? v : JSON.stringify(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const waExportCsv = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(exportValidator)
  .handler(async ({ data }) => {
    const { from, to } = computeWindow(data);
    if (data.type === "chat_logs") {
      const rows = await models.wa_chat_logs.findAll({
        attributes: ["occurred_at", "whatsapp_user_id", "user_locale", "intent", "user_message", "bot_response"],
        where: {
          occurred_at: {
            [Op.gte]: from.toISOString(),
            [Op.lte]: to.toISOString()
          }
        },
        order: [["occurred_at", "DESC"]],
        limit: 10000
      });
      const dRows = rows.map(r => r.get({ plain: true }));
      const header = ["occurred_at", "whatsapp_user_id", "user_locale", "intent", "user_message", "bot_response"];
      const csv = [header.join(","), ...dRows.map((r) => header.map((h) => csvEscape(r[h])).join(","))].join("\n");
      return { csv, filename: `whatsapp-chat-logs-${data.range}.csv` };
    }
    
    const rows = await models.wa_analytics_events.findAll({
      attributes: ["occurred_at", "whatsapp_user_id", "event_type", "event_data"],
      where: {
        occurred_at: {
          [Op.gte]: from.toISOString(),
          [Op.lte]: to.toISOString()
        }
      },
      order: [["occurred_at", "DESC"]],
      limit: 10000
    });
    const dRows = rows.map(r => r.get({ plain: true }));
    const header = ["occurred_at", "whatsapp_user_id", "event_type", "event_data"];
    const csv = [header.join(","), ...dRows.map((r) => header.map((h) => csvEscape(r[h])).join(","))].join("\n");
    return { csv, filename: `whatsapp-events-${data.range}.csv` };
  });

