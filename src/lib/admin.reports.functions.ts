import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "./admin.functions";
import { models } from "@/lib/db/index.server";
import { Op } from "@/lib/db/op.server";

type Range = { from: string; to: string };
const validRange = (d: any): Range => ({
  from: String(d?.from ?? new Date(Date.now() - 30 * 86400000).toISOString()),
  to: String(d?.to ?? new Date().toISOString()),
});

function bucketKey(iso: string, granularity: "day" | "week" | "month") {
  const d = new Date(iso);
  if (granularity === "day") return d.toISOString().slice(0, 10);
  if (granularity === "month") return d.toISOString().slice(0, 7);
  // week: ISO week start (Mon)
  const day = (d.getUTCDay() + 6) % 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - day);
  return monday.toISOString().slice(0, 10);
}

/* ===== Sales by period ===== */
export const reportSalesByPeriod = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { from?: string; to?: string; granularity?: "day" | "week" | "month" }) => d)
  .handler(async ({ data }) => {
    const r = validRange(data);
    const granularity = data.granularity ?? "day";
    const rows = await models.orders.findAll({
      attributes: ["created_at", "total", "customer_type", "status"],
      where: {
        created_at: { [Op.gte]: r.from, [Op.lte]: r.to },
        status: { [Op.ne]: "cancelled" }
      }
    });

    const buckets: Record<string, { period: string; orders: number; revenue: number; IND: number; GAR: number; EXP: number }> = {};
    for (const row of rows) {
      const o = row.get({ plain: true });
      const k = bucketKey(o.created_at as string, granularity);
      const t = (o.customer_type ?? "IND") as "IND" | "GAR" | "EXP";
      buckets[k] ??= { period: k, orders: 0, revenue: 0, IND: 0, GAR: 0, EXP: 0 };
      buckets[k].orders += 1;
      buckets[k].revenue += Number(o.total ?? 0);
      buckets[k][t] += Number(o.total ?? 0);
    }
    const series = Object.values(buckets).sort((a, b) => a.period.localeCompare(b.period));
    const totals = series.reduce(
      (acc, b) => ({ orders: acc.orders + b.orders, revenue: acc.revenue + b.revenue }),
      { orders: 0, revenue: 0 },
    );
    const aov = totals.orders ? totals.revenue / totals.orders : 0;
    return { series, totals: { ...totals, aov } };
  });

/* ===== Sales by category ===== */
export const reportSalesByCategory = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { from?: string; to?: string }) => d)
  .handler(async ({ data }) => {
    const r = validRange(data);
    const orderRows = await models.orders.findAll({
      attributes: ["id"],
      where: {
        created_at: { [Op.gte]: r.from, [Op.lte]: r.to },
        status: { [Op.ne]: "cancelled" }
      }
    });
    const ids = orderRows.map((o) => o.id);
    if (!ids.length) return [];
    
    const items = await models.order_items.findAll({
      attributes: ["part_id", "quantity", "line_total"],
      where: { order_id: { [Op.in]: ids } }
    });
    
    const partIds = Array.from(new Set(items.map((i) => i.part_id).filter(Boolean))) as string[];
    if (!partIds.length) return [];
    
    const parts = await models.parts.findAll({
      attributes: ["id", "category_id"],
      where: { id: { [Op.in]: partIds } }
    });
    
    const partCat = new Map<string, string | null>(parts.map((p) => [p.id, p.category_id]));
    const catIds = Array.from(new Set(parts.map((p) => p.category_id).filter(Boolean))) as string[];
    
    const cats = await models.categories.findAll({
      attributes: ["id", "name"],
      where: { id: { [Op.in]: catIds } }
    });
    const catName = new Map<string, string>(cats.map((c) => [c.id, c.name]));
    
    const agg = new Map<string, { category: string; qty: number; revenue: number }>();
    for (const row of items) {
      const it = row.get({ plain: true });
      const cid = partCat.get(it.part_id as string) ?? null;
      const key = cid ?? "uncategorized";
      const name = (cid && catName.get(cid)) || "Uncategorized";
      const cur = agg.get(key) ?? { category: name, qty: 0, revenue: 0 };
      cur.qty += Number(it.quantity ?? 0);
      cur.revenue += Number(it.line_total ?? 0);
      agg.set(key, cur);
    }
    return Array.from(agg.values()).sort((a, b) => b.revenue - a.revenue);
  });

/* ===== Sales by brand (manufacturer) ===== */
export const reportSalesByBrand = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { from?: string; to?: string }) => d)
  .handler(async ({ data }) => {
    const r = validRange(data);
    const orderRows = await models.orders.findAll({
      attributes: ["id"],
      where: {
        created_at: { [Op.gte]: r.from, [Op.lte]: r.to },
        status: { [Op.ne]: "cancelled" }
      }
    });
    const ids = orderRows.map((o) => o.id);
    if (!ids.length) return [];
    
    const items = await models.order_items.findAll({
      attributes: ["manufacturer", "quantity", "line_total"],
      where: { order_id: { [Op.in]: ids } }
    });
    
    const agg = new Map<string, { brand: string; qty: number; revenue: number }>();
    for (const row of items) {
      const it = row.get({ plain: true });
      const key = it.manufacturer || "Unknown";
      const cur = agg.get(key) ?? { brand: key, qty: 0, revenue: 0 };
      cur.qty += Number(it.quantity ?? 0);
      cur.revenue += Number(it.line_total ?? 0);
      agg.set(key, cur);
    }
    return Array.from(agg.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 50);
  });

