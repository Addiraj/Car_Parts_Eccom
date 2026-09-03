import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { getPart } from "@/lib/catalog.functions";
import { addToCart, toggleWishlist, getMyCart, getMyWishlist } from "@/lib/account.functions";
import { trackView } from "@/lib/orders.functions";
import { getActiveOffersForParts, computeOfferPrice } from "@/lib/offers.functions";
import { formatAED } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useIsSalesman } from "@/hooks/use-is-salesman";
import { Heart, ShoppingCart, ShieldCheck, Truck, Package, MessageCircle, Tag, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { RecentlyViewed } from "@/components/recently-viewed";
import { PartThumb } from "@/components/part-thumb";
import { SignInDialog } from "@/components/sign-in-dialog";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { NewQuotationDialog } from "@/components/admin/new-quotation-dialog";
import { Countdown } from "@/components/countdown";
import { useI18n } from "@/lib/i18n";

const qo = (id: string) => queryOptions({ queryKey: ["part", id], queryFn: () => getPart({ data: { id } }) });

export const Route = createFileRoute("/parts/$id")({
  loader: async ({ context, params }) => {
    const d = await context.queryClient.ensureQueryData(qo(params.id));
    if (!d) throw notFound();
    return d;
  },
  head: () => ({ meta: [{ title: "Part — Car Parts Dubai" }] }),
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center text-sm">Part not found.</div>,
  component: PartPage,
});

function PartPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(qo(id));
  const { user } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [qty, setQty] = useState(1);
  const [img, setImg] = useState(0);
  const [signInOpen, setSignInOpen] = useState(false);
  const [signInMessage, setSignInMessage] = useState<string | undefined>(undefined);
  const [wishlistOverride, setWishlistOverride] = useState<boolean | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const isAdminUser = useIsAdmin();
  const isSalesmanUser = useIsSalesman();
  const canQuote = isAdminUser || isSalesmanUser;

  const addMut = useMutation({
    mutationFn: () => addToCart({ data: { partId: id, quantity: qty } }),
    onSuccess: () => { toast.success(t("addToCart")); qc.invalidateQueries({ queryKey: ["cart"] }); qc.invalidateQueries({ queryKey: ["cart-count"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const wishMut = useMutation({
    mutationFn: () => toggleWishlist({ data: { partId: id } }),
    onSuccess: (r: any) => { setWishlistOverride(!!r.added); toast.success(r.added ? t("addToWishlist") : t("remove")); qc.invalidateQueries({ queryKey: ["wishlist"] }); qc.invalidateQueries({ queryKey: ["wishlist-count"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const { data: cart } = useQuery({ queryKey: ["cart"], queryFn: () => getMyCart(), enabled: !!user });
  const inCart = Array.isArray(cart) && cart.some((it: any) => it?.part?.id === id);
  const { data: wishlist } = useQuery({ queryKey: ["wishlist"], queryFn: () => getMyWishlist(), enabled: !!user });
  const queriedWishlist = Array.isArray(wishlist) && wishlist.some((it: any) => it?.part?.id === id);
  const inWishlist = wishlistOverride ?? queriedWishlist;

  if (!data) return null;
  const { part, alternatives, viewerTier, isAdmin } = data as any;
  const images: string[] = part.images?.length ? part.images : [];

  useEffect(() => { if (user) trackView({ data: { partId: id } }).catch(() => {}); }, [user, id]);
  useEffect(() => setWishlistOverride(null), [queriedWishlist, id]);

  const requireSignIn = (message: string) => {
    setSignInMessage(message);
    setSignInOpen(true);
  };
  const onAddToCart = () => user ? addMut.mutate() : requireSignIn(t("signInToAddCart"));
  const onToggleWishlist = () => user ? wishMut.mutate() : requireSignIn(t("signInToAddWishlist"));
  const waMsg = encodeURIComponent(`Hi, I'd like to enquire about part ${part.part_number} — ${part.name}`);
  const waUrl = `https://wa.me/971547516365?text=${waMsg}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="text-xs text-muted-foreground">
        <Link to="/catalog">{t("catalog")}</Link>
        {part.category && <> / <Link to="/category/$slug" params={{ slug: (part.category as any).slug }}>{(part.category as any).name}</Link></>}
        / <span className="text-foreground font-mono">{part.part_number}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* Gallery */}
        <div>
          <div className="aspect-square overflow-hidden rounded-lg border bg-surface">
            <PartThumb src={images[img]} alt={part.name} imgClassName="h-full w-full object-contain" />
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {images.map((src: string, i: number) => (
                <button key={i} onClick={() => setImg(i)}
                  className={`aspect-square overflow-hidden rounded border-2 ${img === i ? "border-primary" : "border-transparent"}`}>
                  <PartThumb src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="flex items-center gap-2">
            {part.is_oem && <span className="rounded bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">{t("genuineOem")}</span>}
            {part.manufacturer && <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">{part.manufacturer}</span>}
          </div>
          <h1 className="mt-2 text-2xl font-bold leading-tight">{part.name}</h1>
          <div className="mt-2 space-y-1 font-mono text-xs text-muted-foreground">
            <div>REF OE:<span className="text-foreground">{part.part_number}</span></div>
            {part.oem_number && <div>{t("oemNumber")}: <span className="text-foreground">{part.oem_number}</span></div>}
          </div>

          {!isAdmin && (
            <>
              <PriceBlock partId={id} price={Number(part.price)} stock={part.stock} viewerTier={viewerTier} isStaff={isAdminUser || isSalesmanUser} isSignedIn={!!user} t={t} />
            </>
          )}

          {part.description && <p className="mt-4 text-sm text-muted-foreground">{part.description}</p>}

          <div className="mt-6 flex items-center gap-2">
            <div className="flex items-center rounded-md border">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2 text-sm hover:bg-muted">−</button>
              <input type="number" value={qty} onChange={(e) => setQty(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
                className="w-12 bg-transparent py-2 text-center text-sm outline-none" />
              <button onClick={() => setQty((q) => Math.min(99, q + 1))} className="px-3 py-2 text-sm hover:bg-muted">+</button>
            </div>
            {inCart ? (
              <Link to="/cart"
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
                <ShoppingCart className="h-4 w-4" /> {t("seeCart")}
              </Link>
            ) : (
              <AddToCartButton
                partId={id}
                initialStock={part.stock}
                quantity={qty}
                className="flex-1 py-3"
              />
            )}
            <button onClick={onToggleWishlist}
              className={`grid h-12 w-12 place-items-center rounded-md border transition-colors ${inWishlist ? "border-destructive/50 bg-destructive/10 text-destructive" : "hover:border-primary hover:text-primary"}`}
              aria-label={t("wishlist")}
              aria-pressed={inWishlist}>
              <Heart className="h-5 w-5" fill={inWishlist ? "currentColor" : "none"} />
            </button>
          </div>

          {canQuote && (
            <button
              onClick={() => setQuoteOpen(true)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
            >
              <FileText className="h-4 w-4" /> Create Quotation
            </button>
          )}

          <a href={waUrl} target="_blank" rel="noreferrer"
            className="mt-3 flex items-center justify-center gap-2 rounded-md border border-success/40 bg-success/5 px-4 py-2 text-sm font-semibold text-success hover:bg-success/10">
            <MessageCircle className="h-4 w-4" /> {t("enquireWhatsapp")}
          </a>

          <ul className="mt-6 space-y-2 rounded-lg border bg-surface-2 p-4 text-xs">
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> {t("fitmentGuaranteed")}</li>
            <li className="flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> {t("uaeShip")}</li>
            <li className="flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> {t("genuineOem")}</li>
          </ul>

          {part.specs && Object.keys(part.specs as any).length > 0 && (
            <div className="mt-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("specifications")}</div>
              <table className="mt-2 w-full text-sm">
                <tbody className="divide-y">
                  {Object.entries(part.specs as any).map(([k, v]) => (
                    <tr key={k}><td className="py-2 pe-3 text-muted-foreground capitalize">{k.replace(/_/g, " ")}</td><td className="py-2 font-mono">{String(v)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {isAdmin && (
            <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-primary">Admin pricing</div>
              <table className="mt-2 w-full text-sm">
                <tbody className="divide-y">
                  <tr><td className="py-2 pe-3 text-muted-foreground">Rate Price</td><td className="py-2 font-mono">{formatAED(Number((part.specs as any)?.rate_price ?? (part.specs as any)?.["Rate Price"] ?? 0))}</td></tr>
                  <tr><td className="py-2 pe-3 text-muted-foreground">Individual (IND)</td><td className="py-2 font-mono">{formatAED(Number(part.ind_price ?? 0))}</td></tr>
                  <tr><td className="py-2 pe-3 text-muted-foreground">Garage (GAR)</td><td className="py-2 font-mono">{formatAED(Number(part.gar_price ?? 0))}</td></tr>
                  <tr><td className="py-2 pe-3 text-muted-foreground">Export (EXP)</td><td className="py-2 font-mono">{formatAED(Number(part.export_price ?? 0))}</td></tr>
                  <tr><td className="py-2 pe-3 text-muted-foreground">Stock quantity</td><td className="py-2 font-mono">{Number(part.stock ?? 0)}</td></tr>
                  <tr><td className="py-2 pe-3 text-muted-foreground">Stock status</td><td className={`py-2 font-semibold ${Number(part.stock ?? 0) > 0 ? "text-success" : "text-destructive"}`}>{Number(part.stock ?? 0) > 0 ? "In stock" : "Out of stock"}</td></tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold tracking-tight">Alternative parts</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {alternatives.map((a: any) => a.part && (
              <Link key={a.alternative_part_id} to="/parts/$id" params={{ id: a.part.id }}
                className="overflow-hidden rounded-lg border bg-surface hover:border-primary">
                <div className="aspect-square bg-surface-2"><PartThumb src={a.part.images?.[0]} alt={a.part.name} /></div>
                <div className="p-3">
                  <div className="font-mono text-[10px] text-muted-foreground">REF OE:{a.part.part_number}</div>
                  <div className="mt-1 line-clamp-2 text-sm font-medium">{a.part.name}</div>
                  {!isAdmin && <div className="mt-2 text-sm font-bold text-primary">
                    {Number(a.part.price) > 0 ? formatAED(Number(a.part.price)) : <span className="text-muted-foreground font-normal text-xs">Contact for price</span>}
                  </div>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <RecentlyViewed />
      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} message={signInMessage} />
      {canQuote && (
        <NewQuotationDialog
          open={quoteOpen}
          onOpenChange={setQuoteOpen}
          prefillPart={{
            id: part.id,
            part_number: part.part_number,
            oem_number: part.oem_number,
            name: part.name,
            manufacturer: part.manufacturer,
            price: Number(part.price ?? 0),
          }}
        />
      )}
    </div>
  );
}

function PriceBlock({ partId, price, stock, viewerTier, isStaff, isSignedIn, t }: { partId: string; price: number; stock: number; viewerTier: string | null; isStaff: boolean; isSignedIn: boolean; t: (k: any) => string }) {
  const { data: offers = {} as Record<string, any> } = useQuery({
    queryKey: ["part-offer", partId],
    queryFn: () => getActiveOffersForParts({ data: { partIds: [partId] } }),
  });
  const offer = offers[partId];
  const { final, discount } = offer ? computeOfferPrice(price, offer) : { final: price, discount: 0 };
  const pct = offer && price > 0 ? Math.round((discount / price) * 100) : 0;

  return (
    <>
      {offer && (
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-destructive-foreground">
          <Tag className="h-3.5 w-3.5" /> Special offer · −{pct}%
        </div>
      )}
      <div className="mt-3 flex items-baseline gap-3">
        <div className="text-3xl font-bold text-primary">
          {final > 0 ? formatAED(final) : <span className="text-xl text-muted-foreground font-medium">Contact for price</span>}
        </div>
        {offer && <div className="text-base text-muted-foreground line-through">{formatAED(price)}</div>}
        {isStaff && (
          <div className={`text-xs font-semibold ${stock > 0 ? "text-success" : "text-destructive"}`}>
            {stock > 0 ? `${t("inStock")} · ${stock}` : t("outOfStock")}
          </div>
        )}
      </div>
      {offer && (
        <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-surface-2 p-3">
          <span className="text-xs text-success font-semibold">You save {formatAED(discount)}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Offer ends in</span>
          <Countdown endIso={offer.end_date} compact />
        </div>
      )}
      {viewerTier && isSignedIn && (
        <div className="mt-2 text-[11px] text-muted-foreground">
          Your pricing tier: <span className="font-semibold text-foreground">{viewerTier === "GAR" ? "Garage / Workshop" : viewerTier === "EXP" ? "Bulk / Export" : "Individual"}</span>
        </div>
      )}
    </>
  );
}
