import { describe, it, expect } from "vitest";
import { decodeVinNHTSA } from "@/lib/vin.server";
import { getSupabase, mockFetchOnce } from "../../setup";

const VIN = "1HGBH41JXMN109186";

describe("decodeVinNHTSA", () => {
  it("returns null for invalid VIN without hitting the network", async () => {
    const res = await decodeVinNHTSA("not-a-vin");
    expect(res).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("returns cached payload when cache hit", async () => {
    const cached = { vin: VIN, make: "HONDA", model: "CIVIC", year: "2021", engine: null, trim: null, manufacturer: null, vehicleType: null, bodyClass: null };
    getSupabase().setResponse("select:vin_decode_cache", { data: { payload: cached }, error: null });
    const res = await decodeVinNHTSA(VIN);
    expect(res).toEqual(cached);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("fetches upstream on cache miss and normalizes response", async () => {
    getSupabase().setResponse("select:vin_decode_cache", { data: null, error: null });
    mockFetchOnce({ ok: true, json: { "Brand NAME": "TOYOTA", "Model Name": "CAMRY", "Manufacturer Year": "2020", Region: "JP" } });
    const res = await decodeVinNHTSA(VIN);
    expect(res).toMatchObject({ vin: VIN, make: "TOYOTA", model: "CAMRY", year: "2020", manufacturer: "JP" });
  });

  it("returns null when upstream responds not ok", async () => {
    getSupabase().setResponse("select:vin_decode_cache", { data: null, error: null });
    mockFetchOnce({ ok: false, status: 500 });
    const res = await decodeVinNHTSA(VIN);
    expect(res).toBeNull();
  });

  it("returns null when upstream throws (timeout/network)", async () => {
    getSupabase().setResponse("select:vin_decode_cache", { data: null, error: null });
    mockFetchOnce({ reject: new Error("timeout") });
    const res = await decodeVinNHTSA(VIN);
    expect(res).toBeNull();
  });

  it("returns null when upstream reports application error", async () => {
    getSupabase().setResponse("select:vin_decode_cache", { data: null, error: null });
    mockFetchOnce({ ok: true, json: { Error: "invalid vin" } });
    const res = await decodeVinNHTSA(VIN);
    expect(res).toBeNull();
  });
});