/* ===== Inventory aging / valuation ===== */
export const reportInventoryAging = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const partsStats = await models.parts.findAll({ attributes: ["stock", "low_stock_threshold", "price"] });
    let total_skus = partsStats.length;
    let low = 0;
    let out_ = 0;
    let total_value = 0;
    for (const p of partsStats) {
      const stock = Number(p.stock ?? 0);
      const rp = Number(p.low_stock_threshold ?? 5);
      const price = Number(p.price ?? 0);
      total_value += stock * price;
      if (stock <= 0) out_++;
      else if (stock <= rp) low++;
    }
    const s = { total_skus, low, out_, total_value };

    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const recentOrders = await models.orders.findAll({
      attributes: ["id"],
      where: { created_at: { [Op.gte]: since } }
    });
    const recentIds = recentOrders.map((o) => o.id);
    const soldRecently = new Set<string>();
    if (recentIds.length) {
      const recentItems = await models.order_items.findAll({
        attributes: ["part_id"],
        where: { order_id: { [Op.in]: recentIds } }
      });
      for (const r of recentItems) {
        if (r.part_id) soldRecently.add(r.part_id as string);
      }
    }

    const dead: Array<{ id: string; part_number: string; name: string; stock: number; price: number; value: number }> = [];
    const pageSize = 1000;
    let from = 0;
    for (let i = 0; i < 50; i++) {
      const rows = await models.parts.findAll({
        attributes: ["id", "part_number", "name", "stock", "price"],
        where: { stock: { [Op.gt]: 0 } },
        limit: pageSize,
        offset: from
      });
      if (!rows.length) break;
      for (const row of rows) {
        const p = row.get({ plain: true });
        if (!soldRecently.has(p.id)) {
          const stock = Number(p.stock ?? 0);
          const price = Number(p.price ?? 0);
          dead.push({ id: p.id, part_number: p.part_number, name: p.name, stock, price, value: stock * price });
        }
      }
      if (rows.length < pageSize) break;
      from += pageSize;
    }
    dead.sort((a, b) => b.value - a.value);
    
    return {
      totals: s,
      dead_stock_count: dead.length,
      dead_stock_value: dead.reduce((a, b) => a + b.value, 0),
      dead_stock_sample: dead.slice(0, 50),
    };
  });

/* ===== Customer acquisition ===== */
export const reportCustomerAcquisition = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { from?: string; to?: string }) => d)
  .handler(async ({ data }) => {
    const r = validRange(data);
    const rows = await models.profiles.findAll({
      attributes: ["created_at", "customer_type"],
      where: { created_at: { [Op.gte]: r.from, [Op.lte]: r.to } }
    });
    
    const buckets: Record<string, { period: string; IND: number; GAR: number; EXP: number; total: number }> = {};
    for (const row of rows) {
      const p = row.get({ plain: true });
      const k = bucketKey(p.created_at as string, "month");
      const t = (p.customer_type ?? "IND") as "IND" | "GAR" | "EXP";
      buckets[k] ??= { period: k, IND: 0, GAR: 0, EXP: 0, total: 0 };
      buckets[k][t] += 1;
      buckets[k].total += 1;
    }
    return Object.values(buckets).sort((a, b) => a.period.localeCompare(b.period));
  });

/* ============================================================ */
/* ============= NEW ANALYTICS SECTIONS (6) =================== */
/* ============================================================ */

const SHIPPED_STATUSES = ["delivered", "completed", "shipped"] as const;

/* ---- 1. Revenue Trend ---- */
export const reportRevenueTrend = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { from?: string; to?: string; granularity?: "day" | "week" | "month" }) => d)
  .handler(async ({ data }) => {
    const r = validRange(data);
    const granularity = data.granularity ?? "day";
    const fromMs = new Date(r.from).getTime();
    const toMs = new Date(r.to).getTime();
    const spanMs = Math.max(toMs - fromMs, 86400000);
    const prevFrom = new Date(fromMs - spanMs).toISOString();
    const prevTo = r.from;

    const fetchWindow = async (from: string, to: string) => {
      const rows = await models.orders.findAll({
        attributes: ["created_at", "total", "status"],
        where: {
          created_at: { [Op.gte]: from, [Op.lte]: to },
          status: { [Op.in]: SHIPPED_STATUSES }
        }
      });
      return rows.map(r => r.get({ plain: true }));
    };

    const [curRows, prevRows] = await Promise.all([
      fetchWindow(r.from, r.to),
      fetchWindow(prevFrom, prevTo),
    ]);

    const buckets: Record<string, { period: string; revenue: number; orders: number }> = {};
    for (const o of curRows) {
      const k = bucketKey(o.created_at as string, granularity);
      buckets[k] ??= { period: k, revenue: 0, orders: 0 };
      buckets[k].revenue += Number(o.total ?? 0);
      buckets[k].orders += 1;
    }
    const series = Object.values(buckets).sort((a, b) => a.period.localeCompare(b.period));

    const sum = (rows: typeof curRows) => rows.reduce(
      (acc, o) => ({ revenue: acc.revenue + Number(o.total ?? 0), orders: acc.orders + 1 }),
      { revenue: 0, orders: 0 },
    );
    const cur = sum(curRows);
    const prev = sum(prevRows);
    return {
      series,
      totals: { ...cur, aov: cur.orders ? cur.revenue / cur.orders : 0 },
      previous: { ...prev, aov: prev.orders ? prev.revenue / prev.orders : 0 },
    };
  });

