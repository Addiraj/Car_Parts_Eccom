import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { searchParts } from "@/lib/catalog.functions";
import { getMyWishlistIds, toggleWishlist, addToCart, requestPartSalesman } from "@/lib/account.functions";
import { formatAED } from "@/lib/format";
import { Search as SearchIcon, PackageSearch, MessageCircle, Headset, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useAuth } from "@/hooks/use-auth";
import { PartThumb } from "@/components/part-thumb";
import { PartCard } from "@/components/part-card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";

const schema = z.object({ q: z.string().optional().default("") });

export const Route = createFileRoute("/search")({
  validateSearch: schema,
  head: () => ({ meta: [{ title: "Search — Car Parts Dubai" }] }),
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const { t } = useI18n();
  const isAdmin = useIsAdmin();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [notFoundModalOpen, setNotFoundModalOpen] = useState(false);
  const [isRequested, setIsRequested] = useState(false);
  
  const requireSignIn = (message: string) => {
    toast.error(message);
    router.navigate({ to: "/auth/login", search: { redirect: window.location.pathname } });
  };
  
  const query = useQuery({
    queryKey: ["search", q],
    queryFn: () => searchParts({ data: { q } }),
    enabled: !!q,
  });

  useEffect(() => {
    if (q && query.data && query.data.parts.length === 0) {
      setNotFoundModalOpen(true);
      setIsRequested(false);
    } else {
      setNotFoundModalOpen(false);
    }
  }, [q, query.data]);

  const requestSalesmanMut = useMutation({
    mutationFn: (partNumber: string) => requestPartSalesman({ data: { partNumber } }),
    onSuccess: () => {
      setIsRequested(true);
      toast.success(`Our salesman will contact you shortly regarding REF OE: ${q}`);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to submit request");
    }
  });

  const handleContactSalesman = () => {
    if (!user) {
      requireSignIn("Please sign in to contact a salesman.");
      return;
    }
    requestSalesmanMut.mutate(q);
  };

  const waMsg = encodeURIComponent(`Hi, I'd like to enquire about part REF OE: ${q}`);
  const waUrl = `https://wa.me/971547516365?text=${waMsg}`;

  const { data: wishlistIds } = useQuery({
    queryKey: ["wishlist-ids", user?.id],
    queryFn: () => getMyWishlistIds(),
    enabled: !!user,
  });

  const toggleWishlistMut = useMutation({
    mutationFn: (partId: string) => toggleWishlist({ data: { partId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist-ids"] }),
    onError: (err) => {
      console.error(err);
      toast.error(err.message || "Failed to update wishlist");
    }
  });

  const addMut = useMutation({
    mutationFn: (partId: string) => addToCart({ data: { partId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success(t("addedToCart"));
    },
    onError: (err) => {
      console.error(err);
      toast.error(err.message || "Failed to add to cart");
    }
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">{t("searchResults")}</h1>
      <form action="/search" method="get" className="mt-4 flex max-w-2xl items-center rounded-md border bg-surface-2">
        <SearchIcon className="ms-3 h-4 w-4 text-muted-foreground" />
        <input name="q" defaultValue={q} placeholder={t("searchShort")} className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
        <button className="rounded-e-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">{t("search")}</button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Suggested Searches:</span>
        {[
          { label: "17227555715", type: "part" },
          { label: "11127570292", type: "part" },
          { label: "17217546491", type: "part" },
          { label: "WBAFR71020C725456 (VIN)", type: "vin", value: "WBAFR71020C725456" },
        ].map((item) => (
          <Link
            key={item.label}
            to={item.type === "vin" ? "/vin" : "/search"}
            search={item.type === "vin" ? ({ vin: item.value } as any) : { q: item.label }}
            className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 font-mono text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </div>

      {!q && <p className="mt-8 text-sm text-muted-foreground">{t("typeToBegin")}</p>}
      {q && query.isLoading && <p className="mt-8 text-sm text-muted-foreground">{t("searching")}</p>}
      {query.data && (
        <>
          {query.data.expanded && (
            <div className="mt-4 rounded-md border-s-4 border-primary bg-accent/40 px-3 py-2 text-xs">
              "{q}" → <span className="font-mono font-bold">{query.data.expanded}</span>
            </div>
          )}

          {query.data.categories.length > 0 && (
            <div className="mt-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("categoriesLabel")}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {query.data.categories.map((c: any) => (
                  <Link key={c.id} to="/category/$slug" params={{ slug: c.slug }}
                    className="rounded-md border bg-surface-2 px-3 py-1.5 text-sm hover:border-primary hover:text-primary">{c.name}</Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {query.data.parts.length} MATCHES
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {query.data.parts.map((p: any) => (
              <PartCard 
                key={p.id}
                part={p} 
                href={`/parts/${p.id}`}
                isWishlisted={wishlistIds?.includes(p.id)}
                onToggleWishlist={(id = p.id) => {
                  if (!user) requireSignIn(t("signInToAddWishlist"));
                  else toggleWishlistMut.mutate(id);
                }}
                onAddToCart={(id = p.id) => {
                  if (!user) requireSignIn(t("signInToAddCart"));
                  else addMut.mutate(id);
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* 'We couldn't find this part' modal when 0 matches found */}
      <Dialog open={notFoundModalOpen} onOpenChange={setNotFoundModalOpen}>
        <DialogContent className="max-w-md border border-border bg-card text-card-foreground p-6 shadow-2xl rounded-2xl dark:border-slate-800 dark:bg-[#0d111c] dark:text-white">
          <div className="flex flex-col items-center text-center py-2">
            <div className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
              <PackageSearch className="h-6 w-6" />
            </div>

            <h3 className="text-xl font-bold tracking-tight text-foreground dark:text-white mb-2">
              We couldn't find this part
            </h3>

            <p className="text-xs text-muted-foreground dark:text-slate-300 leading-relaxed max-w-sm">
              No results for <span className="text-muted-foreground/80 dark:text-slate-400 font-mono">REF OE:</span> <span className="font-bold text-foreground dark:text-white font-mono">{q}</span>. Our team can source it for you — request a callback and your salesman will get in touch.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 w-full">
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground text-xs font-semibold dark:border-slate-700 dark:bg-slate-900/80 dark:text-white dark:hover:bg-slate-800 transition-colors flex-1 min-w-[140px] py-2.5"
              >
                <MessageCircle className="h-4 w-4" />
                Enquire on WhatsApp
              </a>

              <button
                onClick={handleContactSalesman}
                disabled={requestSalesmanMut.isPending || isRequested}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold dark:border-blue-500/40 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/60 dark:hover:text-blue-300 transition-colors flex-1 min-w-[140px] py-2.5 disabled:opacity-60"
              >
                {isRequested ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Request sent
                  </>
                ) : (
                  <>
                    <Headset className="h-4 w-4" />
                    Contact salesman
                  </>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
