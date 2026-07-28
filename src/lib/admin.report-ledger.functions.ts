import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "./admin.functions";
import { models } from "@/lib/db/index.server";
import { Op } from "@/lib/db/op.server";

type BaseInput = {
  from: string;
  to: string;
  page?: number;
  pageSize?: number;
  exportAll?: boolean;
  q?: string;
  payment_method?: string;
  status?: string;
  customer_type?: string;
  city?: string;
  age?: string;
  created_by?: string;
  subtab?: string;
  ab_status?: string;
};

const DEFAULT_PAGE = 25;
const EXPORT_CAP = 50000;

function pageRange(input: BaseInput) {
  if (input.exportAll) return { from: 0, to: EXPORT_CAP - 1, pageSize: EXPORT_CAP };
  const pageSize = input.pageSize ?? DEFAULT_PAGE;
  const page = Math.max(1, input.page ?? 1);
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1, pageSize };
}

async function nameMap(userIds: string[]) {
  if (userIds.length === 0) return {} as Record<string, { full_name: string | null; customer_type: string | null; phone: string | null; company_name: string | null }>;
  const rows = await models.profiles.findAll({
    attributes: ["id", "full_name", "customer_type", "phone", "company_name"],
    where: { id: { [Op.in]: userIds } }
  });
  const out: Record<string, any> = {};
  rows.forEach(p => { out[p.id] = p.get({ plain: true }); });
  return out;
}

async function itemCountMap(orderIds: string[]) {
  if (orderIds.length === 0) return {} as Record<string, number>;
  const rows = await models.order_items.findAll({
    attributes: ["order_id"],
    where: { order_id: { [Op.in]: orderIds } }
  });
  const map: Record<string, number> = {};
  rows.forEach(r => { map[r.order_id] = (map[r.order_id] ?? 0) + 1; });
  return map;
}

/* ===== TAB 1: SALES LEDGER ===== */
export const reportSalesLedger = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: BaseInput) => d)
  .handler(async ({ data }) => {
    const { from } = pageRange(data);

    // KPI aggregate (all rows in range excluding cancelled)
    const aggRows = await models.orders.findAll({
      attributes: ["subtotal", "total", "vat", "discount", "shipping_fee", "status"],
      where: {
        created_at: { [Op.gte]: data.from, [Op.lte]: data.to },
        status: { [Op.ne]: "cancelled" }
      }
    });
    
    const kpis = { orders: 0, gross: 0, net: 0, vat: 0, discount: 0, shipping: 0 };
    for (const row of aggRows) {
      const r = row.get({ plain: true });
      kpis.orders++;
      kpis.gross += Number(r.subtotal ?? 0);
      kpis.net += Number(r.total ?? 0);
      kpis.vat += Number(r.vat ?? 0);
      kpis.discount += Number(r.discount ?? 0);
      kpis.shipping += Number(r.shipping_fee ?? 0);
    }

    // Rows
    const w: any = {
      created_at: { [Op.gte]: data.from, [Op.lte]: data.to }
    };
    if (data.payment_method && data.payment_method !== "all") w.payment_method = data.payment_method;
    if (data.status && data.status !== "all") w.status = data.status;
    if (data.customer_type && data.customer_type !== "all") w.customer_type = data.customer_type;
    if (data.q && data.q.trim()) w.order_number = { [Op.iLike]: `%${data.q.trim()}%` };

    const { rows: pagedRows, count } = await models.orders.findAndCountAll({
      attributes: ["id", "order_number", "created_at", "user_id", "subtotal", "discount", "shipping_fee", "vat", "total", "payment_method", "status", "customer_type"],
      where: w,
      order: [["created_at", "DESC"]],
      limit: data.exportAll ? EXPORT_CAP : data.pageSize ?? DEFAULT_PAGE,
      offset: from
    });
    const rows = pagedRows.map(r => r.get({ plain: true }));

    const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));
    const orderIds = rows.map((r: any) => r.id);
    const [profiles, items] = await Promise.all([nameMap(userIds), itemCountMap(orderIds)]);

    const enriched = rows.map((r: any) => ({
      ...r,
      customer_name: profiles[r.user_id]?.full_name ?? profiles[r.user_id]?.company_name ?? "—",
      customer_type: r.customer_type ?? profiles[r.user_id]?.customer_type ?? null,
      item_count: items[r.id] ?? 0,
    }));

    const filtered = data.q && data.q.trim()
      ? enriched.filter((r) => r.order_number?.toLowerCase().includes(data.q!.toLowerCase()) || r.customer_name?.toLowerCase().includes(data.q!.toLowerCase()))
      : enriched;

    return { rows: filtered, total: count, kpis };
  });