/* ---- 2. Low Stock Alerts ---- */
export const reportLowStockAlerts = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { brandId?: string | null; categoryId?: string | null }) => d)
  .handler(async ({ data }) => {
    const w: any = {
      stock: { [Op.gt]: 0 },
      low_stock_threshold: { [Op.ne]: null }
    };
    if (data.brandId) w.brand_id = data.brandId;
    if (data.categoryId) w.category_id = data.categoryId;
    
    const rows = await models.parts.findAll({
      where: w,
      include: [
        { model: models.brands, as: "brand", attributes: ["name"] },
        { model: models.categories, as: "category", attributes: ["name"] }
      ],
      limit: 2000
    });
    
    const filtered = rows
      .map(r => {
        const plain = r.get({ plain: true });
        return {
          ...plain,
          brands: plain.brand,
          categories: plain.category
        };
      })
      .filter((r: any) => Number(r.stock) < Number(r.low_stock_threshold))
      .map((r: any) => {
        const stock = Number(r.stock ?? 0);
        const threshold = Number(r.low_stock_threshold ?? 0);
        const deficit = threshold - stock;
        const urgency = deficit >= 10 ? "CRITICAL" : deficit >= 5 ? "WARNING" : "LOW";
        return {
          id: r.id,
          part_number: r.part_number,
          oem_number: r.oem_number,
          name: r.name,
          stock,
          threshold,
          deficit,
          urgency,
          brand: r.brands?.name ?? null,
          category: r.categories?.name ?? null,
        };
      })
      .sort((a, b) => b.deficit - a.deficit);

    return {
      rows: filtered,
      totals: {
        totalSkus: filtered.length,
        totalDeficit: filtered.reduce((a, b) => a + b.deficit, 0),
        criticalCount: filtered.filter((r) => r.urgency === "CRITICAL").length,
      },
    };
  });

/* ---- 3. Dead Stock ---- */
export const reportDeadStockAdvanced = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { brandId?: string | null; minDaysIdle?: number }) => d)
  .handler(async ({ data }) => {
    const minDays = Math.max(1, Number(data.minDaysIdle ?? 180));
    const cutoff = new Date(Date.now() - minDays * 86400000).getTime();

    const parts: Array<any> = [];
    const pageSize = 1000;
    
    const w: any = { stock: { [Op.gt]: 0 } };
    if (data.brandId) w.brand_id = data.brandId;
    
    for (let i = 0, from = 0; i < 50; i++, from += pageSize) {
      const rows = await models.parts.findAll({
        attributes: ["id", "part_number", "oem_number", "name", "stock", "price", "brand_id"],
        where: w,
        include: [{ model: models.brands, as: "brand", attributes: ["name"] }],
        limit: pageSize,
        offset: from
      });
      if (!rows.length) break;
      parts.push(...rows.map(r => {
        const p = r.get({ plain: true });
        return { ...p, brands: p.brand };
      }));
      if (rows.length < pageSize) break;
    }

    const partIds = parts.map((p) => p.id);
    const lastSale = new Map<string, string>();
    const chunk = 500;
    for (let i = 0; i < partIds.length; i += chunk) {
      const ids = partIds.slice(i, i + chunk);
      if (!ids.length) break;
      const items = await models.order_items.findAll({
        attributes: ["part_id"],
        where: { part_id: { [Op.in]: ids } },
        include: [{ model: models.orders, as: "order", attributes: ["created_at"] }]
      });
      
      for (const row of items) {
        const it = row.get({ plain: true });
        const pid = it.part_id as string;
        const ts = it.order?.created_at as string | undefined;
        if (!pid || !ts) continue;
        const cur = lastSale.get(pid);
        if (!cur || new Date(ts).getTime() > new Date(cur).getTime()) {
          lastSale.set(pid, ts);
        }
      }
    }

    const now = Date.now();
    const rows = parts
      .map((p) => {
        const last = lastSale.get(p.id) ?? null;
        const lastMs = last ? new Date(last).getTime() : null;
        const daysIdle = lastMs == null ? null : Math.floor((now - lastMs) / 86400000);
        return {
          id: p.id,
          part_number: p.part_number,
          oem_number: p.oem_number,
          name: p.name,
          brand: p.brands?.name ?? null,
          stock: Number(p.stock ?? 0),
          price: Number(p.price ?? 0),
          trappedValue: Number(p.stock ?? 0) * Number(p.price ?? 0),
          lastSaleAt: last,
          daysIdle,
        };
      })
      .filter((r) => r.lastSaleAt == null || (new Date(r.lastSaleAt).getTime() < cutoff))
      .sort((a, b) => {
        if (a.lastSaleAt == null && b.lastSaleAt != null) return -1;
        if (b.lastSaleAt == null && a.lastSaleAt != null) return 1;
        return (b.daysIdle ?? 0) - (a.daysIdle ?? 0);
      });

    const daysList = rows.map((r) => r.daysIdle).filter((x): x is number => x != null);
    return {
      rows,
      totals: {
        deadSkus: rows.length,
        avgDaysIdle: daysList.length ? Math.round(daysList.reduce((a, b) => a + b, 0) / daysList.length) : 0,
        trappedCapital: rows.reduce((a, b) => a + b.trappedValue, 0),
      },
    };
  });

