import { describe, it, expect, beforeEach } from "vitest";
import {
  reportBestSellers,
  reportBrandDemand,
  reportClientEnquiry,
  reportClientEnquiryVsSales,
  reportClientSales,
  reportCustomerAcquisition,
  reportDeadStockAdvanced,
  reportInventoryAging,
  reportLowStockAlerts,
  reportMostInquiredItems,
  reportPnl,
  reportRevenueTrend,
  reportSalesByBrand,
  reportSalesByCategory,
  reportSalesByPeriod
} from "@/lib/admin.reports.functions";
import { getSupabase } from "../../setup";
import { setTestContext } from "../../helpers/serverfn-mock";
import { invoke } from "../../helpers/invoke";

const ID = "11111111-1111-1111-1111-111155555555";
const tiny = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const big = "data:image/png;base64," + "A".repeat(7 * 1024 * 1024);
const BRAND_ID = "11111111-1111-1111-1111-111155555555";
const PART_ID = "11111111-1111-1111-1111-111155555555";
const PART_ID_2 = "22222222-2222-2222-2222-222255555555";
const WH_ID = "22222222-2222-2222-2222-222255555555";
const WH_ID_2 = "33333333-3333-3333-3333-333355555555";
const SM_ID = "55555555-5555-5555-5555-555555555555";
const CUST_ID = "33333333-3333-3333-3333-333355555555";
const NOTIF_ID = "44444444-4444-4444-4444-444455555555";
const oldDate = new Date(Date.now() - 30 * 86400000).toISOString();
const range = { from: "2020-01-01", to: "2030-12-31" };
const baseData = { part_id: PART_ID, warehouse_id: WH_ID, movement_type: "IN", quantity: 10 };

beforeEach(() => {
  setTestContext({ isAdmin: true, userId: "admin-1" });
});

describe("reportBestSellers", () => {
  it("returns empty for no orders", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:orders", { data: [], error: null });
    const res: any = await invoke(reportBestSellers, { data: range });
    const row: any = res;
    expect(res).toEqual([]);
  });

});

describe("reportBrandDemand", () => {
  it("falls back to catalog distribution when no orders", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:orders", { data: [], error: null });
    sup.setResponse("select:parts", { data: [{ id: "p1", brand_id: "b1", brands: { name: "Toyota" } }, { id: "p2", brand_id: null, brands: null }], error: null, });
    const res: any = await invoke(reportBrandDemand, { data: range });
    const row: any = res;
    expect(res.fallback).toBe(true);
    expect(res.rows.length).toBe(2);
  });

});

describe("reportClientEnquiry", () => {
  it("aggregates by customer with status buckets", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:profiles", { data: [{ id: "c1", full_name: "Jane" }], error: null });
    const res: any = await invoke(reportClientEnquiry, { data: {} });
    const row: any = res;
    expect(res.rows[0].total).toBe(2);
    expect(res.rows[0].approved).toBe(1);
    expect(res.rows[0].pending).toBe(1);
  });

  it("throws on db error", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:quotations", { data: null, error: { message: "boom" } });
    sup.setResponse("delete:parts", { error: "boom" });
    sup.setResponse("delete:brands", { error: "boom" });
    sup.setResponse("delete:warehouses", { error: "boom" });
    sup.setResponse("select:parts", { error: "boom" });
    sup.setResponse("select:orders", { error: "boom" });
    sup.setResponse("upload:avatars", { error: "boom" });
    sup.setResponse("auth:create", { error: "boom" });
    sup.setResponse("auth:update", { error: "boom" });
    sup.setResponse("insert:salesmen", { error: "boom" });
    sup.setResponse("update:salesmen", { error: "boom" });
    await expect(invoke(reportClientEnquiry, { data: {} })).rejects.toThrow(/boom/);
  });

});

describe("reportClientEnquiryVsSales", () => {
  it("merges quotations and orders per customer", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:quotations", { data: [{ customer_id: "c1", grand_total: 500, created_at: "2026-01-05T00:00:00Z" }], error: null, });
    sup.setResponse("select:orders", { data: [{ user_id: "c1", total: 200, status: "delivered", created_at: "2026-01-06T00:00:00Z" }], error: null, });
    sup.setResponse("select:profiles", { data: [{ id: "c1", full_name: "Jane" }], error: null });
    const res: any = await invoke(reportClientEnquiryVsSales, { data: range });
    const row: any = res;
    expect(row).toBeDefined();
  });

});

