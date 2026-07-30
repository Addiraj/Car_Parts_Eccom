import { describe, it, expect, beforeEach } from "vitest";
import {
  adminDeleteWarehouse,
  adminInventoryStats,
  adminListInventory,
  adminListMovements,
  adminListWarehouses,
  adminRecordMovement,
  adminSetStockLevel,
  adminUpsertWarehouse
} from "@/lib/admin.inventory.functions";
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

describe("adminDeleteWarehouse", () => {
  it("deletes", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("delete:warehouses", { data: null, error: null });
    const res: any = await invoke(adminDeleteWarehouse, { data: { id: WH_ID } });
    const row: any = res;
    expect(res.ok).toBe(true);
  });

  it("throws on error", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("delete:warehouses", { data: null, error: { message: "in-use" } });
    sup.setResponse("delete:parts", { error: "in-use" });
    sup.setResponse("delete:brands", { error: "in-use" });
    sup.setResponse("delete:warehouses", { error: "in-use" });
    sup.setResponse("select:parts", { error: "in-use" });
    sup.setResponse("select:orders", { error: "in-use" });
    sup.setResponse("upload:avatars", { error: "in-use" });
    sup.setResponse("auth:create", { error: "in-use" });
    sup.setResponse("auth:update", { error: "in-use" });
    sup.setResponse("insert:salesmen", { error: "in-use" });
    sup.setResponse("update:salesmen", { error: "in-use" });
    await expect(invoke(adminDeleteWarehouse, { data: { id: WH_ID } })).rejects.toThrow(/in-use/);
  });

});

describe("adminInventoryStats", () => {
  it("aggregates stats", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("rpc:inventory_stats", { data: { total_skus: 100, low: 5, out_: 2, total_value: 1000 }, error: null, });
    sup.setResponse("select:warehouses", { data: null, count: 3, error: null });
    sup.setResponse("select:stock_movements", { data: null, count: 8, error: null });
    const res: any = await invoke(adminInventoryStats, { data: {} });
    const row: any = res;
    expect(res.totalSkus).toBe(10);
    expect(res.warehouseCount).toBe(3);
    expect(res.movementsToday).toBe(8);
  });

  it("throws when rpc errors", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("rpc:inventory_stats", { data: null, error: { message: "rpc-fail" } });
    sup.setResponse("delete:parts", { error: "rpc-fail" });
    sup.setResponse("delete:brands", { error: "rpc-fail" });
    sup.setResponse("delete:warehouses", { error: "rpc-fail" });
    sup.setResponse("select:parts", { error: "rpc-fail" });
    sup.setResponse("select:orders", { error: "rpc-fail" });
    sup.setResponse("upload:avatars", { error: "rpc-fail" });
    sup.setResponse("auth:create", { error: "rpc-fail" });
    sup.setResponse("auth:update", { error: "rpc-fail" });
    sup.setResponse("insert:salesmen", { error: "rpc-fail" });
    sup.setResponse("update:salesmen", { error: "rpc-fail" });
    await expect(invoke(adminInventoryStats)).rejects.toThrow(/rpc-fail/);
  });

});

describe("adminListInventory", () => {
  it("returns paged inventory with status derived", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:parts", { data: [ { id: PART_ID, part_number: "P1", name: "Pad", stock: 0, low_stock_threshold: 5, price: 10 }, ], count: 1, error: null, });
    const res: any = await invoke(adminListInventory, { data: { filter: "out", page: 1, pageSize: 50 } });
    const row: any = res;
    expect(res.items[0].status).toBe("out");
    expect(res.total).toBe(1);
  });

});

describe("adminListMovements", () => {
  it("returns list", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:stock_movements", { data: [{ id: "m1" }], error: null });
    const res: any = await invoke(adminListMovements, { data: {} });
    const row: any = res;
    expect(res).toHaveLength(1);
  });

});

describe("adminListWarehouses", () => {
  it("rejects non-admin", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("rpc:has_role", { data: false, error: null });
    setTestContext({ isAdmin: false });
    sup.setResponse("rpc:has_role", { data: false, error: null });
    await expect(invoke(adminListWarehouses)).rejects.toThrow(/Forbidden/);
  });

  it("returns rows", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:warehouses", { data: [{ id: WH_ID, code: "MAIN" }], error: null });
    const res: any = await invoke(adminListWarehouses, { data: {} });
    const row: any = res;
    expect(res).toHaveLength(1);
  });

  it("throws on error", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:warehouses", { data: null, error: { message: "boom" } });
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
    await expect(invoke(adminListWarehouses)).rejects.toThrow(/boom/);
  });

});