/* ---- 4. Brand Demand ---- */
export const reportBrandDemand = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { from?: string; to?: string }) => d)
  .handler(async ({ data }) => {
    const r = validRange(data);
    const orderRows = await models.orders.findAll({
      attributes: ["id"],
      where: {
        created_at: { [Op.gte]: r.from, [Op.lte]: r.to },
        status: { [Op.ne]: "cancelled" }
      }
    });
    const orderIds = orderRows.map((o) => o.id);
    if (orderIds.length) {
      const items = await models.order_items.findAll({
        attributes: ["part_id", "line_total", "order_id"],
        where: { order_id: { [Op.in]: orderIds } },
        include: [{ 
          model: models.parts, as: "part", 
          include: [{ model: models.brands, as: "brand" }]
        }]
      });
      if (items.length) {
        const agg = new Map<string, { brand: string; revenue: number; orders: Set<string> }>();
        for (const row of items) {
          const it = row.get({ plain: true });
          const name = it.part?.brand?.name ?? "Other";
          const cur = agg.get(name) ?? { brand: name, revenue: 0, orders: new Set<string>() };
          cur.revenue += Number(it.line_total ?? 0);
          cur.orders.add(it.order_id);
          agg.set(name, cur);
        }
        const list = Array.from(agg.values()).map((x) => ({ brand: x.brand, revenue: x.revenue, orders: x.orders.size }));
        const total = list.reduce((a, b) => a + b.revenue, 0);
        return {
          fallback: false,
          totalRevenue: total,
          rows: list.map((x) => ({ ...x, share: total ? x.revenue / total : 0 })).sort((a, b) => b.revenue - a.revenue),
        };
      }
    }
    
    // Fallback: catalog distribution by brand
    const parts = await models.parts.findAll({
      attributes: ["id", "brand_id"],
      include: [{ model: models.brands, as: "brand", attributes: ["name"] }],
      limit: 5000
    });
    const agg = new Map<string, number>();
    for (const row of parts) {
      const p = row.get({ plain: true });
      const name = p.brand?.name ?? "Other";
      agg.set(name, (agg.get(name) ?? 0) + 1);
    }
    const total = Array.from(agg.values()).reduce((a, b) => a + b, 0);
    return {
      fallback: true,
      totalRevenue: 0,
      rows: Array.from(agg.entries()).map(([brand, count]) => ({
        brand, revenue: count, orders: 0, share: total ? count / total : 0,
      })).sort((a, b) => b.revenue - a.revenue),
    };
  });

/* ---- 5. Best Selling Parts ---- */
export const reportBestSellers = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { from?: string; to?: string; limit?: number }) => d)
  .handler(async ({ data }) => {
    const r = validRange(data);
    const limit = Math.min(Math.max(Number(data.limit ?? 10), 1), 50);
    const orderRows = await models.orders.findAll({
      attributes: ["id"],
      where: {
        created_at: { [Op.gte]: r.from, [Op.lte]: r.to },
        status: { [Op.ne]: "cancelled" }
      }
    });
    const orderIds = orderRows.map((o) => o.id);
    if (!orderIds.length) return [] as Array<{ partId: string | null; part_number: string; name: string; units: number; revenue: number }>;
    
    const items = await models.order_items.findAll({
      attributes: ["part_id", "part_number", "name", "quantity", "line_total"],
      where: { order_id: { [Op.in]: orderIds } }
    });
    
    const agg = new Map<string, { partId: string | null; part_number: string; name: string; units: number; revenue: number }>();
    for (const row of items) {
      const it = row.get({ plain: true });
      const key = (it.part_id as string) ?? `${it.part_number}|${it.name}`;
      const cur = agg.get(key) ?? { partId: (it.part_id as string) ?? null, part_number: it.part_number ?? "", name: it.name ?? "", units: 0, revenue: 0 };
      cur.units += Number(it.quantity ?? 0);
      cur.revenue += Number(it.line_total ?? 0);
      agg.set(key, cur);
    }
    return Array.from(agg.values()).sort((a, b) => b.units - a.units).slice(0, limit);
  });

/* ---- 6. Profit & Loss ---- */
export const reportPnl = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { from?: string; to?: string; granularity?: "day" | "week" | "month" }) => d)
  .handler(async ({ data }) => {
    const r = validRange(data);
    const granularity = data.granularity ?? "day";
    const rows = await models.orders.findAll({
      attributes: ["created_at", "total", "shipping_fee", "discount", "status"],
      where: {
        created_at: { [Op.gte]: r.from, [Op.lte]: r.to },
        status: { [Op.in]: ["delivered", "completed"] }
      }
    });

    const buckets: Record<string, { period: string; revenue: number; shipping: number; discount: number }> = {};
    let grossRevenue = 0, shipping = 0, discounts = 0;
    for (const row of rows) {
      const o = row.get({ plain: true });
      const total = Number(o.total ?? 0);
      const ship = Number(o.shipping_fee ?? 0);
      const disc = Number(o.discount ?? 0);
      grossRevenue += total;
      shipping += ship;
      discounts += disc;
      const k = bucketKey(o.created_at as string, granularity);
      buckets[k] ??= { period: k, revenue: 0, shipping: 0, discount: 0 };
      buckets[k].revenue += total;
      buckets[k].shipping += ship;
      buckets[k].discount += disc;
    }
    const marginSeries = Object.values(buckets).sort((a, b) => a.period.localeCompare(b.period));
    return { grossRevenue, shipping, discounts, marginSeries };
  });

/* ============================================================ */
/* ========== CLIENT-REQUESTED ANALYTICS (6 more) ============= */
/* ============================================================ */

const SHIPPED = ["delivered", "completed", "shipped"] as const;

