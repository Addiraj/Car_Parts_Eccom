import { describe, it, expect } from "vitest";
import { fetchVinCatalog } from "@/lib/catalog.functions";
import { invoke } from "../../helpers/invoke";
import { mockFetchOnce } from "../../setup";

describe("fetchVinCatalog (server fn)", () => {
  it("validates brand and modelNumber are non-empty", async () => {
    await expect(invoke(fetchVinCatalog, { data: { brand: "", modelNumber: "" } })).rejects.toThrow();
  });

  it("returns 404 shape when upstream 404", async () => {
    mockFetchOnce({ ok: false, status: 404 });
    const res: any = await invoke(fetchVinCatalog, { data: { brand: "BMW", modelNumber: "E90" } });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(404);
    expect(res.error).toMatch(/not yet scraped/i);
  });

  it("returns error shape on other non-2xx", async () => {
    mockFetchOnce({ ok: false, status: 503 });
    const res: any = await invoke(fetchVinCatalog, { data: { brand: "BMW", modelNumber: "E90" } });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(503);
  });

  it("returns catalog on success", async () => {
    mockFetchOnce({ ok: true, json: { categories: [] } });
    const res: any = await invoke(fetchVinCatalog, { data: { brand: "BMW", modelNumber: "E90" } });
    expect(res.ok).toBe(true);
    expect(res.data).toBeDefined();
  });

  it("returns error on fetch rejection", async () => {
    mockFetchOnce({ reject: new Error("dns fail") });
    const res: any = await invoke(fetchVinCatalog, { data: { brand: "BMW", modelNumber: "E90" } });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("dns fail");
  });
});
