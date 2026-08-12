/**
 * @vitest-environment jsdom
 */
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  MAX_ANON_VINS,
  getAnonVins,
  anonHasVin,
  anonCanDecode,
  recordAnonVin,
} from "@/lib/anon-vin-quota";

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; }
  };
})();
if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", { value: mockLocalStorage });
}

describe("anon-vin-quota", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") window.localStorage.clear();
  });

  it("starts empty", () => {
    expect(getAnonVins()).toEqual([]);
  });

  it("records and reads VINs, normalized to uppercase", () => {
    recordAnonVin("abc123");
    expect(getAnonVins()).toEqual(["ABC123"]);
    expect(anonHasVin("ABC123")).toBe(true);
    expect(anonHasVin("abc123")).toBe(true);
  });

  it("deduplicates repeated records", () => {
    recordAnonVin("v1");
    recordAnonVin("v1");
    expect(getAnonVins()).toHaveLength(1);
  });

  it("allows re-check of an already-recorded VIN even past quota", () => {
    for (let i = 0; i < MAX_ANON_VINS; i++) recordAnonVin(`vin${i}`);
    expect(anonCanDecode("VIN0")).toBe(true);
    expect(anonCanDecode("brand-new")).toBe(false);
  });

  it("permits new VINs while under quota", () => {
    expect(anonCanDecode("first")).toBe(true);
    recordAnonVin("first");
    expect(anonCanDecode("second")).toBe(true);
  });

  it("ignores blank input in recordAnonVin", () => {
    recordAnonVin("");
    expect(getAnonVins()).toEqual([]);
  });
});