/* ---- 7. Client-wise Sales ---- */
export const reportClientSales = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { from?: string; to?: string; customerType?: string | null; search?: string | null }) => d)
  .handler(async ({ data }) => {
    const r = validRange(data);
    const orders = await models.orders.findAll({
      attributes: ["user_id", "total", "created_at", "status"],
      where: {
        created_at: { [Op.gte]: r.from, [Op.lte]: r.to },
        status: { [Op.in]: SHIPPED }
      }
    });
    
    const agg = new Map<string, { user_id: string; orders: number; revenue: number; lastOrderAt: string }>();
    for (const row of orders) {
      const o = row.get({ plain: true });
      const uid = o.user_id as string;
      if (!uid) continue;
      const cur = agg.get(uid) ?? { user_id: uid, orders: 0, revenue: 0, lastOrderAt: "" };
      cur.orders += 1;
      cur.revenue += Number(o.total ?? 0);
      if (!cur.lastOrderAt || new Date(o.created_at as string).getTime() > new Date(cur.lastOrderAt).getTime()) {
        cur.lastOrderAt = o.created_at as string;
      }
      agg.set(uid, cur);
    }
    
    const ids = Array.from(agg.keys());
    if (!ids.length) return { rows: [], totals: { activeClients: 0, totalRevenue: 0, avgPerClient: 0 } };
    
    const profs = await models.profiles.findAll({
      attributes: ["id", "full_name", "phone", "customer_type", "company_name"],
      where: { id: { [Op.in]: ids } }
    });
    const pById = new Map<string, any>(profs.map((p) => [p.id, p.get({ plain: true })]));
    
    const now = Date.now();
    let rows = Array.from(agg.values()).map((x) => {
      const p = pById.get(x.user_id) ?? {};
      const daysSince = (now - new Date(x.lastOrderAt).getTime()) / 86400000;
      const status = daysSince <= 30 ? "Active" : daysSince <= 90 ? "Dormant" : "Inactive";
      return {
        user_id: x.user_id,
        full_name: p.full_name ?? "—",
        phone: p.phone ?? null,
        customer_type: p.customer_type ?? null,
        company_name: p.company_name ?? null,
        orders: x.orders,
        revenue: x.revenue,
        aov: x.orders ? x.revenue / x.orders : 0,
        lastOrderAt: x.lastOrderAt,
        status,
      };
    });
    
    const ct = data.customerType;
    if (ct && ct !== "all") rows = rows.filter((r) => r.customer_type === ct);
    const s = (data.search ?? "").trim().toLowerCase();
    if (s) rows = rows.filter((r) =>
      (r.full_name ?? "").toLowerCase().includes(s) ||
      (r.phone ?? "").toLowerCase().includes(s) ||
      (r.company_name ?? "").toLowerCase().includes(s));
    rows.sort((a, b) => b.revenue - a.revenue);
    const totalRevenue = rows.reduce((a, b) => a + b.revenue, 0);
    return {
      rows,
      totals: {
        activeClients: rows.length,
        totalRevenue,
        avgPerClient: rows.length ? totalRevenue / rows.length : 0,
      },
    };
  });

/* ---- 8. Client-wise Enquiry ---- */
export const reportClientEnquiry = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { from?: string; to?: string; customerType?: string | null; status?: string | null; search?: string | null }) => d)
  .handler(async ({ data }) => {
    const r = validRange(data);
    const w: any = { created_at: { [Op.gte]: r.from, [Op.lte]: r.to } };
    if (data.status && data.status !== "all") w.status = data.status;
    
    const quots = await models.quotations.findAll({
      attributes: ["customer_id", "grand_total", "status", "created_at"],
      where: w
    });
    
    const agg = new Map<string, { customer_id: string; total: number; value: number; approved: number; rejected: number; converted: number; pending: number; lastAt: string }>();
    for (const row of quots) {
      const qq = row.get({ plain: true });
      const cid = qq.customer_id as string;
      if (!cid) continue;
      const cur = agg.get(cid) ?? { customer_id: cid, total: 0, value: 0, approved: 0, rejected: 0, converted: 0, pending: 0, lastAt: "" };
      cur.total += 1;
      cur.value += Number(qq.grand_total ?? 0);
      const st = String(qq.status ?? "");
      if (st === "approved") cur.approved += 1;
      else if (st === "rejected") cur.rejected += 1;
      else if (st === "converted") cur.converted += 1;
      else if (st === "draft" || st === "sent") cur.pending += 1;
      if (!cur.lastAt || new Date(qq.created_at as string).getTime() > new Date(cur.lastAt).getTime()) {
        cur.lastAt = qq.created_at as string;
      }
      agg.set(cid, cur);
    }
    
    const ids = Array.from(agg.keys());
    if (!ids.length) return { rows: [], totals: { enquiringClients: 0, totalValue: 0, avgPerClient: 0 } };
    
    const profs = await models.profiles.findAll({
      attributes: ["id", "full_name", "phone", "customer_type", "company_name"],
      where: { id: { [Op.in]: ids } }
    });
    const pById = new Map<string, any>(profs.map((p) => [p.id, p.get({ plain: true })]));
    
    let rows = Array.from(agg.values()).map((x) => {
      const p = pById.get(x.customer_id) ?? {};
      return {
        customer_id: x.customer_id,
        full_name: p.full_name ?? "—",
        phone: p.phone ?? null,
        customer_type: p.customer_type ?? null,
        company_name: p.company_name ?? null,
        total: x.total, value: x.value,
        approved: x.approved, rejected: x.rejected, converted: x.converted, pending: x.pending,
        lastAt: x.lastAt,
      };
    });
    const ct = data.customerType;
    if (ct && ct !== "all") rows = rows.filter((r) => r.customer_type === ct);
    const s = (data.search ?? "").trim().toLowerCase();
    if (s) rows = rows.filter((r) =>
      (r.full_name ?? "").toLowerCase().includes(s) ||
      (r.phone ?? "").toLowerCase().includes(s) ||
      (r.company_name ?? "").toLowerCase().includes(s));
    rows.sort((a, b) => b.total - a.total);
    const totalValue = rows.reduce((a, b) => a + b.value, 0);
    const totalCount = rows.reduce((a, b) => a + b.total, 0);
    return {
      rows,
      totals: {
        enquiringClients: rows.length,
        totalValue,
        avgPerClient: rows.length ? totalCount / rows.length : 0,
      },
    };
  });