describe("reportClientSales", () => {
  it("aggregates per user with status", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:profiles", { data: [{ id: "u1", full_name: "Jane" }], error: null });
    const res: any = await invoke(reportClientSales, { data: range });
    const row: any = res;
    expect(res.rows[0].revenue).toBe(150);
    expect(res.rows[0].orders).toBe(2);
    expect(res.rows[0].status).toBe("Active");
    expect(res.totals.totalRevenue).toBe(150);
  });

  it("returns empty totals when no data", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:orders", { data: [], error: null });
    const res: any = await invoke(reportClientSales, { data: range });
    const row: any = res;
    expect(res.rows).toEqual([]);
    expect(res.totals.activeClients).toBe(0);
  });

});

describe("reportCustomerAcquisition", () => {
  it("aggregates by month", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:profiles", { data: [ { created_at: "2026-01-10T00:00:00Z", customer_type: "IND" }, { created_at: "2026-01-15T00:00:00Z", customer_type: "GAR" }, ], error: null, });
    const res: any = await invoke(reportCustomerAcquisition, { data: range });
    const row: any = res;
    expect(res[0].total).toBe(2);
    expect(res[0].IND).toBe(1);
  });

  it("throws on error", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:profiles", { data: null, error: { message: "boom" } });
    sup.setResponse("delete:parts", { error: "boom" });
    sup.setResponse("delete:brands", { error: "boom" });
    sup.setResponse("delete:warehouses", { error: "boom" });
    sup.setResponse("select:parts", { error: "boom" });
    sup.setResponse("select:orders", { error: "boom" });
    sup.setResponse("upload:avatars", { error: "boom" });
    sup.setResponse("auth:create", { error: "boom" });
    sup.setResponse("auth:update", { error: "boom" });
    sup.setResponse("insert:salesmen", { error: "boom" });
    sup.setResponse("update:salesmen", { error: "boom" });
    await expect(invoke(reportCustomerAcquisition, { data: range })).rejects.toThrow(/boom/);
  });

});

describe("reportDeadStockAdvanced", () => {
  it("handles empty parts", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:parts", { data: [], error: null });
    const res: any = await invoke(reportDeadStockAdvanced, { data: {} });
    const row: any = res;
    expect(res.rows).toEqual([]);
    expect(res.totals.deadSkus).toBe(0);
  });

});

describe("reportInventoryAging", () => {
  it("returns totals shape when nothing set", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("rpc:inventory_stats", { data: [{ total_skus: 10, low: 1, out_: 0, total_value: 500 }], error: null });
    sup.setResponse("select:orders", { data: [], error: null });
    sup.setResponse("select:parts", { data: [], error: null });
    const res: any = await invoke(reportInventoryAging, { data: {} });
    const row: any = res;
    expect(res.totals.total_skus).toBe(10);
    expect(res.dead_stock_count).toBe(0);
  });

});

describe("reportLowStockAlerts", () => {
  it("filters and grades urgency", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    const res: any = await invoke(reportLowStockAlerts, { data: {} });
    const row: any = res;
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].urgency).toBe("CRITICAL");
    expect(res.totals.criticalCount).toBe(1);
  });

  it("throws on db error", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:parts", { data: null, error: { message: "boom" } });
    sup.setResponse("delete:parts", { error: "boom" });
    sup.setResponse("delete:brands", { error: "boom" });
    sup.setResponse("delete:warehouses", { error: "boom" });
    sup.setResponse("select:parts", { error: "boom" });
    sup.setResponse("select:orders", { error: "boom" });
    sup.setResponse("upload:avatars", { error: "boom" });
    sup.setResponse("auth:create", { error: "boom" });
    sup.setResponse("auth:update", { error: "boom" });
    sup.setResponse("insert:salesmen", { error: "boom" });
    sup.setResponse("update:salesmen", { error: "boom" });
    await expect(invoke(reportLowStockAlerts, { data: {} })).rejects.toThrow(/boom/);
  });

});

describe("reportMostInquiredItems", () => {
  it("returns empty structures with no sources", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:quotations", { data: [], error: null });
    sup.setResponse("select:recently_viewed", { data: [], error: null });
    sup.setResponse("select:wa_analytics_events", { data: [], error: null });
    const res: any = await invoke(reportMostInquiredItems, { data: range });
    const row: any = res;
    expect(res.inStock).toEqual([]);
    expect(res.outOfStock).toEqual([]);
    expect(res.chart).toEqual([]);
  });

});

