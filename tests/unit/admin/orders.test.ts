import { describe, it, expect, beforeEach } from "vitest";
import {
  adminListOrdersPaged,
  adminOrderStats,
  adminGetOrder,
  adminUpdateOrderStatus,
  adminSetTracking,
  adminRefundOrder,
  adminUpdateOrderNotes,
} from "@/lib/admin.orders.functions";
import { invoke } from "../../helpers/invoke";
import { getSupabase } from "../../setup";

const ORDER_ID = "22222222-2222-2222-2222-222222222222";

beforeEach(() => {
  getSupabase().setResponse("rpc:has_role", { data: true, error: null });
});

describe("adminListOrdersPaged", () => {
  it("returns rows with pagination metadata", async () => {
    getSupabase().setResponse("select:orders", {
      data: [{ id: "o1", status: "placed", total: 10 }],
      error: null,
      count: 1,
    });
    const res: any = await invoke(adminListOrdersPaged, { data: { page: 1, pageSize: 10 } });
    expect(res.items).toHaveLength(1);
    expect(res.total).toBe(1);
    expect(res.page).toBe(1);
  });

  it("rejects invalid status filter", async () => {
    await expect(
      invoke(adminListOrdersPaged, { data: { status: "bogus" as any } }),
    ).rejects.toThrow();
  });

  it("rejects non-admin", async () => {
    getSupabase().setResponse("rpc:has_role", { data: false, error: null });
    await expect(invoke(adminListOrdersPaged, { data: {} })).rejects.toThrow(/Forbidden/);
  });
});

describe("adminOrderStats", () => {
  it("summarizes revenue and by-status counts", async () => {
    const sup = getSupabase();
    sup.setResponse("select:orders", {
      data: [
        { status: "placed", total: 100 },
        { status: "delivered", total: 200 },
        { status: "delivered", total: 50 },
      ],
      error: null,
    });
    const res: any = await invoke(adminOrderStats);
    expect(res.total).toBe(3);
    expect(res.revenue).toBe(350);
    expect(res.byStatus.delivered).toBe(2);
  });
});

describe("adminGetOrder", () => {
  it("throws not-found for missing order", async () => {
    getSupabase().setResponse("select:orders", { data: null, error: null });
    await expect(invoke(adminGetOrder, { data: { id: ORDER_ID } })).rejects.toThrow(/not found/i);
  });

  it("returns order + items + events", async () => {
    const sup = getSupabase();
    sup.setResponse("select:orders", { data: { id: ORDER_ID, user_id: null }, error: null });
    sup.setResponse("select:order_items", { data: [{ id: "i1" }], error: null });
    sup.setResponse("select:order_events", { data: [{ id: "e1" }], error: null });
    const res: any = await invoke(adminGetOrder, { data: { id: ORDER_ID } });
    expect(res.order.id).toBe(ORDER_ID);
    expect(res.items).toHaveLength(1);
    expect(res.events).toHaveLength(1);
  });
});

describe("adminUpdateOrderStatus", () => {
  it("rejects invalid status", async () => {
    await expect(
      invoke(adminUpdateOrderStatus, { data: { id: ORDER_ID, status: "invalid" as any } }),
    ).rejects.toThrow();
  });

  it("updates status and writes an event", async () => {
    const sup = getSupabase();
    sup.setResponse("select:orders", { data: { status: "placed" }, error: null });
    sup.setResponse("update:orders", { data: null, error: null });
    sup.setResponse("insert:order_events", { data: null, error: null });
    sup.setResponse("insert:audit_logs", { data: null, error: null });
    const res: any = await invoke(adminUpdateOrderStatus, {
      data: { id: ORDER_ID, status: "shipped", note: "ship-note" },
    });
    expect(res.ok).toBe(true);
    expect(sup.calls.some((c) => c.table === "order_events" && c.op === "insert")).toBe(true);
  });

  it("throws when db update fails", async () => {
    const sup = getSupabase();
    sup.setResponse("select:orders", { data: { status: "placed" }, error: null });
    sup.setResponse("update:orders", { data: null, error: { message: "db-fail" } });
    await expect(
      invoke(adminUpdateOrderStatus, { data: { id: ORDER_ID, status: "confirmed" } }),
    ).rejects.toThrow(/db-fail/);
  });
});

describe("adminSetTracking", () => {
  it("persists courier + tracking number", async () => {
    const sup = getSupabase();
    sup.setResponse("update:orders", { data: null, error: null });
    sup.setResponse("insert:order_events", { data: null, error: null });
    const res: any = await invoke(adminSetTracking, {
      data: { id: ORDER_ID, courier: "DHL", tracking_number: "TN123" },
    });
    expect(res.ok).toBe(true);
  });

  it("rejects invalid tracking url", async () => {
    await expect(
      invoke(adminSetTracking, { data: { id: ORDER_ID, tracking_url: "not-a-url" } }),
    ).rejects.toThrow();
  });
});

describe("adminRefundOrder", () => {
  it("rejects refund exceeding total", async () => {
    getSupabase().setResponse("select:orders", { data: { total: 100, refund_amount: 0 }, error: null });
    await expect(
      invoke(adminRefundOrder, { data: { id: ORDER_ID, amount: 200, reason: "too much" } }),
    ).rejects.toThrow(/exceeds/i);
  });

  it("throws when order missing", async () => {
    getSupabase().setResponse("select:orders", { data: null, error: null });
    await expect(
      invoke(adminRefundOrder, { data: { id: ORDER_ID, amount: 10, reason: "n/a" } }),
    ).rejects.toThrow(/not found/i);
  });

  it("processes a valid refund", async () => {
    const sup = getSupabase();
    sup.setResponse("select:orders", { data: { total: 100, refund_amount: 0 }, error: null });
    sup.setResponse("update:orders", { data: null, error: null });
    sup.setResponse("insert:order_events", { data: null, error: null });
    const res: any = await invoke(adminRefundOrder, {
      data: { id: ORDER_ID, amount: 50, reason: "damaged" },
    });
    expect(res.ok).toBe(true);
  });
});

describe("adminUpdateOrderNotes", () => {
  it("saves internal note", async () => {
    getSupabase().setResponse("update:orders", { data: null, error: null });
    const res: any = await invoke(adminUpdateOrderNotes, {
      data: { id: ORDER_ID, internal_notes: "confidential" },
    });
    expect(res.ok).toBe(true);
  });

  it("rejects notes over 2000 chars", async () => {
    await expect(
      invoke(adminUpdateOrderNotes, { data: { id: ORDER_ID, internal_notes: "x".repeat(2001) } }),
    ).rejects.toThrow();
  });
});
