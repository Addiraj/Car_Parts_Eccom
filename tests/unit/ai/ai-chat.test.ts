import { describe, it, expect, beforeEach } from "vitest";
import {
  listThreads,
  createThread,
  renameThread,
  deleteThread,
  getThreadMessages,
  getChatAnalytics,
  salesmanListAiLeads
} from "@/lib/ai-chat.functions";
import { getSupabase } from "../../setup";
import { setTestContext } from "../../helpers/serverfn-mock";
import { invoke } from "../../helpers/invoke";

const USER_ID = "33333333-3333-3333-3333-333355555555";
const THREAD_ID = "44444444-4444-4444-4444-444455555555";

beforeEach(() => {
  setTestContext({ userId: USER_ID, isAdmin: false });
});

describe("listThreads", () => {
  it("returns user's chat threads", async () => {
    const sup = getSupabase();
    sup.setResponse("select:ai_chat_threads", { 
      data: [{ id: THREAD_ID, title: "Test Thread", user_id: USER_ID }] 
    });
    
    const res: any = await invoke(listThreads, { data: {} });
    expect(res).toHaveLength(1);
    expect(res[0].title).toBe("Test Thread");
  });
});

describe("createThread", () => {
  it("creates a new thread", async () => {
    const sup = getSupabase();
    sup.setResponse("insert:ai_chat_threads", { 
      data: { id: THREAD_ID, title: "New conversation" } 
    });
    
    const res: any = await invoke(createThread, { data: {} });
    expect(res.id).toBeDefined();
    
    const insertCalls = sup.calls.filter(c => c.table === "ai_chat_threads" && c.op === "insert");
    expect(insertCalls.length).toBeGreaterThan(0);
  });
});

describe("renameThread", () => {
  it("updates thread title", async () => {
    const sup = getSupabase();
    const res: any = await invoke(renameThread, { data: { id: THREAD_ID, title: "Updated Title" } });
    expect(res.ok).toBe(true);
    
    const updateCalls = sup.calls.filter(c => c.table === "ai_chat_threads" && c.op === "update");
    expect(updateCalls.length).toBeGreaterThan(0);
  });
});

describe("deleteThread", () => {
  it("deletes thread", async () => {
    const sup = getSupabase();
    const res: any = await invoke(deleteThread, { data: { id: THREAD_ID } });
    expect(res.ok).toBe(true);
    
    const deleteCalls = sup.calls.filter(c => c.table === "ai_chat_threads" && c.op === "delete");
    expect(deleteCalls.length).toBeGreaterThan(0);
  });
});

describe("getThreadMessages", () => {
  it("returns messages for an owned thread", async () => {
    const sup = getSupabase();
    sup.setResponse("select:ai_chat_threads", { data: { id: THREAD_ID, user_id: USER_ID } });
    sup.setResponse("select:ai_chat_messages", { 
      data: [{ id: "m1", thread_id: THREAD_ID, role: "user", text: "Hello" }] 
    });
    
    const res: any = await invoke(getThreadMessages, { data: { id: THREAD_ID } });
    expect(res).toHaveLength(1);
    expect(res[0].text).toBe("Hello");
  });

  it("throws if thread not owned", async () => {
    const sup = getSupabase();
    sup.setResponse("select:ai_chat_threads", { data: null }); // Simulating not found for this user
    
    await expect(
      invoke(getThreadMessages, { data: { id: THREAD_ID } })
    ).rejects.toThrow(/Thread not found or forbidden/);
  });
});

describe("getChatAnalytics", () => {
  it("returns analytics payload for admins", async () => {
    const sup = getSupabase();
    setTestContext({ userId: "admin-1", isAdmin: true });
    sup.setResponse("rpc:has_role", { data: true });
    sup.setResponse("select:user_roles", { data: { role: "admin" } });
    sup.setResponse("select:ai_chat_threads", { data: [], count: 0 });
    sup.setResponse("select:ai_chat_messages", { data: [], count: 0 });
    sup.setResponse("select:ai_chat_events", { data: [] });
    sup.setResponse("select:ai_leads", { data: [] });
    
    const res: any = await invoke(getChatAnalytics, { data: { days: 7 } });
    expect(res.totalThreads).toBe(0);
    expect(res.totalMessages).toBe(0);
  });
});

describe("salesmanListAiLeads", () => {
  it("returns leads for a salesman", async () => {
    const sup = getSupabase();
    setTestContext({ userId: "salesman-1", isSalesman: true });
    sup.setResponse("rpc:has_role", { data: true });
    sup.setResponse("select:user_roles", { data: { role: "salesman" } });
    sup.setResponse("select:ai_leads", { data: [{ id: "l1", status: "new" }] });
    
    const res: any = await invoke(salesmanListAiLeads, { data: {} });
    expect(res).toHaveLength(1);
  });
});