describe("reportPnl", () => {
  it("aggregates gross, shipping, discounts", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    const res: any = await invoke(reportPnl, { data: { ...range, granularity: "day" } });
    const row: any = res;
    expect(res.grossRevenue).toBe(300);
    expect(res.shipping).toBe(30);
    expect(res.discounts).toBe(5);
    expect(res.marginSeries.length).toBe(2);
  });

  it("throws on db error", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:orders", { data: null, error: { message: "fail" } });
    sup.setResponse("delete:parts", { error: "fail" });
    sup.setResponse("delete:brands", { error: "fail" });
    sup.setResponse("delete:warehouses", { error: "fail" });
    sup.setResponse("select:parts", { error: "fail" });
    sup.setResponse("select:orders", { error: "fail" });
    sup.setResponse("upload:avatars", { error: "fail" });
    sup.setResponse("auth:create", { error: "fail" });
    sup.setResponse("auth:update", { error: "fail" });
    sup.setResponse("insert:salesmen", { error: "fail" });
    sup.setResponse("update:salesmen", { error: "fail" });
    await expect(invoke(reportPnl, { data: range })).rejects.toThrow(/fail/);
  });

});

describe("reportRevenueTrend", () => {
  it("computes revenue and previous window", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:orders", { data: [{ created_at: "2026-01-10T00:00:00Z", total: 150, status: "delivered" }], error: null, });
    const res: any = await invoke(reportRevenueTrend, { data: { ...range, granularity: "day" } });
    const row: any = res;
    expect(res.totals.revenue).toBe(150);
    expect(res.totals.orders).toBe(1);
    expect(res.previous).toBeDefined();
  });

  it("throws on db error", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:orders", { data: null, error: { message: "fail" } });
    sup.setResponse("delete:parts", { error: "fail" });
    sup.setResponse("delete:brands", { error: "fail" });
    sup.setResponse("delete:warehouses", { error: "fail" });
    sup.setResponse("select:parts", { error: "fail" });
    sup.setResponse("select:orders", { error: "fail" });
    sup.setResponse("upload:avatars", { error: "fail" });
    sup.setResponse("auth:create", { error: "fail" });
    sup.setResponse("auth:update", { error: "fail" });
    sup.setResponse("insert:salesmen", { error: "fail" });
    sup.setResponse("update:salesmen", { error: "fail" });
    await expect(invoke(reportRevenueTrend, { data: range })).rejects.toThrow(/fail/);
  });

});

describe("reportSalesByBrand", () => {
  it("returns empty when no orders", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:orders", { data: [], error: null });
    const res: any = await invoke(reportSalesByBrand, { data: range });
    const row: any = res;
    expect(res).toEqual([]);
  });

});

describe("reportSalesByCategory", () => {
  it("returns empty when no orders", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:orders", { data: [], error: null });
    const res: any = await invoke(reportSalesByCategory, { data: range });
    const row: any = res;
    expect(res).toEqual([]);
  });

});

describe("reportSalesByPeriod", () => {
  it("aggregates by day and returns totals + aov", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    const res: any = await invoke(reportSalesByPeriod, { data: { ...range, granularity: "day" } });
    const row: any = res;
    expect(res.totals.orders).toBe(2);
    expect(res.totals.revenue).toBe(300);
    expect(res.totals.aov).toBe(150);
  });

  it("rejects non-admin", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("rpc:has_role", { data: false, error: null });
    setTestContext({ isAdmin: false });
    sup.setResponse("rpc:has_role", { data: false, error: null });
    await expect(invoke(reportSalesByPeriod, { data: range })).rejects.toThrow(/Forbidden/);
  });

  it("throws on db error", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:orders", { data: null, error: { message: "db-fail" } });
    sup.setResponse("delete:parts", { error: "db-fail" });
    sup.setResponse("delete:brands", { error: "db-fail" });
    sup.setResponse("delete:warehouses", { error: "db-fail" });
    sup.setResponse("select:parts", { error: "db-fail" });
    sup.setResponse("select:orders", { error: "db-fail" });
    sup.setResponse("upload:avatars", { error: "db-fail" });
    sup.setResponse("auth:create", { error: "db-fail" });
    sup.setResponse("auth:update", { error: "db-fail" });
    sup.setResponse("insert:salesmen", { error: "db-fail" });
    sup.setResponse("update:salesmen", { error: "db-fail" });
    await expect(invoke(reportSalesByPeriod, { data: range })).rejects.toThrow(/db-fail/);
  });

});