/* ---- 9. Most Inquired / Searched Items ---- */
export const reportMostInquiredItems = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { from?: string; to?: string }) => d)
  .handler(async ({ data }) => {
    const r = validRange(data);
    // Source 1: quotation_items (via quotations in range)
    const quotIds = await models.quotations.findAll({
      attributes: ["id"],
      where: { created_at: { [Op.gte]: r.from, [Op.lte]: r.to } }
    });
    const qids = quotIds.map((q) => q.id);
    const enquiryByPn = new Map<string, number>();
    const enquiryByPartId = new Map<string, number>();
    if (qids.length) {
      const qitems = await models.quotation_items.findAll({
        attributes: ["part_id", "part_snapshot"],
        where: { quotation_id: { [Op.in]: qids } }
      });
      for (const row of qitems) {
        const it = row.get({ plain: true });
        if (it.part_id) enquiryByPartId.set(it.part_id as string, (enquiryByPartId.get(it.part_id as string) ?? 0) + 1);
        const snap = (it.part_snapshot ?? {}) as any;
        const pn = normalizePn(snap.part_number ?? snap.oem_number ?? "");
        if (pn) enquiryByPn.set(pn, (enquiryByPn.get(pn) ?? 0) + 1);
      }
    }
    // Source 2: recently_viewed
    const viewByPartId = new Map<string, number>();
    const views = await models.recently_viewed.findAll({
      attributes: ["part_id", "viewed_at"],
      where: { viewed_at: { [Op.gte]: r.from, [Op.lte]: r.to } },
      limit: 20000
    });
    for (const row of views) {
      const v = row.get({ plain: true });
      if (v.part_id) viewByPartId.set(v.part_id as string, (viewByPartId.get(v.part_id as string) ?? 0) + 1);
    }
    // Source 3: wa_analytics_events
    const searchByPn = new Map<string, number>();
    const searchByQuery = new Map<string, number>();
    const was = await models.wa_analytics_events.findAll({
      attributes: ["event_type", "event_data", "occurred_at"],
      where: {
        event_type: { [Op.in]: ["part_search", "vin_search"] },
        occurred_at: { [Op.gte]: r.from, [Op.lte]: r.to }
      },
      limit: 20000
    });
    for (const row of was) {
      const w = row.get({ plain: true });
      const payload = (w.event_data ?? {}) as any;
      const pn = normalizePn(payload.part_number ?? payload.oem_number ?? "");
      if (pn) { searchByPn.set(pn, (searchByPn.get(pn) ?? 0) + 1); continue; }
      const q = String(payload.query ?? payload.text ?? "").trim();
      if (q) searchByQuery.set(q.toLowerCase(), (searchByQuery.get(q.toLowerCase()) ?? 0) + 1);
    }

    // Fetch relevant parts to resolve stock and names
    const partIdsSet = new Set<string>([...enquiryByPartId.keys(), ...viewByPartId.keys()]);
    const pnKeys = new Set<string>([...enquiryByPn.keys(), ...searchByPn.keys()]);
    const partsById = new Map<string, any>();
    const partsByPn = new Map<string, any>();
    if (partIdsSet.size) {
      const ids = Array.from(partIdsSet);
      const chunk = 500;
      for (let i = 0; i < ids.length; i += chunk) {
        const rows = await models.parts.findAll({
          attributes: ["id", "part_number", "name", "stock", "price", "brand_id"],
          where: { id: { [Op.in]: ids.slice(i, i + chunk) } },
          include: [{ model: models.brands, as: "brand", attributes: ["name"] }]
        });
        for (const row of rows) {
          const p = row.get({ plain: true });
          const pRow = { ...p, brands: p.brand };
          partsById.set(p.id, pRow);
          const k = normalizePn(p.part_number);
          if (k) partsByPn.set(k, pRow);
        }
      }
    }
    
    // Also resolve pnKeys not already known
    const missingPn = Array.from(pnKeys).filter((k) => !partsByPn.has(k));
    if (missingPn.length) {
      // Very naive lookup to avoid complicated normalized RPC in sequelize
      const rows = await models.parts.findAll({
        attributes: ["id", "part_number", "stock", "price"],
        where: { part_number: { [Op.in]: missingPn } } // This will miss variations without exact matches unfortunately
      });
      for (const row of rows) {
        const p = row.get({ plain: true });
        const pRow = { id: p.id, part_number: p.part_number, name: null, stock: p.stock, price: p.price, brand_id: null, brands: null };
        partsById.set(p.id, pRow);
        const k = normalizePn(p.part_number);
        if (k) partsByPn.set(k, pRow);
      }
    }

    type Row = {
      key: string; part_id: string | null; part_number: string; name: string; brand: string | null;
      stock: number | null; price: number; enquiry: number; views: number; searches: number; total: number;
    };
    const merged = new Map<string, Row>();
    const bumpById = (pid: string, field: "enquiry" | "views" | "searches", n: number) => {
      const p = partsById.get(pid);
      const key = `id:${pid}`;
      const row = merged.get(key) ?? {
        key, part_id: pid,
        part_number: p?.part_number ?? "—",
        name: p?.name ?? "—",
        brand: p?.brands?.name ?? null,
        stock: p ? Number(p.stock ?? 0) : null,
        price: p ? Number(p.price ?? 0) : 0,
        enquiry: 0, views: 0, searches: 0, total: 0,
      };
      row[field] += n; row.total += n;
      merged.set(key, row);
    };
    const bumpByPn = (pn: string, field: "enquiry" | "searches", n: number) => {
      const p = partsByPn.get(pn);
      if (p) { bumpById(p.id, field, n); return; }
      const key = `pn:${pn}`;
      const row = merged.get(key) ?? {
        key, part_id: null, part_number: pn, name: "—", brand: null,
        stock: 0, price: 0, enquiry: 0, views: 0, searches: 0, total: 0,
      };
      row[field] += n; row.total += n;
      merged.set(key, row);
    };

    for (const [pid, n] of enquiryByPartId) bumpById(pid, "enquiry", n);
    for (const [pid, n] of viewByPartId) bumpById(pid, "views", n);
    for (const [pn, n] of enquiryByPn) bumpByPn(pn, "enquiry", n);
    for (const [pn, n] of searchByPn) bumpByPn(pn, "searches", n);
    // Free text searches
    for (const [q, n] of searchByQuery) {
      const key = `q:${q}`;
      merged.set(key, {
        key, part_id: null, part_number: q, name: "(free-text search)", brand: null,
        stock: 0, price: 0, enquiry: 0, views: 0, searches: n, total: n,
      });
    }

    const list = Array.from(merged.values());
    const inStock = list.filter((x) => (x.stock ?? 0) > 0).sort((a, b) => b.total - a.total).slice(0, 15);
    const outOfStock = list.filter((x) => (x.stock ?? 0) <= 0).sort((a, b) => b.total - a.total)
      .map((x) => ({ ...x, estLostRevenue: x.price ? x.total * x.price : null }))
      .slice(0, 15);
    const chart = [...list].sort((a, b) => b.total - a.total).slice(0, 10).map((x) => ({
      part_number: x.part_number,
      inStock: (x.stock ?? 0) > 0 ? x.total : 0,
      outOfStock: (x.stock ?? 0) <= 0 ? x.total : 0,
    }));
    return { inStock, outOfStock, chart };
  });

