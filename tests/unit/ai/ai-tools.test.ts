import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildAssistantTools } from "@/lib/ai-tools.server";
import { getSupabase } from "../../setup";

const USER_ID = "33333333-3333-3333-3333-333355555555";
const THREAD_ID = "44444444-4444-4444-4444-444455555555";
const PART_ID = "11111111-1111-1111-1111-111155555555";

const mockCtx = {
  userId: USER_ID,
  threadId: THREAD_ID,
  logEvent: vi.fn(),
};

beforeEach(() => {
  mockCtx.logEvent.mockClear();
});

describe("AI Tools", () => {
  it("searchPartsByNumber tool searches parts", async () => {
    const tools = buildAssistantTools(mockCtx);
    const sup = getSupabase();
    // sequelize.query mocked in db-mock returns []
    const res = await tools.searchPartsByNumber.execute({ query: "brake", brand: "toyota" }, {} as any);
    expect(res.results).toEqual([]);
    expect(mockCtx.logEvent).toHaveBeenCalledWith("part_search", expect.any(Object));
  });

  it("checkStock tool returns part stock", async () => {
    const tools = buildAssistantTools(mockCtx);
    const sup = getSupabase();
    sup.setResponse("select:parts", { data: { id: PART_ID, stock: 10, low_stock_threshold: 5 } });
    
    const res = await tools.checkStock.execute({ partId: PART_ID }, {} as any);
    expect(res.stock).toBe(10);
    expect(res.status).toBe("in_stock");
  });

  it("checkStock tool returns out_of_stock status", async () => {
    const tools = buildAssistantTools(mockCtx);
    const sup = getSupabase();
    sup.setResponse("select:parts", { data: { id: PART_ID, stock: 0, low_stock_threshold: 5 } });
    
    const res = await tools.checkStock.execute({ partId: PART_ID }, {} as any);
    expect(res.stock).toBe(0);
    expect(res.status).toBe("out_of_stock");
  });

  it("addToCart tool adds part to cart", async () => {
    const tools = buildAssistantTools(mockCtx);
    const sup = getSupabase();
    sup.setResponse("select:parts", { data: { id: PART_ID, price: 100 } });
    sup.setResponse("select:cart_items", { data: null }); // Not in cart
    sup.setResponse("insert:cart_items", { data: { id: "c1" } });
    
    const res = await tools.addToCart.execute({ partId: PART_ID, quantity: 2 }, {} as any);
    expect(res.ok).toBe(true);
    expect(res.quantity).toBe(2);
    expect(mockCtx.logEvent).toHaveBeenCalledWith("cart_add", expect.any(Object));
  });

  it("viewCart tool returns cart items", async () => {
    const tools = buildAssistantTools(mockCtx);
    const sup = getSupabase();
    sup.setResponse("select:cart_items", { 
      data: [{ quantity: 2, part: { id: PART_ID, price: 100 } }] 
    });
    
    const res = await tools.viewCart.execute({}, {} as any);
    expect(res.total).toBe(200);
    expect(res.items).toHaveLength(1);
  });

  it("createQuotation tool creates a quote from parts", async () => {
    const tools = buildAssistantTools(mockCtx);
    const sup = getSupabase();
    sup.setResponse("select:parts", { data: { id: PART_ID, price: 100 } });
    sup.setResponse("insert:quotations", { data: { id: "q1" } });
    sup.setResponse("select:profiles", { data: { id: USER_ID, full_name: "Test User" } });
    
    const res = await tools.createQuotation.execute({ items: [{ partId: PART_ID, quantity: 1 }] }, {} as any);
    expect(res.ok).toBe(true);
    expect(res.subtotal).toBe(100);
    expect(res.tax_amount).toBe(5);
    expect(res.grand_total).toBe(105);
    expect(mockCtx.logEvent).toHaveBeenCalledWith("quotation_created", expect.any(Object));
  });

  it("createLead tool creates a lead", async () => {
    const tools = buildAssistantTools(mockCtx);
    const sup = getSupabase();
    sup.setResponse("select:customer_assignments", { data: null });
    sup.setResponse("select:profiles", { data: { id: USER_ID, full_name: "Test User" } });
    sup.setResponse("insert:ai_leads", { data: { id: "l1" } });
    
    const res = await tools.createLead.execute({ reason: "Need help with bulk order" }, {} as any);
    expect(res.ok).toBe(true);
    expect(res.lead.id).toBeDefined();
    expect(mockCtx.logEvent).toHaveBeenCalledWith("lead_created", expect.any(Object));
  });
});
