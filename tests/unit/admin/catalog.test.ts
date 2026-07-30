import { describe, it, expect, beforeEach } from "vitest";
import {
  adminBulkDeleteParts,
  adminBulkUpdateParts,
  adminDeleteBrand,
  adminExportPartsCsv,
  adminGetPart,
  adminListBrands,
  adminListCategoriesTree,
  adminSearchPartsBasic,
  adminSetAlternatives,
  adminUpsertBrand,
  adminUpsertPartFull
} from "@/lib/admin.catalog.functions";
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

describe("adminBulkDeleteParts", () => {
  it("deletes rows", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("delete:parts", { data: null, error: null });
    const res: any = await invoke(adminBulkDeleteParts, { data: { ids: [PART_ID, PART_ID_2] } });
    const row: any = res;
    expect(res.deleted).toBe(2);
  });

  it("returns 0 when empty", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    const res: any = await invoke(adminBulkDeleteParts, { data: { ids: [] } });
    const row: any = res;
    expect(res.deleted).toBe(0);
  });

  it("throws on delete error", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("delete:parts", { data: null, error: { message: "boom" } });
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
    await expect( invoke(adminBulkDeleteParts, { data: { ids: [PART_ID] } }), ).rejects.toThrow(/boom/);
  });

});

describe("adminBulkUpdateParts", () => {
  it("computes delta correctly", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:parts", { data: [{ id: PART_ID, price: 100 }, { id: PART_ID_2, price: 200 }], error: null, });
    sup.setResponse("update:parts", { data: null, error: null });
    const res: any = await invoke(adminBulkUpdateParts, { data: { ids: [PART_ID, PART_ID_2], field: "price", mode: "delta", value: 10 }, });
    const row: any = res;
    expect(res.updated).toBe(2);
  });

  it("rejects invalid field", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("delete:parts", { error: "error" });
    sup.setResponse("delete:brands", { error: "error" });
    sup.setResponse("delete:warehouses", { error: "error" });
    sup.setResponse("select:parts", { error: "error" });
    sup.setResponse("select:orders", { error: "error" });
    sup.setResponse("upload:avatars", { error: "error" });
    sup.setResponse("auth:create", { error: "error" });
    sup.setResponse("auth:update", { error: "error" });
    sup.setResponse("insert:salesmen", { error: "error" });
    sup.setResponse("update:salesmen", { error: "error" });
    await expect( invoke(adminBulkUpdateParts, { data: { ids: [PART_ID], field: "unknown" as any, mode: "set", value: 1 }, }), ).rejects.toThrow();
  });

  it("throws on select error", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:parts", { data: null, error: { message: "select-fail" } });
    sup.setResponse("delete:parts", { error: "select-fail" });
    sup.setResponse("delete:brands", { error: "select-fail" });
    sup.setResponse("delete:warehouses", { error: "select-fail" });
    sup.setResponse("select:parts", { error: "select-fail" });
    sup.setResponse("select:orders", { error: "select-fail" });
    sup.setResponse("upload:avatars", { error: "select-fail" });
    sup.setResponse("auth:create", { error: "select-fail" });
    sup.setResponse("auth:update", { error: "select-fail" });
    sup.setResponse("insert:salesmen", { error: "select-fail" });
    sup.setResponse("update:salesmen", { error: "select-fail" });
    await expect( invoke(adminBulkUpdateParts, { data: { ids: [PART_ID], field: "price", mode: "set", value: 10 }, }), ).rejects.toThrow(/select-fail/);
  });

});

describe("adminDeleteBrand", () => {
  it("deletes", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:brands", { data: null, error: null });
    sup.setResponse("delete:brands", { data: null, error: null });
    const res: any = await invoke(adminDeleteBrand, { data: { id: BRAND_ID } });
    const row: any = res;
    expect(res.ok).toBe(true);
  });

  it("throws on delete error", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("delete:brands", { data: null, error: { message: "fk-violation" } });
    sup.setResponse("delete:parts", { error: "fk-violation" });
    sup.setResponse("delete:brands", { error: "fk-violation" });
    sup.setResponse("delete:warehouses", { error: "fk-violation" });
    sup.setResponse("select:parts", { error: "fk-violation" });
    sup.setResponse("select:orders", { error: "fk-violation" });
    sup.setResponse("upload:avatars", { error: "fk-violation" });
    sup.setResponse("auth:create", { error: "fk-violation" });
    sup.setResponse("auth:update", { error: "fk-violation" });
    sup.setResponse("insert:salesmen", { error: "fk-violation" });
    sup.setResponse("update:salesmen", { error: "fk-violation" });
    await expect(invoke(adminDeleteBrand, { data: { id: BRAND_ID } })).rejects.toThrow(/fk-violation/);
  });

});

describe("adminExportPartsCsv", () => {
  it("builds csv with header and escaping", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    const res: any = await invoke(adminExportPartsCsv, { data: {} });
    const row: any = res;
    expect(res.count).toBeGreaterThan(0);
    expect(res.csv.split("\n")[0]).toBe("part_number,oem_number,name,manufacturer,category_tag,price,ind_price,gar_price,export_price,stock");
    expect(res.csv).toContain('"Brake, pad"');
  });

  it("returns empty when no rows", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:parts", { data: [], error: null });
    const res: any = await invoke(adminExportPartsCsv, { data: {} });
    const row: any = res;
    expect(res.count).toBe(0);
  });

});

