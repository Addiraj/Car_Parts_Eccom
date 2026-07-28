import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyWishlist, toggleWishlist } from "@/lib/account.functions";
import { formatAED } from "@/lib/format";
import { Heart, LogIn } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { PartThumb } from "@/components/part-thumb";

export const Route = createFileRoute("/wishlist")({
  head: () => ({ meta: [{ title: "Wishlist — Car Parts Dubai" }] }),
  component: WishlistPage,
});

function WishlistPage() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => getMyWishlist(),
    enabled: !!user,
  });
  const rem = useMutation({
    mutationFn: (partId: string) => toggleWishlist({ data: { partId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wishlist"] });
      qc.invalidateQueries({ queryKey: ["wishlist-count"] });
    },
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">{t("wishlist")}</h1>
        <div className="mt-8 grid place-items-center rounded-lg border border-dashed bg-surface-2 p-12 text-center">
          <Heart className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">{t("signInToUseWishlist")}</p>
          <Link
            to="/auth/login"
            search={{ redirect: "/wishlist" }}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <LogIn className="h-4 w-4" /> {t("signIn")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{t("wishlist")}</h1>
      {isLoading && <p className="mt-6 text-sm text-muted-foreground">{t("loading")}</p>}
      {!isLoading && items.length === 0 && (
        <div className="mt-8 grid place-items-center rounded-lg border border-dashed bg-surface-2 p-12 text-center">
          <Heart className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">{t("noSaved")}</p>
        </div>
      )}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((it: any) => it.part && (
          <div key={it.id} className="group relative overflow-hidden rounded-lg border bg-surface">
            <Link to="/parts/$id" params={{ id: it.part.id }} className="block">
              <div className="aspect-square bg-surface-2">
                <PartThumb src={it.part.images?.[0]} alt={it.part.name} />
              </div>
              <div className="p-3">
                <div className="font-mono text-[10px] text-muted-foreground">{it.part.part_number}</div>
                <div className="mt-1 line-clamp-2 text-sm font-medium">{it.part.name}</div>
                {!isAdmin && <div className="mt-2 text-sm font-bold text-primary">{formatAED(Number(it.part.price))}</div>}
              </div>
            </Link>
            <button onClick={() => rem.mutate(it.part.id)} className="absolute end-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-surface/90 backdrop-blur hover:bg-destructive hover:text-destructive-foreground">
              <Heart className="h-4 w-4" fill="currentColor" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
