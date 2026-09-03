export type CustomerType = "IND" | "GAR" | "EXP";

export function isCustomerType(v: unknown): v is CustomerType {
  return v === "IND" || v === "GAR" || v === "EXP";
}

export function customerTypeLabel(t: CustomerType): string {
  return t === "IND" ? "Individual" : t === "GAR" ? "Garage / Workshop" : "Bulk / Export";
}

/**
 * Resolve the price a viewer sees for a part based on their customer tier.
 *
 * Priority order (per tier):
 *   IND  → ind_price  → 0              (never fall back to base rate price)
 *   GAR  → gar_price  → ind_price → 0
 *   EXP  → export_price → ind_price → 0
 *
 * The base `price` column is the admin rate/wholesale price and must NOT be
 * shown to customers — only staff views (isAdmin) should read it directly.
 */
export function resolvePrice(
  part: {
    ind_price?: number | string | null;
    gar_price?: number | string | null;
    export_price?: number | string | null;
    price?: number | string | null;
  } | null | undefined,
  tier: CustomerType,
): number {
  if (!part) return 0;

  const toNum = (v: number | string | null | undefined): number | null => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const indPrice = toNum(part.ind_price);

  if (tier === "GAR") {
    return toNum(part.gar_price) ?? indPrice ?? 0;
  }
  if (tier === "EXP") {
    return toNum(part.export_price) ?? indPrice ?? 0;
  }
  // IND (default) — use ind_price only; do NOT fall back to wholesale rate
  return indPrice ?? 0;
}

/** Strip private tier columns from a part record and replace `price` with the resolved value. */
export function projectPart<T extends Record<string, any>>(part: T, tier: CustomerType): T {
  if (!part) return part;
  const { ind_price, gar_price, export_price, ...rest } = part as any;
  return { ...rest, price: resolvePrice(part as any, tier) } as T;
}
