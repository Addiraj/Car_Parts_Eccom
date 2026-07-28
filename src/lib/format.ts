export const formatAED = (n: number) =>
  new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 2 }).format(n);

export function formatAEDCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `AED ${(n / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  return `AED ${n.toFixed(0)}`;
}

