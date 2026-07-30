import { describe, it, expect, beforeEach } from "vitest";
import {
  adminAssignCustomer,
  adminCreateSalesman,
  adminDeleteSalesman,
  adminGetSalesman,
  adminListAssignments,
  adminListSalesmen,
  adminResetSalesmanPassword,
  adminSetSalesmanStatus,
  adminUnassignCustomer,
  adminUpdateSalesman,
  getMyRoleInfo
} from "@/lib/admin.salesmen.functions";
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

describe("adminAssignCustomer / adminUnassignCustomer", () => {
  it("assign validates uuids", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    await expect( invoke(adminAssignCustomer, { data: { customer_id: "x", salesman_id: SM_ID } }), ).rejects.toThrow();
  });

  it("unassigns customer", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("delete:customer_assignments", { data: null, error: null });
    const res: any = await invoke(adminUnassignCustomer, { data: { customer_id: CUST_ID } });
    const row: any = res;
    expect(res.ok).toBe(true);
  });

});

describe("adminCreateSalesman", () => {
  it("creates auth user and salesman row", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("auth.createUser", { data: { user: { id: SM_ID } }, error: null });
    sup.setResponse("insert:user_roles", { data: null, error: null });
    sup.setResponse("insert:salesmen", { data: null, error: null });
    const res: any = await invoke(adminCreateSalesman, { data: { full_name: "Ali", email: "ali@x.com", password: "password123" }, });
    const row: any = res;
    expect(res.id).toBe(SM_ID);
  });

  it("rolls back auth user when salesmen insert fails", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("auth.createUser", { data: { user: { id: SM_ID } }, error: null });
    sup.setResponse("insert:user_roles", { data: null, error: null });
    sup.setResponse("insert:salesmen", { data: null, error: { message: "conflict" } });
    sup.setResponse("insert:salesmen", { error: "conflict" });
    await expect( invoke(adminCreateSalesman, { data: { full_name: "Ali", email: "a@x.com", password: "password123" }, }), ).rejects.toThrow(/conflict/);
    await expect(sup.calls.some((c) => c.op === "auth.deleteUser")).toBe(true);
  });

  it("throws when auth create fails", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("auth.createUser", { data: null, error: { message: "email-taken" } });
    sup.setResponse("delete:parts", { error: "email-taken" });
    sup.setResponse("delete:brands", { error: "email-taken" });
    sup.setResponse("delete:warehouses", { error: "email-taken" });
    sup.setResponse("select:parts", { error: "email-taken" });
    sup.setResponse("select:orders", { error: "email-taken" });
    sup.setResponse("upload:avatars", { error: "email-taken" });
    sup.setResponse("auth:create", { error: "email-taken" });
    sup.setResponse("auth:update", { error: "email-taken" });
    sup.setResponse("insert:salesmen", { error: "email-taken" });
    sup.setResponse("update:salesmen", { error: "email-taken" });
    await expect( invoke(adminCreateSalesman, { data: { full_name: "Ali", email: "a@x.com", password: "password123" }, }), ).rejects.toThrow(/email-taken/);
  });

  it("validates password length", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    await expect( invoke(adminCreateSalesman, { data: { full_name: "Ali", email: "a@x.com", password: "short" }, }), ).rejects.toThrow();
  });

});

describe("adminDeleteSalesman", () => {
  it("deletes assignments, row, and auth user", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("delete:customer_assignments", { data: null, error: null });
    sup.setResponse("delete:salesmen", { data: null, error: null });
    const res: any = await invoke(adminDeleteSalesman, { data: { id: SM_ID } });
    const row: any = res;
    expect(res.ok).toBe(true);
    expect(sup.calls.some((c) => c.op === "auth.deleteUser")).toBe(true);
  });

});

describe("adminGetSalesman", () => {
  it("rejects non-uuid", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    await expect(invoke(adminGetSalesman, { data: { id: "nope" } })).rejects.toThrow();
  });

  it("returns salesman detail", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:salesmen", { data: { id: SM_ID, full_name: "Ali" }, error: null });
    sup.setResponse("select:customer_assignments", { data: [], error: null });
    const res: any = await invoke(adminGetSalesman, { data: { id: SM_ID } });
    const row: any = res;
    expect(res.salesman.id).toBe(SM_ID);
  });

  it("throws when not found", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:salesmen", { data: null, error: { message: "PGRST116" } });
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
    await expect(invoke(adminGetSalesman, { data: { id: SM_ID } })).rejects.toThrow();
  });

});

