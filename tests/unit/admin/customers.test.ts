import { describe, it, expect, beforeEach } from "vitest";
import {
  adminGetCustomer,
  adminApproveCustomer,
  adminSetCustomerStatus,
  adminCustomerStats,
} from "@/lib/admin.customers.functions";
import { invoke } from "../../helpers/invoke";
import { getSupabase } from "../../setup";

const CUSTOMER_ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  // default: admin allowed
  getSupabase().setResponse("rpc:has_role", { data: true, error: null });
});

describe("adminGetCustomer", () => {
  it("rejects when id is not a uuid", async () => {
    await expect(invoke(adminGetCustomer, { data: { id: "nope" } })).rejects.toThrow();
  });

  it("returns aggregated customer payload", async () => {
    const sup = getSupabase();
    sup.setResponse("select:profiles", { data: { id: CUSTOMER_ID, full_name: "Jane" }, error: null });
    sup.setResponse("select:user_roles", { data: [{ role: "customer" }], error: null });
    sup.setResponse("select:orders", { data: [{ id: "o1", total: 100 }, { id: "o2", total: 250 }], error: null });
    sup.setResponse("select:addresses", { data: [], error: null });
    sup.setResponse("select:wishlist_items", { data: [{ part_id: "p1" }], error: null });
    sup.setResponse("auth:" + CUSTOMER_ID, { data: { user: { email: "jane@example.com", email_confirmed_at: "2024-01-01" } }, error: null });

    const res: any = await invoke(adminGetCustomer, { data: { id: CUSTOMER_ID } });
    expect(res.email).toBe("jane@example.com");
    expect(res.orderCount).toBe(2);
    expect(res.totalSpend).toBe(350);
    expect(res.wishlistCount).toBe(1);
    expect(res.roles).toContain("customer");
  });

  it("throws when profile fetch errors", async () => {
    getSupabase().setResponse("select:profiles", { data: null, error: { message: "db-error" } });
    await expect(invoke(adminGetCustomer, { data: { id: CUSTOMER_ID } })).rejects.toThrow(/db-error/);
  });

  it("rejects non-admin callers", async () => {
    getSupabase().setResponse("rpc:has_role", { data: false, error: null });
    await expect(invoke(adminGetCustomer, { data: { id: CUSTOMER_ID } })).rejects.toThrow(/Forbidden/);
  });
});

describe("adminApproveCustomer", () => {
  it("marks profile active and logs audit", async () => {
    const sup = getSupabase();
    sup.setResponse("select:profiles", { data: { status: "pending" }, error: null });
    sup.setResponse("update:profiles", { data: null, error: null });
    sup.setResponse("insert:audit_logs", { data: null, error: null });
    const res: any = await invoke(adminApproveCustomer, { data: { id: CUSTOMER_ID } });
    expect(res.ok).toBe(true);
    expect(sup.calls.some((c) => c.op === "update")).toBe(true);
  });

  it("throws when update fails", async () => {
    const sup = getSupabase();
    sup.setResponse("select:profiles", { data: { status: "pending" }, error: null });
    sup.setResponse("update:profiles", { data: null, error: { message: "conflict" } });
    await expect(invoke(adminApproveCustomer, { data: { id: CUSTOMER_ID } })).rejects.toThrow(/conflict/);
  });
});

describe("adminSetCustomerStatus", () => {
  it("rejects invalid status values", async () => {
    await expect(
      invoke(adminSetCustomerStatus, { data: { id: CUSTOMER_ID, status: "bogus" as any } }),
    ).rejects.toThrow();
  });

  it("appends note to admin_notes", async () => {
    const sup = getSupabase();
    sup.setResponse("select:profiles", { data: { status: "active", admin_notes: "prev" }, error: null });
    sup.setResponse("update:profiles", { data: null, error: null });
    sup.setResponse("insert:audit_logs", { data: null, error: null });
    await invoke(adminSetCustomerStatus, {
      data: { id: CUSTOMER_ID, status: "suspended", note: "fraud" },
    });
    const updateCall = sup.calls.find((c) => c.op === "update");
    expect(updateCall).toBeDefined();
    expect(JSON.stringify(updateCall!.args)).toMatch(/fraud/);
    expect(JSON.stringify(updateCall!.args)).toMatch(/SUSPENDED/);
  });
});

describe("adminCustomerStats", () => {
  it("aggregates counts by status and type", async () => {
    getSupabase().setResponse("select:profiles", {
      data: [
        { status: "active", customer_type: "IND" },
        { status: "active", customer_type: "GAR" },
        { status: "pending", customer_type: "IND" },
        { status: "suspended", customer_type: "EXP" },
      ],
      error: null,
    });
    const res: any = await invoke(adminCustomerStats);
    expect(res.total).toBe(4);
    expect(res.byStatus).toEqual({ pending: 1, active: 2, suspended: 1 });
    expect(res.byType).toEqual({ IND: 2, GAR: 1, EXP: 1 });
  });
});
