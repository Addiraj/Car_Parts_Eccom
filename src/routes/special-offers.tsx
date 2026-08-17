import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Filter as FilterIcon, Tag } from "lucide-react";
import { listActiveOffers, type OfferedPart } from "@/lib/offers.functions";
import { Countdown } from "@/components/countdown";
import { OfferCard } from "@/components/offer-card";
import { AuthGate } from "@/components/auth-gate";

export const Route = createFileRoute("/special-offers")({
  head: () => ({
    meta: [
      { title: "Special Offers — Fine Land International" },
      { name: "description", content: "Limited-time deals and discounts on OEM and aftermarket spare parts across the UAE." },
      { property: "og:title", content: "Special Offers — Fine Land International" },
      { property: "og:description", content: "Limited-time deals and discounts on OEM and aftermarket spare parts." },
    ],
  }),
  component: SpecialOffersPage,
});

function SpecialOffersPage() {
  const listOffersFn = useServerFn(listActiveOffers);
  const [brand, setBrand] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(0);
  const [sort, setSort] = useState<string>("highest-discount");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["special-offers", sort],
    queryFn: () => listOffersFn({ data: { sort } }),
  });

  const brands = useMemo(() => Array.from(new Set(offers.map((o) => o.manufacturer).filter(Boolean))) as string[], [offers]);
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    offers.forEach((o) => { if (o.category) map.set(o.category.slug, o.category.name); });
    return Array.from(map.entries());
  }, [offers]);

  const filtered = useMemo(() => {
    return offers.filter((o) => {
      if (brand && o.manufacturer !== brand) return false;
      if (category && o.category?.slug !== category) return false;
      if (minDiscount && o.discount_pct < minDiscount) return false;
      if (maxPrice && o.final_price > maxPrice) return false;
      return true;
    });
  }, [offers, brand, category, minDiscount, maxPrice]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  useEffect(() => setPage(1), [brand, category, minDiscount, maxPrice, sort]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const nextExpiring = useMemo(() => {
    if (!offers.length) return null;
    return [...offers].sort((a, b) => +new Date(a.offer.end_date) - +new Date(b.offer.end_date))[0]?.offer.end_date;
  }, [offers]);

  return (
    <AuthGate message="Please sign in to view our special offers.">
    <div>
      {/* Header */}
      <section className="border-b border-white/5 bg-surface/40">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-5 py-6 md:px-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-primary">
              <Sparkles className="h-3 w-3" /> Limited-time offers
            </div>
            <h1 className="mt-2 font-display text-3xl font-medium tracking-[-0.02em] md:text-4xl">
              Special Deals <span className="italic text-primary">&amp; Discounts</span>
            </h1>
          </div>
          {nextExpiring && (
            <div className="ms-auto inline-flex items-center gap-3 rounded-xl border border-white/10 bg-surface/80 px-4 py-2">
              <Tag className="h-4 w-4 text-primary" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Next offer ends in</div>
                <Countdown endIso={nextExpiring} />
              </div>
            </div>
          )}
        </div>
      </section>


      {/* Filters */}
      <section className="border-b border-white/5 bg-surface/40">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-5 py-4 md:px-10">
          <FilterIcon className="h-4 w-4 text-muted-foreground" />
          <select value={brand} onChange={(e) => setBrand(e.target.value)} className="rounded-md border bg-surface-2 px-3 py-1.5 text-sm">
            <option value="">All brands</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-md border bg-surface-2 px-3 py-1.5 text-sm">
            <option value="">All categories</option>
            {categories.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
          </select>
          <select value={minDiscount} onChange={(e) => setMinDiscount(Number(e.target.value))} className="rounded-md border bg-surface-2 px-3 py-1.5 text-sm">
            <option value={0}>Any discount</option>
            <option value={10}>10%+</option>
            <option value={20}>20%+</option>
            <option value={30}>30%+</option>
            <option value={50}>50%+</option>
          </select>
          <input type="number" placeholder="Max price (AED)" value={maxPrice || ""} onChange={(e) => setMaxPrice(Number(e.target.value) || 0)}
            className="w-36 rounded-md border bg-surface-2 px-3 py-1.5 text-sm" />
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort:</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-md border bg-surface-2 px-3 py-1.5 text-sm">
              <option value="highest-discount">Highest discount</option>
              <option value="lowest-price">Lowest price</option>
              <option value="expiring-soon">Expiring soon</option>
              <option value="newest">Newest offers</option>
            </select>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-[1400px] px-5 py-12 md:px-10 md:py-16">
        {isLoading && <p className="text-sm text-muted-foreground">Loading offers…</p>}
        {!isLoading && filtered.length === 0 && (
          <div className="grid place-items-center rounded-2xl border border-dashed border-white/10 bg-surface/40 p-16 text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">No active offers match your filters right now.</p>
            <Link to="/catalog" className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Browse catalog</Link>
          </div>
        )}
        {filtered.length > 0 && (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-wider text-muted-foreground">
              <span>{filtered.length} {filtered.length === 1 ? "offer" : "offers"} live</span>
              <span>Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pageItems.map((p: OfferedPart) => <OfferCard key={p.id} p={p} />)}
            </div>
            {pageCount > 1 && (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">
                  Previous
                </button>
                {Array.from({ length: pageCount }, (_, i) => i + 1).slice(Math.max(0, page - 3), Math.min(pageCount, page + 2)).map((n) => (
                  <button key={n} onClick={() => setPage(n)}
                    className={`h-9 min-w-9 rounded-md border px-3 text-sm font-semibold ${n === page ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                    {n}
                  </button>
                ))}
                <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount}
                  className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
    </AuthGate>
  );
}
