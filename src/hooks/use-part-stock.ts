import { useQuery } from "@tanstack/react-query";
import { getPartStock } from "@/lib/inventory.functions";

export function useInventoryCheck(partId: string | undefined | null, opts?: { initialStock?: number | null }) {
  const enabled = !!partId;
  const q = useQuery({
    queryKey: ["part-stock", partId],
    queryFn: () => getPartStock({ data: { id: partId as string } }),
    enabled,
    initialData:
      opts?.initialStock != null
        ? { stock: Number(opts.initialStock) }
        : undefined,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const stock = Number(q.data?.stock ?? opts?.initialStock ?? 0);
  return {
    stock,
    isOutOfStock: enabled && !q.isLoading && stock <= 0,
    isLoading: q.isLoading,
    refetch: q.refetch,
  };
}