function normalizePn(s: any): string {
  if (!s) return "";
  return String(s).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/* ---- 10. Client-wise Enquiry vs Sales ---- */
export const reportClientEnquiryVsSales = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { from?: string; to?: string; customerType?: string | null }) => d)
  .handler(async ({ data }) => {
    const r = validRange(data);
    const [quots, orders] = await Promise.all([
      models.quotations.findAll({
        attributes: ["customer_id", "grand_total", "created_at"],
        where: { created_at: { [Op.gte]: r.from, [Op.lte]: r.to } }
      }),
      models.orders.findAll({
        attributes: ["user_id", "total", "status", "created_at"],
        where: {
          created_at: { [Op.gte]: r.from, [Op.lte]: r.to },
          status: { [Op.in]: SHIPPED }
        }
      }),
    ]);
    const agg = new Map<string, { id: string; enquiries: number; enquiryValue: number; orders: number; salesValue: number }>();
    for (const row of quots) {
      const q = row.get({ plain: true });
      const id = q.customer_id as string; if (!id) continue;
      const cur = agg.get(id) ?? { id, enquiries: 0, enquiryValue: 0, orders: 0, salesValue: 0 };
      cur.enquiries += 1; cur.enquiryValue += Number(q.grand_total ?? 0);
      agg.set(id, cur);
    }
    for (const row of orders) {
      const o = row.get({ plain: true });
      const id = o.user_id as string; if (!id) continue;
      const cur = agg.get(id) ?? { id, enquiries: 0, enquiryValue: 0, orders: 0, salesValue: 0 };
      cur.orders += 1; cur.salesValue += Number(o.total ?? 0);
      agg.set(id, cur);
    }
    const ids = Array.from(agg.keys());
    const profs = ids.length ? await models.profiles.findAll({
      attributes: ["id", "full_name", "customer_type", "company_name"],
      where: { id: { [Op.in]: ids } }
    }) : [];
    const pById = new Map<string, any>(profs.map((p) => [p.id, p.get({ plain: true })]));
    let rows = Array.from(agg.values()).map((x) => {
      const p = pById.get(x.id) ?? {};
      return {
        customer_id: x.id,
        full_name: p.full_name ?? "—",
        customer_type: p.customer_type ?? null,
        company_name: p.company_name ?? null,
        enquiries: x.enquiries,
        enquiryValue: x.enquiryValue,
        orders: x.orders,
        salesValue: x.salesValue,
        countConversion: x.enquiries ? (x.orders / x.enquiries) * 100 : 0,
        valueConversion: x.enquiryValue ? (x.salesValue / x.enquiryValue) * 100 : 0,
        gap: x.enquiryValue - x.salesValue,
      };
    });
    const ct = data.customerType;
    if (ct && ct !== "all") rows = rows.filter((r) => r.customer_type === ct);
    rows.sort((a, b) => b.enquiryValue - a.enquiryValue);
    const enquiredClients = rows.filter((r) => r.enquiries > 0).length;
    const purchasedClients = rows.filter((r) => r.orders > 0).length;
    const totalEnquiryValue = rows.reduce((a, b) => a + b.enquiryValue, 0);
    const totalSalesValue = rows.reduce((a, b) => a + b.salesValue, 0);
    return {
      rows,
      totals: {
        enquiredClients,
        purchasedClients,
        overallConversion: enquiredClients ? (purchasedClients / enquiredClients) * 100 : 0,
        revenueGap: totalEnquiryValue - totalSalesValue,
      },
    };
  });

