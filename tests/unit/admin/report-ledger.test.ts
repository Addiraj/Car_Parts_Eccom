import { describe, it, expect, beforeEach } from "vitest";
import {
  reportCartAbandonment,
  reportCredit,
  reportFulfillment,
  reportQuotations,
  reportSalesLedger
} from "@/lib/admin.report-ledger.functions";
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

describe("reportCartAbandonment", () => {
  it("aggregates abandoned carts", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:cart_items", { data: [{ user_id: "u1", part_id: "p1", quantity: 2, added_at: oldDate }], error: null, });
    sup.setResponse("select:parts", { data: [{ id: "p1", part_number: "P1", name: "A", price: 50, stock: 10 }], error: null });
    sup.setResponse("select:orders", { data: [], error: null });
    sup.setResponse("select:profiles", { data: [{ id: "u1", full_name: "Jane" }], error: null });
    const res: any = await invoke(reportCartAbandonment, { data: range });
    const row: any = res;
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].cart_value).toBe(100);
    expect(res.kpis.abandonedValue).toBe(100);
    expect(res.topProducts[0].part_id).toBe("p1");
  });

  it("returns empty shape when nothing in carts", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:cart_items", { data: [], error: null });
    const res: any = await invoke(reportCartAbandonment, { data: range });
    const row: any = res;
    expect(res.rows).toEqual([]);
    expect(res.kpis.activeCarts).toBe(0);
  });

  it("throws on db error", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:cart_items", { data: null, error: { message: "boom" } });
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
    await expect(invoke(reportCartAbandonment, { data: range })).rejects.toThrow(/boom/);
  });

});

describe("reportCredit", () => {
  it("returns payments subtab", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:credit_wallets", { data: [], error: null });
    sup.setResponse("select:credit_payments", { data: [], count: 0, error: null });
    sup.setResponse("select:credit_billing_statements", { data: [], error: null });
    const res: any = await invoke(reportCredit, { data: { ...range, subtab: "payments" } });
    const row: any = res;
    expect(res.subtab).toBe("payments");
  });

  it("returns statements subtab", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:credit_wallets", { data: [], error: null });
    sup.setResponse("select:credit_payments", { data: [], error: null });
    sup.setResponse("select:credit_billing_statements", { data: [], count: 0, error: null });
    const res: any = await invoke(reportCredit, { data: { ...range, subtab: "statements" } });
    const row: any = res;
    expect(res.subtab).toBe("statements");
  });

  it("returns transactions subtab by default", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:credit_wallets", { data: [{ credit_limit: 1000, available_balance: 800, is_active: true }], error: null, });
    sup.setResponse("select:credit_payments", { data: [{ amount: 200 }], error: null });
    sup.setResponse("select:credit_billing_statements", { data: [], error: null });
    sup.setResponse("select:credit_transactions", { data: [], count: 0, error: null });
    sup.setResponse("select:profiles", { data: [], error: null });
    const res: any = await invoke(reportCredit, { data: range });
    const row: any = res;
    expect(res.subtab).toBe("transactions");
    expect(res.kpis.extended).toBe(1000);
    expect(res.kpis.paymentsReceived).toBe(200);
    expect(res.kpis.outstanding).toBe(200);
  });

});

describe("reportFulfillment", () => {
  it("computes pending / KPI counts", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:profiles", { data: [{ id: "u1", full_name: "Jane" }], error: null });
    sup.setResponse("select:order_items", { data: [{ order_id: "o1" }], error: null });
    const res: any = await invoke(reportFulfillment, { data: range });
    const row: any = res;
    expect(res.kpis.pending).toBe(1);
    expect(res.ordersByCity[0].city).toBe("Dubai");
    expect(res.rows[0].city).toBe("Dubai");
  });

});

describe("reportQuotations", () => {
  it("builds funnel and kpis", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:profiles", { data: [{ id: "c1", full_name: "Jane" }], error: null });
    sup.setResponse("select:quotation_items", { data: [], error: null });
    sup.setResponse("select:salesmen", { data: [], error: null });
    const res: any = await invoke(reportQuotations, { data: range });
    const row: any = res;
    expect(res.kpis.total).toBe(2);
    expect(res.funnel.approved).toBe(1);
    expect(res.rows[0].customer_name).toBe("Jane");
  });

});

describe("reportSalesLedger", () => {
  it("rejects non-admin", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("rpc:has_role", { data: false, error: null });
    setTestContext({ isAdmin: false });
    sup.setResponse("rpc:has_role", { data: false, error: null });
    await expect(invoke(reportSalesLedger, { data: range })).rejects.toThrow(/Forbidden/);
  });

  it("returns rows and kpi aggregates", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:profiles", { data: [{ id: "u1", full_name: "Jane" }], error: null });
    sup.setResponse("select:order_items", { data: [{ order_id: "o1" }], error: null });
    const res: any = await invoke(reportSalesLedger, { data: range });
    const row: any = res;
    expect(res.total).toBe(1);
    expect(res.rows[0].customer_name).toBe("Jane");
    expect(res.rows[0].item_count).toBe(1);
    expect(res.kpis.orders).toBe(2);
  });

  it("throws on db error", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:orders", { data: null, error: { message: "boom" } });
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
    await expect(invoke(reportSalesLedger, { data: range })).rejects.toThrow(/boom/);
  });

});