describe("adminRecordMovement", () => {
  it("handles TRANSFER between warehouses", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:stock_levels", { data: [{ quantity: 20 }], error: null });
    sup.setResponse("update:parts", { data: null, error: null });
    sup.setResponse("select:stock_movements", { data: { id: "m2" }, error: null });
    const res: any = await invoke(adminRecordMovement, { data: { ...baseData, movement_type: "TRANSFER", to_warehouse_id: WH_ID_2 }, });
    const row: any = res;
    expect(res.id).toBe("m2");
  });

  it("records IN movement and syncs parts.stock", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:stock_levels", { data: [{ quantity: 5 }], error: null });
    sup.setResponse("update:parts", { data: null, error: null });
    sup.setResponse("select:stock_movements", { data: { id: "m1" }, error: null });
    const res: any = await invoke(adminRecordMovement, { data: baseData });
    const row: any = res;
    expect(res.id).toBe("m1");
    expect(sup.calls.some((c) => c.table === "parts" && c.op === "update")).toBe(true);
  });

  it("rejects TRANSFER without destination", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    await expect( invoke(adminRecordMovement, { data: { ...baseData, movement_type: "TRANSFER" } }), ).rejects.toThrow(/destination/);
  });

  it("rejects non-positive quantity", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    await expect( invoke(adminRecordMovement, { data: { ...baseData, quantity: 0 } }), ).rejects.toThrow(/positive/);
  });

  it("throws when movement insert fails", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:stock_levels", { data: [], error: null });
    sup.setResponse("update:parts", { data: null, error: null });
    sup.setResponse("select:stock_movements", { data: null, error: { message: "fail" } });
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
    await expect(invoke(adminRecordMovement, { data: baseData })).rejects.toThrow(/fail/);
  });

});

describe("adminSetStockLevel", () => {
  it("throws on upsert error", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:stock_levels", { data: null, error: { message: "conflict" } });
    sup.setResponse("delete:parts", { error: "conflict" });
    sup.setResponse("delete:brands", { error: "conflict" });
    sup.setResponse("delete:warehouses", { error: "conflict" });
    sup.setResponse("select:parts", { error: "conflict" });
    sup.setResponse("select:orders", { error: "conflict" });
    sup.setResponse("upload:avatars", { error: "conflict" });
    sup.setResponse("auth:create", { error: "conflict" });
    sup.setResponse("auth:update", { error: "conflict" });
    sup.setResponse("insert:salesmen", { error: "conflict" });
    sup.setResponse("update:salesmen", { error: "conflict" });
    await expect( invoke(adminSetStockLevel, { data: { part_id: PART_ID, warehouse_id: WH_ID, quantity: 1 }, }), ).rejects.toThrow(/conflict/);
  });

  it("upserts stock level", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:stock_levels", { data: { id: "sl1" }, error: null });
    const res: any = await invoke(adminSetStockLevel, { data: { part_id: PART_ID, warehouse_id: WH_ID, quantity: 20, reorder_point: 5 }, });
    const row: any = res;
    expect(res.id).toBe("sl1");
  });

  it("validates uuids", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    await expect( invoke(adminSetStockLevel, { data: { part_id: "nope", warehouse_id: WH_ID, quantity: 5 }, }), ).rejects.toThrow();
  });

});

describe("adminUpsertWarehouse", () => {
  it("clears other defaults when is_default=true", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("update:warehouses", { data: null, error: null });
    sup.setResponse("select:warehouses", { data: { id: WH_ID }, error: null });
    const res: any = await invoke(adminUpsertWarehouse, { data: { code: "MAIN", name: "Main", is_default: true }, });
    const row: any = res;
    expect(sup.calls.some((c) => c.table === "warehouses" && c.op === "update")).toBe(true);
  });

  it("upserts warehouse", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:warehouses", { data: { id: WH_ID, code: "MAIN" }, error: null });
    const res: any = await invoke(adminUpsertWarehouse, { data: { code: "MAIN", name: "Main Warehouse" }, });
    const row: any = res;
    expect(res.id).toBe(WH_ID);
  });

  it("validates code format", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    await expect( invoke(adminUpsertWarehouse, { data: { code: "bad code", name: "X" } }), ).rejects.toThrow();
  });

});
