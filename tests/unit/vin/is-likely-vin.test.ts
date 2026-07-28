import { describe, it, expect } from "vitest";
import { isLikelyVin } from "@/lib/vin.server";

describe("isLikelyVin", () => {
  it("accepts a valid 17-char VIN", () => {
    expect(isLikelyVin("1HGBH41JXMN109186")).toBe(true);
  });

  it("trims whitespace", () => {
    expect(isLikelyVin("  1HGBH41JXMN109186  ")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isLikelyVin("1hgbh41jxmn109186")).toBe(true);
  });

  it.each([
    ["short", "1HG"],
    ["long", "1HGBH41JXMN1091860"],
    ["contains I", "1HGBH41JIMN109186"],
    ["contains O", "1HGBH41JOMN109186"],
    ["contains Q", "1HGBH41JQMN109186"],
    ["empty", ""],
    ["symbols", "1HGBH41JX-N109186"],
  ])("rejects %s", (_label, vin) => {
    expect(isLikelyVin(vin)).toBe(false);
  });
});
