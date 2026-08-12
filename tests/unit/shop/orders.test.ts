import { describe, it, expect, beforeEach } from "vitest";
import {
  placeOrder,
  cancelOrder,
  validateCoupon,
  trackView,
  getMyOrders,
  getOrder
} from "@/lib/orders.functions";
import { getSupabase } from "../../setup";
import { setTestContext } from "../../helpers/serverfn-mock";
import { invoke } from "../../helpers/invoke";

const USER_ID = "33333333-3333-3333-3333-333355555555";
const ADDR_ID = "44444444-4444-4444-4444-444455555555";
const PART_ID = "11111111-1111-1111-1111-111155555555";
const ORDER_ID = "66666666-6666-6666-6666-666655555555";

beforeEach(() => {
  setTestContext({ userId: USER_ID, isAdmin: false });
});

describe("validateCoupon", () => {
  it("rejects invalid code", async () => {
    const sup = getSupabase();
    sup.setResponse("select:coupons", { data: null });
    const res: any = await invoke(validateCoupon, { data: { code: "INVALID", subtotal: 100 } });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Invalid code/);
  });

  it("applies percentage discount", async () => {
    const sup = getSupabase();
    sup.setResponse("select:coupons", {
      data: { code: "DISCOUNT10", active: true, discount_type: "percent", discount_value: 10, min_order: 50 }
    });
    const res: any = await invoke(validateCoupon, { data: { code: "DISCOUNT10", subtotal: 200 } });
    expect(res.ok).toBe(true);
    expect(res.discount).toBe(20);
  });
});

describe("placeOrder", () => {
  it("throws if cart is empty", async () => {
    const sup = getSupabase();
    sup.setResponse("select:addresses", { data: { id: ADDR_ID, emirate: "Dubai" } });
    sup.setResponse("select:profiles", { data: { customer_type: "IND" } });
    sup.setResponse("select:cart_items", { data: [] });
    
    await expect(
      invoke(placeOrder, { data: { address_id: ADDR_ID, payment_method: "cod" } })
    ).rejects.toThrow(/Cart is empty/);
  });

  it("places order and clears cart", async () => {
    const sup = getSupabase();
    sup.setResponse("select:addresses", {
      data: { id: ADDR_ID, emirate: "Dubai", full_name: "Test User", phone: "1234567" }
    });
    sup.setResponse("select:profiles", { data: { customer_type: "IND" } });
    sup.setResponse("select:cart_items", {
      data: [{ part_id: PART_ID, quantity: 2 }]
    });
    sup.setResponse("select:parts", {
      data: [{ id: PART_ID, ind_price: 100, price: 100 }]
    });
    sup.setResponse("select:shipping_zones", { data: { emirate: "Dubai", fee: 20, free_over: 500 } });
    sup.setResponse("insert:orders", { data: { id: "11111111-1111-1111-1111-111155555555" } });

    const res: any = await invoke(placeOrder, { data: { address_id: ADDR_ID, payment_method: "cod" } });
    expect(res.id).toBe("11111111-1111-1111-1111-111155555555");

    // Ensure cart was cleared (destroyed)
    const calls = sup.calls.filter(c => c.table === "cart_items" && c.op === "delete");
    expect(calls.length).toBeGreaterThan(0);
  });
});

describe("cancelOrder", () => {
  it("cancels a placed order", async () => {
    const sup = getSupabase();
    sup.setResponse("select:orders", {
      data: { id: ORDER_ID, status: "placed", user_id: USER_ID, payment_method: "cod" }
    });
    const res: any = await invoke(cancelOrder, { data: { id: ORDER_ID } });
    expect(res.ok).toBe(true);

    const updateCalls = sup.calls.filter(c => c.table === "orders" && c.op === "update");
    expect(updateCalls.length).toBeGreaterThan(0);
  });

  it("throws if order cannot be cancelled", async () => {
    const sup = getSupabase();
    sup.setResponse("select:orders", {
      data: { id: ORDER_ID, status: "shipped", user_id: USER_ID, payment_method: "cod" }
    });
    await expect(
      invoke(cancelOrder, { data: { id: ORDER_ID } })
    ).rejects.toThrow(/Cannot cancel at this stage/);
  });
});

describe("trackView", () => {
  it("upserts recently viewed record", async () => {
    const sup = getSupabase();
    sup.setResponse("upsert:recently_viewed", { data: null });
    sup.setResponse("select:parts", { data: { id: PART_ID, part_number: "TEST-1" } });
    
    const res: any = await invoke(trackView, { data: { partId: PART_ID } });
    expect(res.ok).toBe(true);
    
    const upsertCalls = sup.calls.filter(c => c.table === "recently_viewed" && c.op === "upsert");
    expect(upsertCalls.length).toBeGreaterThan(0);
  });
});