/* ===== TAB 2: QUOTATIONS ===== */
export const reportQuotations = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: BaseInput) => d)
  .handler(async ({ data }) => {
    const { from } = pageRange(data);

    // KPI + funnel
    const aggRows = await models.quotations.findAll({
      attributes: ["status", "grand_total"],
      where: { created_at: { [Op.gte]: data.from, [Op.lte]: data.to } }
    });
    const funnel: Record<string, number> = { draft: 0, sent: 0, approved: 0, converted: 0, rejected: 0, expired: 0 };
    let quotedValue = 0, totalCount = 0;
    for (const row of aggRows) {
      const r = row.get({ plain: true });
      totalCount++;
      quotedValue += Number(r.grand_total ?? 0);
      if (funnel[r.status] !== undefined) funnel[r.status]++;
    }
    const kpis = {
      total: totalCount,
      quotedValue,
      approved: funnel.approved,
      converted: funnel.converted,
      rejectedExpired: funnel.rejected + funnel.expired,
    };

    const w: any = { created_at: { [Op.gte]: data.from, [Op.lte]: data.to } };
    if (data.status && data.status !== "all") w.status = data.status;
    if (data.created_by && data.created_by !== "all") w.created_by = data.created_by;
    if (data.q && data.q.trim()) w.quotation_number = { [Op.iLike]: `%${data.q.trim()}%` };

    const { rows: pagedRows, count } = await models.quotations.findAndCountAll({
      attributes: ["id", "quotation_number", "created_at", "customer_id", "grand_total", "discount_amount", "valid_until", "created_by", "status", "converted_order_id"],
      where: w,
      order: [["created_at", "DESC"]],
      limit: data.exportAll ? EXPORT_CAP : data.pageSize ?? DEFAULT_PAGE,
      offset: from
    });
    const rows = pagedRows.map(r => r.get({ plain: true }));

    const custIds = Array.from(new Set(rows.map((r: any) => r.customer_id).filter(Boolean)));
    const orderIds = Array.from(new Set(rows.map((r: any) => r.converted_order_id).filter(Boolean)));
    const qIds = rows.map((r: any) => r.id);
    const creatorIds = Array.from(new Set(rows.map((r: any) => r.created_by).filter(Boolean)));

    const [profiles, orderNums, itemCounts, creators] = await Promise.all([
      nameMap(custIds),
      orderIds.length
        ? models.orders.findAll({ attributes: ["id", "order_number"], where: { id: { [Op.in]: orderIds } } }).then(r => {
            const m: Record<string, string> = {};
            r.forEach(o => { m[o.id] = o.order_number; });
            return m;
          })
        : Promise.resolve({} as Record<string, string>),
      qIds.length
        ? models.quotation_items.findAll({ attributes: ["quotation_id"], where: { quotation_id: { [Op.in]: qIds } } }).then(r => {
            const m: Record<string, number> = {};
            r.forEach(it => { m[it.quotation_id] = (m[it.quotation_id] ?? 0) + 1; });
            return m;
          })
        : Promise.resolve({} as Record<string, number>),
      creatorIds.length
        ? models.salesmen.findAll({ attributes: ["user_id", "full_name"], where: { user_id: { [Op.in]: creatorIds } } }).then(r => {
            const m: Record<string, string> = {};
            r.forEach(s => { m[s.user_id] = s.full_name; });
            return m;
          })
        : Promise.resolve({} as Record<string, string>),
    ]);

    const enriched = rows.map((r: any) => ({
      ...r,
      customer_name: profiles[r.customer_id]?.full_name ?? profiles[r.customer_id]?.company_name ?? "—",
      customer_type: profiles[r.customer_id]?.customer_type ?? null,
      item_count: itemCounts[r.id] ?? 0,
      created_by_name: creators[r.created_by] ?? "—",
      converted_order_number: orderNums[r.converted_order_id] ?? null,
      days_open: Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000),
    }));

    const filtered = data.customer_type && data.customer_type !== "all"
      ? enriched.filter((r) => r.customer_type === data.customer_type)
      : enriched;

    return { rows: filtered, total: count, kpis, funnel };
  });