/* ---- 11. Total Enquiry vs Sales ---- */
export const reportTotalEnquiryVsSales = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { from?: string; to?: string; granularity?: "day" | "week" | "month" }) => d)
  .handler(async ({ data }) => {
    const r = validRange(data);
    const granularity = data.granularity ?? "month";
    const [quots, orders] = await Promise.all([
      models.quotations.findAll({
        attributes: ["grand_total", "created_at"],
        where: { created_at: { [Op.gte]: r.from, [Op.lte]: r.to } }
      }),
      models.orders.findAll({
        attributes: ["total", "status", "created_at"],
        where: {
          created_at: { [Op.gte]: r.from, [Op.lte]: r.to },
          status: { [Op.in]: SHIPPED }
        }
      }),
    ]);
    const buckets: Record<string, { period: string; enqCount: number; enqValue: number; salesCount: number; salesValue: number }> = {};
    let enqCount = 0, enqValue = 0, salesCount = 0, salesValue = 0;
    for (const row of quots) {
      const q = row.get({ plain: true });
      const k = bucketKey(q.created_at as string, granularity);
      buckets[k] ??= { period: k, enqCount: 0, enqValue: 0, salesCount: 0, salesValue: 0 };
      buckets[k].enqCount += 1; buckets[k].enqValue += Number(q.grand_total ?? 0);
      enqCount += 1; enqValue += Number(q.grand_total ?? 0);
    }
    for (const row of orders) {
      const o = row.get({ plain: true });
      const k = bucketKey(o.created_at as string, granularity);
      buckets[k] ??= { period: k, enqCount: 0, enqValue: 0, salesCount: 0, salesValue: 0 };
      buckets[k].salesCount += 1; buckets[k].salesValue += Number(o.total ?? 0);
      salesCount += 1; salesValue += Number(o.total ?? 0);
    }
    const sorted = Object.values(buckets).sort((a, b) => a.period.localeCompare(b.period));
    const series = sorted.map((b, i) => {
      const prev = i > 0 ? sorted[i - 1] : null;
      return {
        ...b,
        conversion: b.enqCount ? (b.salesCount / b.enqCount) * 100 : 0,
        gap: b.enqValue - b.salesValue,
        trend: prev ? (b.salesValue > prev.salesValue ? "up" : b.salesValue < prev.salesValue ? "down" : "flat") : "flat",
      };
    });
    return {
      series,
      totals: {
        enqCount, enqValue, salesCount, salesValue,
        overallConversion: enqCount ? (salesCount / enqCount) * 100 : 0,
      },
    };
  });

/* ---- 12. Sales Rep Performance ---- */
export const reportSalesRepPerformance = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { from?: string; to?: string; salesmanId?: string | null }) => d)
  .handler(async ({ data }) => {
    const r = validRange(data);
    const salesmenDb = await models.salesmen.findAll({
      attributes: ["id", "full_name", "email", "status"],
      where: { status: "active" }
    });
    const salesmen = salesmenDb.map(s => s.get({ plain: true }));
    
    const assignmentsDb = await models.customer_assignments.findAll({
      attributes: ["customer_id", "salesman_id"]
    });
    const assignments = assignmentsDb.map(a => a.get({ plain: true }));
    
    const assignByCustomer = new Map<string, string>();
    const assignedCountBySalesman = new Map<string, number>();
    for (const a of assignments) {
      if (a.customer_id && a.salesman_id) {
        assignByCustomer.set(a.customer_id as string, a.salesman_id as string);
        assignedCountBySalesman.set(a.salesman_id as string, (assignedCountBySalesman.get(a.salesman_id as string) ?? 0) + 1);
      }
    }
    const quotsDb = await models.quotations.findAll({
      attributes: ["created_by", "grand_total", "created_at"],
      where: { created_at: { [Op.gte]: r.from, [Op.lte]: r.to } }
    });
    const quots = quotsDb.map(q => q.get({ plain: true }));
    
    const enqBy = new Map<string, { count: number; value: number }>();
    for (const q of quots) {
      const sid = q.created_by as string; if (!sid) continue;
      const cur = enqBy.get(sid) ?? { count: 0, value: 0 };
      cur.count += 1; cur.value += Number(q.grand_total ?? 0);
      enqBy.set(sid, cur);
    }
    
    const ordersDb = await models.orders.findAll({
      attributes: ["user_id", "total", "status", "created_at"],
      where: {
        created_at: { [Op.gte]: r.from, [Op.lte]: r.to },
        status: { [Op.in]: SHIPPED }
      }
    });
    const orders = ordersDb.map(o => o.get({ plain: true }));
    
    const salesBy = new Map<string, { count: number; value: number }>();
    for (const o of orders) {
      const sid = assignByCustomer.get(o.user_id as string);
      if (!sid) continue;
      const cur = salesBy.get(sid) ?? { count: 0, value: 0 };
      cur.count += 1; cur.value += Number(o.total ?? 0);
      salesBy.set(sid, cur);
    }
    let rows = salesmen.map((s: any) => {
      const e = enqBy.get(s.id) ?? { count: 0, value: 0 };
      const sa = salesBy.get(s.id) ?? { count: 0, value: 0 };
      const conversion = e.count ? (sa.count / e.count) * 100 : 0;
      const stars = conversion > 60 ? 5 : conversion > 45 ? 4 : conversion > 30 ? 3 : conversion > 15 ? 2 : 1;
      return {
        id: s.id, full_name: s.full_name, email: s.email,
        assignedClients: assignedCountBySalesman.get(s.id) ?? 0,
        enquiriesCreated: e.count, enquiryValue: e.value,
        ordersClosed: sa.count, salesValue: sa.value,
        conversion, avgDealSize: sa.count ? sa.value / sa.count : 0,
        stars,
      };
    });
    if (data.salesmanId) rows = rows.filter((r) => r.id === data.salesmanId);
    rows.sort((a, b) => b.salesValue - a.salesValue);
    const activeReps = rows.filter((r) => r.enquiriesCreated > 0 || r.ordersClosed > 0).length;
    const teamRevenue = rows.reduce((a, b) => a + b.salesValue, 0);
    const bestConverter = [...rows].sort((a, b) => b.conversion - a.conversion)[0] ?? null;
    return { rows, totals: { activeReps, teamRevenue, bestConverter } };
  });
