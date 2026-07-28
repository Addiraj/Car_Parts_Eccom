import { describe, it, expect } from "vitest";
import { checkIsAdmin, adminStats } from "@/lib/admin.functions";
import { invoke } from "../../helpers/invoke";
import { getSupabase } from "../../setup";

describe("checkIsAdmin", () => {
  it("returns isAdmin true when has_role admin succeeds", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    const res: any = await invoke(checkIsAdmin);
    expect(res.isAdmin).toBe(true);
  });

  it("returns false when neither admin nor super_admin", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: false, error: null });
    const res: any = await invoke(checkIsAdmin);
    expect(res.isAdmin).toBe(false);
    expect(res.isSuperAdmin).toBe(false);
  });
});

describe("requireAdmin middleware (via adminStats)", () => {
  it("rejects non-admin callers with Forbidden", async () => {
    getSupabase().setResponse("rpc:has_role", { data: false, error: null });
    await expect(invoke(adminStats)).rejects.toThrow(/Forbidden/);
  });

  it("allows admin callers", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:parts", { data: null, count: 42, error: null });
    sup.setResponse("select:orders", { data: [{ status: "placed", total: 100 }, { status: "shipped", total: 50 }], error: null });
    sup.setResponse("select:profiles", { data: null, count: 7, error: null });
    const res: any = await invoke(adminStats);
    expect(res).toMatchObject({ parts: 42, users: 7, orders: 2, revenue: 150 });
    expect(res.byStatus).toEqual({ placed: 1, shipped: 1 });
  });

  it("rejects when rpc returns error", async () => {
    getSupabase().setResponse("rpc:has_role", { data: null, error: { message: "oops" } });
    await expect(invoke(adminStats)).rejects.toThrow(/Forbidden/);
  });
});
