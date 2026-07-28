import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getRecentlyViewed } from "@/lib/orders.functions";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { formatAED } from "@/lib/format";
import { PartThumb } from "@/components/part-thumb";

export function RecentlyViewed() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const { data = [] } = useQuery({
    queryKey: ["recently-viewed"],
    queryFn: () => getRecentlyViewed(),
    enabled: !!user,
  });
  if (!user || data.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-lg font-semibold tracking-tight">Recently viewed</h2>
      <div className="mt-3 -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {data.map((r: any) => r.part && (
          <Link key={r.part_id} to="/parts/$id" params={{ id: r.part.id }}
            className="w-40 shrink-0 overflow-hidden rounded-lg border bg-surface hover:border-primary">
            <div className="aspect-square bg-surface-2">
              <PartThumb src={r.part.images?.[0]} alt={r.part.name} />
            </div>
            <div className="p-2">
              <div className="line-clamp-2 text-xs font-medium">{r.part.name}</div>
              {!isAdmin && <div className="mt-1 text-xs font-bold text-primary">{formatAED(Number(r.part.price))}</div>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