describe("adminListAssignments", () => {
  it("filters out staff and joins assignments", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:salesmen", { data: [{ id: SM_ID }], error: null });
    sup.setResponse("select:profiles", { data: [{ id: CUST_ID, full_name: "Cust" }, { id: SM_ID, full_name: "Staff" }], error: null, });
    sup.setResponse("select:user_roles", { data: [{ user_id: SM_ID }], error: null });
    sup.setResponse("select:customer_assignments", { data: [{ customer_id: CUST_ID, salesman_id: SM_ID }], error: null, });
    const res: any = await invoke(adminListAssignments, { data: {} });
    const row: any = res;
    expect(res.customers).toHaveLength(1);
    expect(res.customers[0].id).toBe(CUST_ID);
    expect(res.customers[0].salesman_id).toBe(SM_ID);
  });

});

describe("adminListSalesmen", () => {
  it("rejects non-admin", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("rpc:has_role", { data: false, error: null });
    setTestContext({ isAdmin: false });
    sup.setResponse("rpc:has_role", { data: false, error: null });
    await expect(invoke(adminListSalesmen, { data: {} })).rejects.toThrow(/Forbidden/);
  });

  it("returns rows with assigned_count", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:salesmen", { data: [{ id: SM_ID, full_name: "Ali" }], error: null });
    sup.setResponse("select:customer_assignments", { data: [{ salesman_id: SM_ID }, { salesman_id: SM_ID }], error: null });
    const res: any = await invoke(adminListSalesmen, { data: {} });
    const row: any = res;
    expect(res[0].assigned_count).toBe(2);
  });

});

describe("adminResetSalesmanPassword", () => {
  it("calls auth admin update", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    const res: any = await invoke(adminResetSalesmanPassword, { data: { id: SM_ID, password: "newpassword123" }, });
    const row: any = res;
    expect(res.ok).toBe(true);
    expect(getSupabase().calls.some((c) => c.op === "auth.updateUserById")).toBe(true);
  });

  it("rejects short password", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    await expect( invoke(adminResetSalesmanPassword, { data: { id: SM_ID, password: "1" } }), ).rejects.toThrow();
  });

  it("throws when auth update fails", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("auth.updateUserById", { data: null, error: { message: "auth-fail" } });
    sup.setResponse("delete:parts", { error: "auth-fail" });
    sup.setResponse("delete:brands", { error: "auth-fail" });
    sup.setResponse("delete:warehouses", { error: "auth-fail" });
    sup.setResponse("select:parts", { error: "auth-fail" });
    sup.setResponse("select:orders", { error: "auth-fail" });
    sup.setResponse("upload:avatars", { error: "auth-fail" });
    sup.setResponse("auth:create", { error: "auth-fail" });
    sup.setResponse("auth:update", { error: "auth-fail" });
    sup.setResponse("insert:salesmen", { error: "auth-fail" });
    sup.setResponse("update:salesmen", { error: "auth-fail" });
    await expect( invoke(adminResetSalesmanPassword, { data: { id: SM_ID, password: "newpassword123" }, }), ).rejects.toThrow(/auth-fail/);
  });

});

describe("adminSetSalesmanStatus", () => {
  it("rejects invalid status", async () => {
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
    await expect( invoke(adminSetSalesmanStatus, { data: { id: SM_ID, status: "wrong" as any } }), ).rejects.toThrow();
  });

  it("updates status", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("update:salesmen", { data: null, error: null });
    const res: any = await invoke(adminSetSalesmanStatus, { data: { id: SM_ID, status: "inactive" }, });
    const row: any = res;
    expect(res.ok).toBe(true);
  });

});

describe("adminUpdateSalesman", () => {
  it("throws on error", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("update:salesmen", { data: null, error: { message: "fail" } });
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
    await expect( invoke(adminUpdateSalesman, { data: { id: SM_ID, full_name: "X" } }), ).rejects.toThrow(/fail/);
  });

  it("updates row", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("update:salesmen", { data: null, error: null });
    const res: any = await invoke(adminUpdateSalesman, { data: { id: SM_ID, full_name: "Ali B" }, });
    const row: any = res;
    expect(res.ok).toBe(true);
  });

});

describe("getMyRoleInfo", () => {
  it("reports false when no roles", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("rpc:has_role", { data: false, error: null });
    const res: any = await invoke(getMyRoleInfo, { data: {} });
    const row: any = res;
    expect(res.isAdmin).toBe(false);
    expect(res.isSalesman).toBe(false);
  });

  it("reports isAdmin/isSalesman flags", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("rpc:has_role", { data: true, error: null });
    const res: any = await invoke(getMyRoleInfo, { data: {} });
    const row: any = res;
    expect(res.isAdmin).toBe(true);
    expect(res.isSalesman).toBe(true);
  });

});
