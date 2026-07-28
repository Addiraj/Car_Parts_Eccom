import { describe, it, expect, beforeEach } from "vitest";
import {
  adminListQuotations,
  adminQuotationStats,
  adminGetQuotation,
} from "@/lib/admin.quotations.functions";
import { invoke } from "../../helpers/invoke";
import { getSupabase } from "../../setup";

const QUOTE_ID = "33333333-3333-3333-3333-333333333333";

beforeEach(() => {
  getSupabase().setResponse("rpc:has_role", { data: true, error: null });
});

describe("adminListQuotations", () => {
  it("rejects invalid status filter", async () => {
    await expect(
      invoke(adminListQuotations, { data: { status: "bogus" as any } }),
    ).rejects.toThrow();
  });

  it("returns paged rows", async () => {
    getSupabase().setResponse("select:quotations", {
      data: [{ id: "q1" }, { id: "q2" }],
      count: 2,
      error: null,
    });
    const res: any = await invoke(adminListQuotations, { data: {} });
    expect(res.items).toHaveLength(2);
    expect(res.total).toBe(2);
    expect(res.page).toBe(1);
    expect(res.pageSize).toBe(25);
  });

  it("rejects non-admin", async () => {
    getSupabase().setResponse("rpc:has_role", { data: false, error: null });
    await expect(invoke(adminListQuotations, { data: {} })).rejects.toThrow(/Forbidden/);
  });
});

describe("adminQuotationStats", () => {
  it("computes counts and conversion rate", async () => {
    getSupabase().setResponse("select:quotations", {
      data: [
        { status: "draft", grand_total: 100 },
        { status: "sent", grand_total: 200 },
        { status: "converted", grand_total: 500 },
        { status: "approved", grand_total: 300 },
      ],
      error: null,
    });
    const res: any = await invoke(adminQuotationStats);
    expect(res.total).toBe(4);
    expect(res.converted).toBe(1);
    expect(res.approved).toBe(1);
    expect(res.pending).toBe(2); // draft + sent
    expect(res.totalValue).toBe(1100);
    expect(res.conversionRate).toBe(25);
  });
});

describe("adminGetQuotation (admin/salesman)", () => {
  it("rejects when neither admin nor salesman", async () => {
    getSupabase().setResponse("rpc:has_role", { data: false, error: null });
    await expect(invoke(adminGetQuotation, { data: { id: QUOTE_ID } })).rejects.toThrow(/Forbidden/);
  });

  it("throws for missing quotation", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:quotations", { data: null, error: null });
    await expect(invoke(adminGetQuotation, { data: { id: QUOTE_ID } })).rejects.toThrow(/not found/i);
  });

  it("returns quote for admin", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:quotations", { data: { id: QUOTE_ID, created_by: "someone-else" }, error: null });
    sup.setResponse("select:quotation_items", { data: [], error: null });
    sup.setResponse("select:quotation_events", { data: [], error: null });
    const res: any = await invoke(adminGetQuotation, { data: { id: QUOTE_ID } });
    expect(res.quote.id).toBe(QUOTE_ID);
  });
});
