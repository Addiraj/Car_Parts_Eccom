import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, queryOptions, keepPreviousData } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { listPartsPaged } from "@/lib/catalog.functions";
import { formatAED } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Reveal, TiltCard } from "@/components/motion-primitives";
import { PartThumb } from "@/components/part-thumb";
import { PartCard } from "@/components/part-card";
import { useAuth } from "@/hooks/use-auth";
import { getMyWishlistIds, toggleWishlist } from "@/lib/account.functions";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { SignInDialog } from "@/components/sign-in-dialog";
import { useState } from "react";

export const homePartsQO = (page: number) =>
  queryOptions({
    queryKey: ["home-parts", page],
    queryFn: () => listPartsPaged({ data: { page, pageSize: 24 } }),
  });

type Props = { page: number; basePath: "/" | "/products" };

export function AllParts({ page, basePath }: Props) {
  const { t } = useI18n();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const partsQuery = useQuery({ ...homePartsQO(page), placeholderData: keepPreviousData });
  const { items = [], total = 0, pageSize = 24 } = partsQuery.data ?? {};
  const isFetching = partsQuery.isFetching;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const { user } = useAuth();
  const qc = useQueryClient();
  const [signInOpen, setSignInOpen] = useState(false);

  const wishlistQ = useQuery({
    queryKey: ["wishlist-ids", user?.id],
    queryFn: () => getMyWishlistIds(),
    enabled: !!user,
  });
  const wishlistIds = wishlistQ.data || [];

  const toggleWishlistMut = useMutation({
    mutationFn: (partId: string) => toggleWishlist({ data: { partId } }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["wishlist-ids"] });
      qc.invalidateQueries({ queryKey: ["wishlist"] });
      qc.invalidateQueries({ queryKey: ["wishlist-count"] });
      toast.success(res?.added ? "Saved to wishlist" : "Removed from wishlist");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update wishlist");
    }
  });

  const goto = (p: number) => {
    const next = Math.min(pages, Math.max(1, p));
    if (next === page) return;
    void navigate({ to: basePath, search: { page: next }, replace: false });
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        document.getElementById("all-parts")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const windowed = (() => {
    const out: (number | "…")[] = [];
    const add = (n: number) => out.push(n);
    const last = pages;
    if (last <= 7) for (let i = 1; i <= last; i++) add(i);
    else {
      add(1);
      if (page > 3) out.push("…");
      for (let i = Math.max(2, page - 1); i <= Math.min(last - 1, page + 1); i++) add(i);
      if (page < last - 2) out.push("…");
      add(last);
    }
    return out;
  })();

  return (
    <section id="all-parts" className="mx-auto max-w-[1400px] px-5 py-32 md:px-10 md:py-40">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <Reveal>
          <div className="eyebrow">Catalog</div>
          <h2 className="mt-3 font-display font-medium leading-[0.95] tracking-[-0.03em]" style={{ fontSize: "clamp(36px, 5vw, 72px)" }}>
            Every part, <span className="italic text-foreground/60">all of it.</span>
          </h2>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground">
            {total.toLocaleString()} parts available. Showing page {page} of {pages}.
          </p>
        </Reveal>
        <Link to="/search" className="link-underline hidden text-sm uppercase tracking-[0.2em] md:inline-flex">
          Refine search
        </Link>
      </div>

      {items.length === 0 && !isFetching ? (
        <div className="mt-16 rounded-2xl border border-border/40 bg-surface/40 p-16 text-center">
          <div className="font-display text-2xl">No parts yet.</div>
          <p className="mt-3 text-sm text-muted-foreground">
            Admins can import a CSV from <span className="font-mono">/admin/parts</span>.
          </p>
        </div>
      ) : (
        <div className="relative mt-14">
          {isFetching && (
            <div className="pointer-events-none absolute right-0 top-[-2.5rem] flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading page {page}…
            </div>
          )}
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 transition-opacity duration-200 ${isFetching ? "opacity-60" : "opacity-100"}`}>
            {items.map((p: any) => (
              <Link key={p.id} to="/parts/$id" params={{ id: p.id }} className="group block h-full">
                <PartCard 
                  part={p} 
                  isWishlisted={wishlistIds.includes(p.id)}
                  onToggleWishlist={() => {
                    if (!user) setSignInOpen(true);
                    else toggleWishlistMut.mutate(p.id);
                  }}
                  supersededParts={p.part_alternative_parts}
                />
              </Link>
            ))}
          </div>
        </div>
      )}

      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />

      {pages > 1 && (
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => goto(page - 1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:opacity-30"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {windowed.map((n, i) =>
            n === "…" ? (
              <span key={`e-${i}`} className="px-2 text-muted-foreground">…</span>
            ) : (
              <button
                key={n}
                onClick={() => goto(n)}
                className={`h-10 min-w-10 rounded-full border px-3 text-sm tabular-nums transition ${
                  n === page
                    ? "border-primary bg-primary text-primary-foreground glow-blue"
                    : "border-white/10 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {n}
              </button>
            ),
          )}
          <button
            disabled={page >= pages}
            onClick={() => goto(page + 1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:opacity-30"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  );
}