/* ===== TAB 3: FULFILLMENT ===== */
export const reportFulfillment = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: BaseInput) => d)
  .handler(async ({ data }) => {
    const { from } = pageRange(data);

    // KPIs from all orders in range
    const aggRows = await models.orders.findAll({
      attributes: ["status", "created_at", "shipped_at", "delivered_at", "shipping_address"],
      where: { created_at: { [Op.gte]: data.from, [Op.lte]: data.to } }
    });
    let pending = 0, shippedToday = 0, delivered = 0, totalShipped = 0;
    let procDaysSum = 0, procDaysN = 0;
    const cities: Record<string, number> = {};
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    for (const row of aggRows) {
      const r = row.get({ plain: true });
      if (r.status === "placed" || r.status === "confirmed") pending++;
      if (r.shipped_at) {
        totalShipped++;
        if (new Date(r.shipped_at) >= startToday) shippedToday++;
        const d = (new Date(r.shipped_at).getTime() - new Date(r.created_at).getTime()) / 86400000;
        if (d >= 0) { procDaysSum += d; procDaysN++; }
      }
      if (r.status === "delivered") delivered++;
      const city = (r.shipping_address as any)?.city ?? (r.shipping_address as any)?.emirate ?? "Unknown";
      cities[city] = (cities[city] ?? 0) + 1;
    }
    const kpis = {
      pending,
      avgProcessingDays: procDaysN ? procDaysSum / procDaysN : 0,
      shippedToday,
      deliverySuccessRate: totalShipped ? (delivered / totalShipped) * 100 : 0,
    };
    const ordersByCity = Object.entries(cities).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count);

    // Rows
    const w: any = { created_at: { [Op.gte]: data.from, [Op.lte]: data.to } };
    if (data.status && data.status !== "all") w.status = data.status;
    if (data.payment_method && data.payment_method !== "all") w.payment_method = data.payment_method;

    const { rows: pagedRows, count } = await models.orders.findAndCountAll({
      attributes: ["id", "order_number", "created_at", "user_id", "total", "payment_method", "status", "shipping_address", "notes", "shipped_at"],
      where: w,
      order: [["created_at", "DESC"]],
      limit: data.exportAll ? EXPORT_CAP : data.pageSize ?? DEFAULT_PAGE,
      offset: from
    });
    const rows = pagedRows.map(r => r.get({ plain: true }));

    const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));
    const orderIds = rows.map((r: any) => r.id);
    const [profiles, items] = await Promise.all([nameMap(userIds), itemCountMap(orderIds)]);

    let enriched = rows.map((r: any) => {
      const age = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000);
      return {
        ...r,
        customer_name: profiles[r.user_id]?.full_name ?? profiles[r.user_id]?.company_name ?? "—",
        city: (r.shipping_address as any)?.city ?? (r.shipping_address as any)?.emirate ?? "—",
        item_count: items[r.id] ?? 0,
        age_days: age,
      };
    });

    if (data.city && data.city !== "all") enriched = enriched.filter((r) => r.city === data.city);
    if (data.age && data.age !== "all") {
      enriched = enriched.filter((r) => {
        if (data.age === "lt3") return r.age_days < 3;
        if (data.age === "3to7") return r.age_days >= 3 && r.age_days <= 7;
        if (data.age === "gt7") return r.age_days > 7;
        return true;
      });
    }

    return { rows: enriched, total: count, kpis, ordersByCity };
  });

