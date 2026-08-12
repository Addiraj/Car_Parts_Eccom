import { describe, it, expect, beforeEach } from "vitest";
import {
  getMyProfile,
  getMyGarage,
  addVehicle,
  getMyCart,
  addToCart,
  toggleWishlist,
  getMyWishlistCount
} from "@/lib/account.functions";
import { getSupabase } from "../../setup";
import { setTestContext } from "../../helpers/serverfn-mock";
import { invoke } from "../../helpers/invoke";

const USER_ID = "33333333-3333-3333-3333-333355555555";
const PART_ID = "11111111-1111-1111-1111-111155555555";

beforeEach(() => {
  setTestContext({ userId: USER_ID, isAdmin: false });
});

describe("getMyProfile", () => {
  it("returns user profile", async () => {
    const sup = getSupabase();
    sup.setResponse("select:profiles", { data: { id: USER_ID, full_name: "Test User", customer_type: "IND" } });
    
    const res: any = await invoke(getMyProfile, { data: {} });
    expect(res.id).toBe(USER_ID);
    expect(res.full_name).toBe("Test User");
  });
});

describe("getMyGarage", () => {
  it("returns user garage vehicles", async () => {
    const sup = getSupabase();
    sup.setResponse("select:garages", { data: [{ id: "v1", brand_name: "Toyota", model_name: "Camry" }] });
    
    const res: any = await invoke(getMyGarage, { data: {} });
    expect(res).toHaveLength(1);
    expect(res[0].brand_name).toBe("Toyota");
  });
});

describe("addVehicle", () => {
  it("adds a vehicle to garage", async () => {
    const sup = getSupabase();
    sup.setResponse("insert:garages", { data: { id: "new-vid", brand_name: "Honda", model_name: "Civic" } });
    
    const res: any = await invoke(addVehicle, { 
      data: { brand_name: "Honda", model_name: "Civic", set_default: true } 
    });
    
    expect(res.id).toBeDefined();
    
    const updateCalls = sup.calls.filter(c => c.table === "garages" && c.op === "update");
    expect(updateCalls.length).toBeGreaterThan(0); // Because set_default was true, it clears defaults first
  });
});

describe("cart functions", () => {
  it("addToCart adds new item if not exists", async () => {
    const sup = getSupabase();
    sup.setResponse("select:parts", { data: { id: PART_ID, stock: 10 } });
    sup.setResponse("select:cart_items", { data: null }); // Not in cart
    sup.setResponse("insert:cart_items", { data: { id: "c1" } });

    const res: any = await invoke(addToCart, { data: { partId: PART_ID, quantity: 2 } });
    expect(res.ok).toBe(true);

    const insertCalls = sup.calls.filter(c => c.table === "cart_items" && c.op === "insert");
    expect(insertCalls.length).toBeGreaterThan(0);
  });

  it("addToCart updates quantity if exists", async () => {
    const sup = getSupabase();
    sup.setResponse("select:parts", { data: { id: PART_ID, stock: 10 } });
    sup.setResponse("select:cart_items", { data: { id: "c1", quantity: 1 } }); // In cart

    const res: any = await invoke(addToCart, { data: { partId: PART_ID, quantity: 2 } });
    expect(res.ok).toBe(true);

    const updateCalls = sup.calls.filter(c => c.table === "cart_items" && c.op === "update");
    expect(updateCalls.length).toBeGreaterThan(0);
  });

  it("addToCart throws if out of stock", async () => {
    const sup = getSupabase();
    sup.setResponse("select:parts", { data: { id: PART_ID, stock: 0 } });
    
    await expect(
      invoke(addToCart, { data: { partId: PART_ID, quantity: 1 } })
    ).rejects.toThrow(/Out of stock/);
  });
});

describe("wishlist functions", () => {
  it("toggleWishlist adds item if not present", async () => {
    const sup = getSupabase();
    sup.setResponse("select:wishlist_items", { data: null }); // Not in wishlist
    sup.setResponse("insert:wishlist_items", { data: { id: "w1" } });
    
    const res: any = await invoke(toggleWishlist, { data: { partId: PART_ID } });
    expect(res.added).toBe(true);
  });

  it("toggleWishlist removes item if already present", async () => {
    const sup = getSupabase();
    sup.setResponse("select:wishlist_items", { data: { id: "w1" } }); // In wishlist
    
    const res: any = await invoke(toggleWishlist, { data: { partId: PART_ID } });
    expect(res.added).toBe(false);
    
    const deleteCalls = sup.calls.filter(c => c.table === "wishlist_items" && c.op === "delete");
    expect(deleteCalls.length).toBeGreaterThan(0);
  });

  it("getMyWishlistCount returns count", async () => {
    const sup = getSupabase();
    sup.setResponse("select:wishlist_items", { data: [{ id: "w1" }, { id: "w2" }] });
    
    const res: any = await invoke(getMyWishlistCount, { data: {} });
    expect(res.count).toBe(2);
  });
});
