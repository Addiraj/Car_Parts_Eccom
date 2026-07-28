import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { lookupPartsByNumbers, normalizePn, type AvailabilityEntry } from "@/lib/inventory.functions";

export function useBulkAvailability(partNumbers: string[] | undefined | null) {
  const list = useMemo(() => {
    const set = new Set<string>();
    for (const p of partNumbers ?? []) {
      const t = (p || "").trim();
      if (t) set.add(t);
    }
    return Array.from(set).sort();
  }, [partNumbers]);

  const key = list.join("|");
  const q = useQuery({
    queryKey: ["parts-availability", key],
    queryFn: () => lookupPartsByNumbers({ data: { part_numbers: list } }),
    enabled: list.length > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const map = (q.data ?? {}) as Record<string, AvailabilityEntry>;

  const get = (pn: string | undefined | null) => {
    const nk = normalizePn(pn || "");
    const entry = nk ? map[nk] : undefined;
    return {
      existsInInventory: !!entry,
      stock: entry?.stock ?? 0,
      isPurchasable: !!entry?.isPurchasable,
      partId: entry?.id,
      price: entry?.price ?? null,
      ind_price: entry?.ind_price ?? null,
      gar_price: entry?.gar_price ?? null,
      export_price: entry?.export_price ?? null,
    };
  };


  return { map, isLoading: q.isLoading, get };
}
