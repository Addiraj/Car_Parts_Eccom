export type CustomerType = "IND" | "GAR" | "EXP";

export function isCustomerType(v: unknown): v is CustomerType {
  return v === "IND" || v === "GAR" || v === "EXP";
}

export function customerTypeLabel(t: CustomerType): string {
  return t === "IND" ? "Individual" : t === "GAR" ? "Garage / Workshop" : "Bulk / Export";
}

/**
 * Resolve the price a viewer sees for a part based on their customer tier.
 * Falls back to the legacy `price` field when the tier column is null.
 */
export function resolvePrice(
  part: {
    ind_price?: number | string | null;
    gar_price?: number | string | null;
    export_price?: number | string | null;
  } | null | undefined,
  tier: CustomerType,
): number {
  if (!part) return 0;
  const pick =
    tier === "GAR" ? part.gar_price :
    tier === "EXP" ? part.export_price :
    part.ind_price;
  const chosen =
    pick != null && pick !== ""
      ? Number(pick)
      : tier !== "IND" && part.ind_price != null && part.ind_price !== ""
        ? Number(part.ind_price)
        : 0;
  return Number.isFinite(chosen) ? chosen : 0;
}

/** Strip private tier columns from a part record and replace `price` with the resolved value. */
export function projectPart<T extends Record<string, any>>(part: T, tier: CustomerType): T {
  if (!part) return part;
  const { ind_price, gar_price, export_price, ...rest } = part as any;
  return { ...rest, price: resolvePrice(part as any, tier) } as T;
}
