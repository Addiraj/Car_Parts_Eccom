import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyWishlist, toggleWishlist, addToCart } from "@/lib/account.functions";
import { Heart, LogIn } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { PartCard } from "@/components/part-card";
import { toast } from "sonner";

export const Route = createFileRoute("/wishlist")({
  head: () => ({ meta: [{ title: "Wishlist — Car Parts Dubai" }] }),
  component: WishlistPage,
});

function WishlistPage() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const { user } = useAuth();
  
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
      toast.success("Item removed from wishlist");
    },
  });

  const addMut = useMutation({
    mutationFn: (partId: string) => addToCart({ data: { partId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart-count"] });
      qc.invalidateQueries({ queryKey: ["cart"] });
      toast.success(t("addedToCart"));
    },
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-[1400px] px-5 py-32 md:px-10 md:py-40">
        <h1 className="font-display text-4xl font-medium tracking-[-0.03em]">{t("wishlist")}</h1>
        <div className="mt-8 grid place-items-center rounded-2xl border border-dashed bg-surface-2 p-16 text-center">
          <Heart className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">{t("signInToUseWishlist")}</p>
          <Link
            to="/auth/login"
            search={{ redirect: "/wishlist" }}
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <LogIn className="h-4 w-4" /> {t("signIn")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-12 md:px-10 md:py-16">
      <div className="flex flex-col gap-2 mb-8">
        <div className="flex items-center gap-3">
          <h1 className="font-display font-medium text-4xl sm:text-5xl tracking-[-0.03em] text-foreground">
            {t("wishlist")}
          </h1>
          {!isLoading && (
            <span className="rounded-full bg-muted border border-border px-3 py-1 text-xs font-semibold text-muted-foreground dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Your saved items and their superseded / alternate part numbers
        </p>
      </div>

      {isLoading && <p className="mt-8 text-sm text-muted-foreground">{t("loading")}</p>}
      
      {!isLoading && items.length === 0 && (
        <div className="mt-8 grid place-items-center rounded-2xl border border-dashed bg-surface-2 p-16 text-center">
          <Heart className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">{t("noSaved")}</p>
        </div>
      )}
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((it: any) => it.part && (
          <PartCard 
            key={it.id} 
            part={it.part} 
            isWishlisted={true}
            onToggleWishlist={(id = it.part.id) => rem.mutate(id)}
            onAddToCart={(id = it.part.id) => addMut.mutate(id)}
            supersededParts={it.part.part_alternative_parts}
          />
        ))}
      </div>
    </div>
  );
}