/* ===== TAB 4: CREDIT ===== */
export const reportCredit = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: BaseInput) => d)
  .handler(async ({ data }) => {
    const subtab = data.subtab ?? "transactions";
    const { from } = pageRange(data);

    // KPIs
    const [walletsAgg, paymentsAgg, stmtsAgg] = await Promise.all([
      models.credit_wallets.findAll({ attributes: ["credit_limit", "available_balance", "is_active"] }),
      models.credit_payments.findAll({ attributes: ["amount"], where: { payment_date: { [Op.gte]: data.from.slice(0, 10), [Op.lte]: data.to.slice(0, 10) } } }),
      models.credit_billing_statements.findAll({ attributes: ["outstanding_amount", "amount_paid", "due_date", "status"] }),
    ]);
    let extended = 0, outstanding = 0;
    for (const row of walletsAgg) {
      const w = row.get({ plain: true });
      if (!w.is_active) continue;
      extended += Number(w.credit_limit ?? 0);
      outstanding += Number(w.credit_limit ?? 0) - Number(w.available_balance ?? 0);
    }
    const paymentsReceived = paymentsAgg.reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const aging = { current: 0, d30: 0, d60: 0, d60plus: 0 };
    let overdueCount = 0;
    for (const row of stmtsAgg) {
      const s = row.get({ plain: true });
      if (s.status === "paid") continue;
      const remaining = Number(s.outstanding_amount ?? 0) - Number(s.amount_paid ?? 0);
      if (remaining <= 0) continue;
      const dueDays = Math.floor((today.getTime() - new Date(s.due_date).getTime()) / 86400000);
      if (dueDays <= 0) aging.current += remaining;
      else if (dueDays <= 30) { aging.d30 += remaining; overdueCount++; }
      else if (dueDays <= 60) { aging.d60 += remaining; overdueCount++; }
      else { aging.d60plus += remaining; overdueCount++; }
    }
    const kpis = { extended, outstanding, paymentsReceived, overdueCount };

    if (subtab === "transactions") {
      const { rows: pagedRows, count } = await models.credit_transactions.findAndCountAll({
        attributes: ["id", "created_at", "user_id", "type", "amount", "balance_after", "reason", "remarks", "order_id", "updated_by_name"],
        where: { created_at: { [Op.gte]: data.from, [Op.lte]: data.to } },
        order: [["created_at", "DESC"]],
        limit: data.exportAll ? EXPORT_CAP : data.pageSize ?? DEFAULT_PAGE,
        offset: from
      });
      const rows = pagedRows.map(r => r.get({ plain: true }));
      const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));
      const orderIds = Array.from(new Set(rows.map((r: any) => r.order_id).filter(Boolean)));
      const [profiles, orderMap] = await Promise.all([
        nameMap(userIds),
        orderIds.length
          ? models.orders.findAll({ attributes: ["id", "order_number"], where: { id: { [Op.in]: orderIds } } }).then(r => {
              const m: Record<string, string> = {};
              r.forEach(o => { m[o.id] = o.order_number; });
              return m;
            })
          : Promise.resolve({} as Record<string, string>),
      ]);
      const enriched = rows.map((r: any) => ({
        ...r,
        customer_name: profiles[r.user_id]?.full_name ?? profiles[r.user_id]?.company_name ?? "—",
        order_number: orderMap[r.order_id] ?? null,
      }));
      return { rows: enriched, total: count, kpis, aging, subtab };
    }

    if (subtab === "payments") {
      const { rows: pagedRows, count } = await models.credit_payments.findAndCountAll({
        attributes: ["id", "payment_date", "user_id", "amount", "payment_method", "payment_reference", "statement_id", "recorded_by_name", "notes"],
        where: { payment_date: { [Op.gte]: data.from.slice(0, 10), [Op.lte]: data.to.slice(0, 10) } },
        order: [["payment_date", "DESC"]],
        limit: data.exportAll ? EXPORT_CAP : data.pageSize ?? DEFAULT_PAGE,
        offset: from
      });
      const rows = pagedRows.map(r => r.get({ plain: true }));
      const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));
      const stmtIds = Array.from(new Set(rows.map((r: any) => r.statement_id).filter(Boolean)));
      const [profiles, stmtMap] = await Promise.all([
        nameMap(userIds),
        stmtIds.length
          ? models.credit_billing_statements.findAll({ attributes: ["id", "statement_number"], where: { id: { [Op.in]: stmtIds } } }).then(r => {
              const m: Record<string, string> = {};
              r.forEach(s => { m[s.id] = s.statement_number; });
              return m;
            })
          : Promise.resolve({} as Record<string, string>),
      ]);
      const enriched = rows.map((r: any) => ({
        ...r,
        customer_name: profiles[r.user_id]?.full_name ?? profiles[r.user_id]?.company_name ?? "—",
        statement_number: stmtMap[r.statement_id] ?? null,
      }));
      return { rows: enriched, total: count, kpis, aging, subtab };
    }

    // statements
    const { rows: pagedRows, count } = await models.credit_billing_statements.findAndCountAll({
      attributes: ["id", "statement_number", "user_id", "period_start", "period_end", "outstanding_amount", "amount_paid", "due_date", "status"],
      where: { created_at: { [Op.gte]: data.from, [Op.lte]: data.to } },
      order: [["period_end", "DESC"]],
      limit: data.exportAll ? EXPORT_CAP : data.pageSize ?? DEFAULT_PAGE,
      offset: from
    });
    const rows = pagedRows.map(r => r.get({ plain: true }));
    const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));
    const profiles = await nameMap(userIds);
    const enriched = rows.map((r: any) => ({
      ...r,
      customer_name: profiles[r.user_id]?.full_name ?? profiles[r.user_id]?.company_name ?? "—",
    }));
    return { rows: enriched, total: count, kpis, aging, subtab };
  });

