import { describe, it, expect, beforeEach } from "vitest";
import {
  getBrands,
  getBrandWithModels,
  getCategories,
  getPart,
  getFeaturedParts,
  searchParts
} from "@/lib/catalog.functions";
import { getSupabase } from "../../setup";
import { setTestContext } from "../../helpers/serverfn-mock";
import { invoke } from "../../helpers/invoke";

const PART_ID = "11111111-1111-1111-1111-111155555555";
const BRAND_ID = "22222222-2222-2222-2222-222255555555";

beforeEach(() => {
  setTestContext({ userId: "anon", isAdmin: false });
});

describe("getBrands", () => {
  it("returns brands", async () => {
    const sup = getSupabase();
    sup.setResponse("select:brands", { data: [{ id: BRAND_ID, name: "Toyota", slug: "toyota" }] });
    const res: any = await invoke(getBrands, { data: {} });
    expect(res).toHaveLength(1);
    expect(res[0].slug).toBe("toyota");
  });
});

describe("getBrandWithModels", () => {
  it("returns brand with nested models", async () => {
    const sup = getSupabase();
    sup.setResponse("select:brands", { 
      data: { id: BRAND_ID, slug: "toyota", name: "Toyota", models: [{ id: "m1", slug: "corolla", name: "Corolla" }] } 
    });
    const res: any = await invoke(getBrandWithModels, { data: { slug: "toyota" } });
    expect(res.slug).toBe("toyota");
    expect(res.models).toHaveLength(1);
    expect(res.models[0].name).toBe("Corolla");
  });

  it("returns null if brand not found", async () => {
    const sup = getSupabase();
    sup.setResponse("select:brands", { data: null });
    const res: any = await invoke(getBrandWithModels, { data: { slug: "unknown" } });
    expect(res).toBeNull();
  });
});

describe("getPart", () => {
  it("returns part details, stripped for non-admin", async () => {
    const sup = getSupabase();
    // Simulate non-admin user tier
    sup.setResponse("select:parts", { 
      data: { 
        id: PART_ID, 
        name: "Brake Pad", 
        price: 100, 
        ind_price: 100, 
        gar_price: 80, 
        export_price: 70,
        specs: { weight: "1kg", "supplier rate": 50 } 
      } 
    });
    sup.setResponse("select:alternative_parts", { data: [] });

    const res: any = await invoke(getPart, { data: { id: PART_ID } });
    expect(res.part.name).toBe("Brake Pad");
    expect(res.part.price).toBe(100);
    // Specs should be stripped of sensitive keys
    expect(res.part.specs).toBeDefined();
    expect(res.part.specs["supplier rate"]).toBeUndefined();
    expect(res.part.specs.weight).toBe("1kg");
    expect(res.isAdmin).toBe(false);
  });
});

describe("searchParts", () => {
  it("returns matches using iLike", async () => {
    const sup = getSupabase();
    sup.setResponse("select:parts", { 
      data: [{ id: PART_ID, name: "Brake Pad", part_number: "BP-123" }] 
    });
    sup.setResponse("select:categories", { data: [] });

    const res: any = await invoke(searchParts, { data: { q: "brake" } });
    expect(res.parts).toHaveLength(1);
    expect(res.parts[0].name).toBe("Brake Pad");
  });

  it("returns empty arrays if query is blank", async () => {
    const res: any = await invoke(searchParts, { data: { q: "   " } });
    expect(res.parts).toHaveLength(0);
    expect(res.categories).toHaveLength(0);
  });
});