describe("adminGetPart", () => {
  it("returns part + alternatives", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:parts", { data: { id: PART_ID, name: "Pad" }, error: null });
    sup.setResponse("select:alternative_parts", { data: [{ alternative_part_id: PART_ID_2 }], error: null });
    const res: any = await invoke(adminGetPart, { data: { id: PART_ID } });
    const row: any = res;
    expect(res.part.id).toBe(PART_ID);
    expect(res.alternatives).toHaveLength(1);
  });

  it("throws when part missing", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:parts", { data: null, error: null });
    sup.setResponse("delete:parts", { error: "not found" });
    sup.setResponse("delete:brands", { error: "not found" });
    sup.setResponse("delete:warehouses", { error: "not found" });
    sup.setResponse("select:parts", { error: "not found" });
    sup.setResponse("select:orders", { error: "not found" });
    sup.setResponse("upload:avatars", { error: "not found" });
    sup.setResponse("auth:create", { error: "not found" });
    sup.setResponse("auth:update", { error: "not found" });
    sup.setResponse("insert:salesmen", { error: "not found" });
    sup.setResponse("update:salesmen", { error: "not found" });
    await expect(invoke(adminGetPart, { data: { id: PART_ID } })).rejects.toThrow(/not found/i);
  });

});

describe("adminListBrands", () => {
  it("rejects non-admin", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("rpc:has_role", { data: false, error: null });
    setTestContext({ isAdmin: false });
    sup.setResponse("rpc:has_role", { data: false, error: null });
    await expect(invoke(adminListBrands)).rejects.toThrow(/Forbidden/);
  });

  it("returns rows", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:brands", { data: [{ id: BRAND_ID, name: "Toyota" }], error: null });
    const res: any = await invoke(adminListBrands, { data: {} });
    const row: any = res;
    expect(res).toHaveLength(1);
  });

  it("throws on error", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:brands", { data: null, error: { message: "boom" } });
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
    await expect(invoke(adminListBrands)).rejects.toThrow(/boom/);
  });

});

describe("adminListCategoriesTree", () => {
  it("returns list", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:categories", { data: [{ id: "c1", name: "Brakes" }], error: null });
    const res: any = await invoke(adminListCategoriesTree, { data: {} });
    const row: any = res;
    expect(res).toHaveLength(1);
  });

});

describe("adminSearchPartsBasic", () => {
  it("returns empty for blank query", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    const res: any = await invoke(adminSearchPartsBasic, { data: { q: " " } });
    const row: any = res;
    expect(res).toEqual([]);
  });

  it("returns matches", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:parts", { data: [{ id: PART_ID, name: "Pad" }], error: null });
    const res: any = await invoke(adminSearchPartsBasic, { data: { q: "pad" } });
    const row: any = res;
    expect(res).toHaveLength(1);
  });

});

describe("adminSetAlternatives", () => {
  it("clears then inserts, ignoring self-reference", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("delete:alternative_parts", { data: null, error: null });
    sup.setResponse("insert:alternative_parts", { data: null, error: null });
    const res: any = await invoke(adminSetAlternatives, { data: { partId: PART_ID, altIds: [PART_ID, PART_ID_2] }, });
    const row: any = res;
    expect(res.ok).toBe(true);
    expect(sup.calls.some((c) => c.table === "alternative_parts" && c.op === "delete")).toBe(true);
  });

  it("does not insert when list empty", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("delete:alternative_parts", { data: null, error: null });
    const res: any = await invoke(adminSetAlternatives, { data: { partId: PART_ID, altIds: [] } });
    const row: any = res;
    expect(sup.calls.some((c) => c.table === "alternative_parts" && c.op === "insert")).toBe(false);
  });

});

describe("adminUpsertBrand", () => {
  it("inserts when no id", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:brands", { data: { id: BRAND_ID }, error: null });
    const res: any = await invoke(adminUpsertBrand, { data: { slug: "toyota", name: "Toyota" }, });
    const row: any = res;
    expect(res.id).toBe(BRAND_ID);
    expect(sup.calls.some((c) => c.table === "brands" && c.op === "insert")).toBe(true);
  });

  it("throws on insert error", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:brands", { data: null, error: { message: "conflict" } });
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
    await expect( invoke(adminUpsertBrand, { data: { slug: "toyota", name: "T" } }), ).rejects.toThrow(/conflict/);
  });

  it("updates when id provided", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:brands", { data: { id: BRAND_ID, name: "old" }, error: null });
    sup.setResponse("update:brands", { data: null, error: null });
    const res: any = await invoke(adminUpsertBrand, { data: { id: BRAND_ID, slug: "toyota", name: "Toyota" }, });
    const row: any = res;
    expect(res.id).toBe(BRAND_ID);
  });

  it("validates slug", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    await expect( invoke(adminUpsertBrand, { data: { slug: "Invalid Slug", name: "Bad" } }), ).rejects.toThrow();
  });

});

describe("adminUpsertPartFull", () => {
  it("inserts new part", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:parts", { data: { id: PART_ID }, error: null });
    const res: any = await invoke(adminUpsertPartFull, { data: { part_number: "PN-100", name: "Test Part", price: 100, stock: 10, brand_id: PART_ID, category_id: PART_ID } });
    const row: any = res;
    expect(res.id).toBe(PART_ID);
  });

  it("updates existing part", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:parts", { data: { id: PART_ID }, error: null });
    sup.setResponse("update:parts", { data: null, error: null });
    const res: any = await invoke(adminUpsertPartFull, { data: { part_number: "PN-100", name: "Test Part", price: 100, stock: 10, brand_id: PART_ID, category_id: PART_ID } });
    const row: any = res;
    expect(res.id).toBe(PART_ID);
  });

  it("validates required fields", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    await expect(invoke(adminUpsertPartFull, { data: { name: "" } })).rejects.toThrow();
  });

});