/* ===== TAB 5: CART ABANDONMENT ===== */
export const reportCartAbandonment = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: BaseInput) => d)
  .handler(async ({ data }) => {
    // Get all cart items with parts
    const cartRowsDb = await models.cart_items.findAll({
      attributes: ["user_id", "part_id", "quantity", "added_at"]
    });
    const cartRows = cartRowsDb.map(r => r.get({ plain: true }));

    const userIds = Array.from(new Set(cartRows.map((r: any) => r.user_id)));
    const partIds = Array.from(new Set(cartRows.map((r: any) => r.part_id)));
    if (userIds.length === 0) {
      return { rows: [], total: 0, kpis: { activeCarts: 0, abandonedValue: 0, abandonmentRate: 0, recoverable: 0 }, topProducts: [] };
    }

    const [partsDb, ordersDb, profiles] = await Promise.all([
      models.parts.findAll({ attributes: ["id", "part_number", "name", "manufacturer", "price", "stock"], where: { id: { [Op.in]: partIds } } }),
      models.orders.findAll({ attributes: ["user_id", "created_at"], where: { user_id: { [Op.in]: userIds } }, order: [["created_at", "DESC"]] }),
      nameMap(userIds),
    ]);
    const parts = partsDb.map(p => p.get({ plain: true }));
    const orders = ordersDb.map(o => o.get({ plain: true }));

    const partMap: Record<string, any> = {};
    parts.forEach((p: any) => { partMap[p.id] = p; });

    const lastOrder: Record<string, string> = {};
    for (const o of orders) {
      if (!lastOrder[o.user_id]) lastOrder[o.user_id] = o.created_at;
    }

    const cutoff7 = Date.now() - 7 * 86400000;
    // Per-user aggregation (abandoned = latest cart activity but no order in last 7 days)
    const perUser: Record<string, { items: number; value: number; lastActivity: number }> = {};
    for (const c of cartRows) {
      const p = partMap[c.part_id];
      if (!p) continue;
      perUser[c.user_id] ??= { items: 0, value: 0, lastActivity: 0 };
      perUser[c.user_id].items += c.quantity;
      perUser[c.user_id].value += Number(p.price ?? 0) * c.quantity;
      const ts = new Date(c.added_at).getTime();
      if (ts > perUser[c.user_id].lastActivity) perUser[c.user_id].lastActivity = ts;
    }

    const totalWithCart = Object.keys(perUser).length;
    let userRows = Object.entries(perUser).map(([uid, v]) => {
      const lastOrderTs = lastOrder[uid] ? new Date(lastOrder[uid]).getTime() : 0;
      const abandoned = !lastOrderTs || lastOrderTs < cutoff7;
      const hoursSince = (Date.now() - v.lastActivity) / 3600000;
      const status = hoursSince < 24 ? "hot" : hoursSince < 72 ? "warm" : "cold";
      const p = profiles[uid];
      return {
        user_id: uid,
        customer_name: p?.full_name ?? p?.company_name ?? "—",
        phone: p?.phone ?? "—",
        customer_type: p?.customer_type ?? null,
        item_count: v.items,
        cart_value: v.value,
        last_activity: new Date(v.lastActivity).toISOString(),
        last_order: lastOrder[uid] ?? null,
        status,
        abandoned,
      };
    }).filter((r) => r.abandoned);

    if (data.ab_status && data.ab_status !== "all") userRows = userRows.filter((r) => r.status === data.ab_status);
    if (data.customer_type && data.customer_type !== "all") userRows = userRows.filter((r) => r.customer_type === data.customer_type);
    if (data.q && data.q.trim()) {
      const s = data.q.toLowerCase();
      userRows = userRows.filter((r) => r.customer_name.toLowerCase().includes(s));
    }
    userRows.sort((a, b) => b.cart_value - a.cart_value);

    const abandonedValue = userRows.reduce((s, r) => s + r.cart_value, 0);
    const kpis = {
      activeCarts: userRows.length,
      abandonedValue,
      abandonmentRate: totalWithCart ? (userRows.length / totalWithCart) * 100 : 0,
      recoverable: abandonedValue * 0.3,
    };

    // Top abandoned products (only across abandoned users)
    const abandonedUserSet = new Set(userRows.map((r) => r.user_id));
    const prodAgg: Record<string, { count: number; value: number }> = {};
    for (const c of cartRows) {
      if (!abandonedUserSet.has(c.user_id)) continue;
      const p = partMap[c.part_id];
      if (!p) continue;
      prodAgg[c.part_id] ??= { count: 0, value: 0 };
      prodAgg[c.part_id].count += c.quantity;
      prodAgg[c.part_id].value += Number(p.price ?? 0) * c.quantity;
    }
    const topProducts = Object.entries(prodAgg).map(([id, v]) => {
      const p = partMap[id];
      return {
        part_id: id,
        part_number: p?.part_number ?? "—",
        name: p?.name ?? "—",
        manufacturer: p?.manufacturer ?? "—",
        count: v.count,
        value: v.value,
        in_stock: Number(p?.stock ?? 0) > 0,
      };
    }).sort((a, b) => b.count - a.count).slice(0, 50);

    // paginate userRows
    const total = userRows.length;
    const pageSize = data.exportAll ? total : (data.pageSize ?? DEFAULT_PAGE);
    const page = Math.max(1, data.page ?? 1);
    const start = data.exportAll ? 0 : (page - 1) * pageSize;
    const paged = data.exportAll ? userRows : userRows.slice(start, start + pageSize);

    return { rows: paged, total, kpis, topProducts };
  });
