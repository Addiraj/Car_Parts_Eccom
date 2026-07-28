import { describe, it, expect } from "vitest";
import { decodeVin } from "@/lib/catalog.functions";
import { invoke } from "../../helpers/invoke";
import { mockFetchOnce } from "../../setup";

const VIN = "1HGBH41JXMN109186";

describe("decodeVin (server fn)", () => {
  it("rejects when VIN too short (validation)", async () => {
    await expect(invoke(decodeVin, { data: { vin: "abc" } })).rejects.toThrow();
  });

  it("rejects when VIN too long (validation)", async () => {
    await expect(invoke(decodeVin, { data: { vin: "A".repeat(30) } })).rejects.toThrow();
  });

  it("returns success payload on upstream 200", async () => {
    mockFetchOnce({ ok: true, json: { "Brand NAME": "BMW", "Model Name": "X5", "Manufacturer Year": "2019" } });
    const res: any = await invoke(decodeVin, { data: { vin: VIN } });
    expect(res.ok).toBe(true);
    expect(res).toMatchObject({ vin: VIN, make: "BMW", model: "X5", year: "2019" });
  });

  it("returns { ok: false } on upstream non-2xx", async () => {
    mockFetchOnce({ ok: false, status: 502 });
    const res: any = await invoke(decodeVin, { data: { vin: VIN } });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/502/);
  });

  it("returns { ok: false } when upstream reports Error field", async () => {
    mockFetchOnce({ ok: true, json: { Error: "bad vin" } });
    const res: any = await invoke(decodeVin, { data: { vin: VIN } });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("bad vin");
  });

  it("returns { ok: false } when fetch throws (network/timeout)", async () => {
    mockFetchOnce({ reject: new Error("network down") });
    const res: any = await invoke(decodeVin, { data: { vin: VIN } });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("network down");
  });
});
