import { describe, it, expect, beforeEach } from "vitest";
import {
  listAdminNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/admin.notifications.functions";
import { invoke } from "../../helpers/invoke";
import { getSupabase } from "../../setup";

const NOTIF_ID = "44444444-4444-4444-4444-444444444444";

beforeEach(() => {
  getSupabase().setResponse("rpc:has_role", { data: true, error: null });
});

describe("listAdminNotifications", () => {
  it("rejects invalid type filter", async () => {
    await expect(
      invoke(listAdminNotifications, { data: { type: "bogus" } }),
    ).rejects.toThrow();
  });

  it("merges read state into items", async () => {
    const sup = getSupabase();
    sup.setResponse("select:admin_notifications", {
      data: [
        { id: "n1", type: "order" },
        { id: "n2", type: "order" },
      ],
      count: 2,
      error: null,
    });
    sup.setResponse("select:admin_notification_reads", {
      data: [{ notification_id: "n1" }],
      error: null,
    });
    const res: any = await invoke(listAdminNotifications, { data: {} });
    expect(res.items.find((i: any) => i.id === "n1").read).toBe(true);
    expect(res.items.find((i: any) => i.id === "n2").read).toBe(false);
    expect(res.total).toBe(2);
  });

  it("rejects non-admin", async () => {
    getSupabase().setResponse("rpc:has_role", { data: false, error: null });
    await expect(invoke(listAdminNotifications, { data: {} })).rejects.toThrow(/Forbidden/);
  });
});

describe("getUnreadCount", () => {
  it("returns total when no reads", async () => {
    const sup = getSupabase();
    sup.setResponse("select:admin_notifications", { data: null, count: 5, error: null });
    sup.setResponse("select:admin_notification_reads", { data: [], error: null });
    const res: any = await invoke(getUnreadCount);
    expect(res.unread).toBe(5);
  });

  it("subtracts read count", async () => {
    const sup = getSupabase();
    // First call = total; second call = read count. Both share select:admin_notifications key.
    sup.setResponse("select:admin_notifications", { data: null, count: 3, error: null });
    sup.setResponse("select:admin_notification_reads", { data: [{ notification_id: "a" }, { notification_id: "b" }], error: null });
    const res: any = await invoke(getUnreadCount);
    // total=3, read=3 (same mock) → unread=0
    expect(res.unread).toBe(0);
  });
});

describe("markNotificationRead", () => {
  it("rejects invalid uuid", async () => {
    await expect(invoke(markNotificationRead, { data: { id: "not-uuid" } })).rejects.toThrow();
  });

  it("upserts read record", async () => {
    const sup = getSupabase();
    sup.setResponse("upsert:admin_notification_reads", { data: null, error: null });
    const res: any = await invoke(markNotificationRead, { data: { id: NOTIF_ID } });
    expect(res.ok).toBe(true);
    expect(sup.calls.some((c) => c.table === "admin_notification_reads" && c.op === "upsert")).toBe(true);
  });

  it("throws on db error", async () => {
    getSupabase().setResponse("upsert:admin_notification_reads", { data: null, error: { message: "conflict" } });
    await expect(invoke(markNotificationRead, { data: { id: NOTIF_ID } })).rejects.toThrow(/conflict/);
  });
});

describe("markAllNotificationsRead", () => {
  it("returns marked=0 when nothing new", async () => {
    const sup = getSupabase();
    sup.setResponse("select:admin_notifications", { data: [{ id: "n1" }], error: null });
    sup.setResponse("select:admin_notification_reads", { data: [{ notification_id: "n1" }], error: null });
    const res: any = await invoke(markAllNotificationsRead);
    expect(res.marked).toBe(0);
  });

  it("inserts rows for unread notifications", async () => {
    const sup = getSupabase();
    sup.setResponse("select:admin_notifications", { data: [{ id: "n1" }, { id: "n2" }], error: null });
    sup.setResponse("select:admin_notification_reads", { data: [], error: null });
    sup.setResponse("insert:admin_notification_reads", { data: null, error: null });
    const res: any = await invoke(markAllNotificationsRead);
    expect(res.marked).toBe(2);
  });
});
