import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getMyWishlist, toggleWishlist, addToCart, requestPartSalesman } from "@/lib/account.functions";
import { Heart, LogIn, ShoppingCart, MessageCircle, ChevronRight, Headset, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useIsStaff } from "@/hooks/use-is-staff";
import { formatAED } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/wishlist/")({
  head: () => ({ meta: [{ title: "Wishlist — Car Parts Dubai" }] }),
  component: WishlistPage,
});

/* -------- Wishlist Part Card (matches reference screenshot style) -------- */
function WishlistPartCard({ item, isStaff, onRemove, onAddToCart }: {
  item: any;
  isStaff: boolean;
  onRemove: (id: string) => void;
  onAddToCart: (id: string) => void;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [requested, setRequested] = useState(false);

  const p = item.part;
  if (!p) return null;

  const stock = Number(p.stock ?? 0);
  const inStock = stock > 0;
  const brand = String(p.manufacturer || "GLOBAL").toUpperCase();

  // Filter alternates: regular customers only see in-stock alternates
  const visibleAlts = (p.part_alternative_parts || []).filter((sp: any) => {
    if (!sp.alternative_part) return false;
    if (!isStaff && Number(sp.alternative_part.stock ?? 0) <= 0) return false;
    return true;
  });
  const altCount = visibleAlts.length;

  const brandFontSize = brand.length <= 5
    ? "text-2xl"
    : brand.length <= 8
      ? "text-xl"
      : brand.length <= 11
        ? "text-sm sm:text-base"
        : "text-xs";

  const waMsg = encodeURIComponent(`Hi, I'd like to enquire about part REF OE:${p.part_number} — ${p.name}`);
  const waUrl = `https://wa.me/971547516365?text=${waMsg}`;

  const requestSalesmanMut = useMutation({
    mutationFn: (partNumber: string) =>
      requestPartSalesman({ data: { partNumber, name: p.name } }),
    onSuccess: () => {
      setRequested(true);
      toast.success(`Our salesman will contact you shortly regarding REF OE:${p.part_number}`);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to submit request");
    },
  });

  const handleContactSalesman = () => {
    if (!user) {
      toast.error("Please sign in to contact a salesman.");
      router.navigate({ to: "/auth/login", search: { redirect: window.location.pathname } });
      return;
    }
    requestSalesmanMut.mutate(p.part_number);
  };

  return (
    <div className="flex flex-col rounded-xl border-2 border-blue-100 bg-white text-card-foreground shadow-sm hover:shadow-lg hover:border-blue-300 transition-all overflow-hidden dark:bg-[#0d111c] dark:border-slate-700 dark:hover:border-blue-500/50 h-full">
      {/* Top section: Brand + Details */}
      <div className="flex flex-1">
        {/* Left side: Brand */}
        <div className="w-[28%] bg-blue-50/40 dark:bg-slate-900/60 flex items-center justify-center p-2.5 sm:p-4 border-r-2 border-blue-100 dark:border-slate-700 shrink-0 overflow-hidden">
          <span
            className={`font-black text-center text-blue-700 dark:text-blue-400 font-mono tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-full ${brandFontSize}`}
            title={brand}
          >
            {brand}
          </span>
        </div>

        {/* Right side: Details */}
        <div className="w-[72%] p-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-1 gap-2">
              <h3 className="font-bold text-[14px] uppercase leading-tight line-clamp-2 text-foreground dark:text-slate-100">
                {p.name}
              </h3>
              <button
                onClick={() => onRemove(p.id)}
                className="shrink-0 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors group"
                title="Remove from wishlist"
              >
                <Heart className="w-4 h-4 fill-blue-500 text-blue-500 dark:fill-blue-400 dark:text-blue-400 group-hover:fill-red-500 group-hover:text-red-500 transition-colors" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <div className="text-[11px] text-muted-foreground dark:text-slate-400 font-mono uppercase tracking-wide">
                REF OE:{p.part_number} · {brand}
              </div>
              {inStock ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase whitespace-nowrap shrink-0">
                  IN STOCK
                </span>
              ) : (
                <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800/50 px-2 py-0.5 rounded-full border border-red-200 uppercase whitespace-nowrap shrink-0">
                  OUT OF STOCK
                </span>
              )}
            </div>

            {/* Price */}
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-3">
              {formatAED(Number(p.price))}
            </div>

            {isStaff && (
              <>
                <div className="text-[10px] text-muted-foreground/70 dark:text-slate-500 font-bold mb-1 tracking-wider">ALL TIERS</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-3">
                  {[
                    { label: "RATE", val: p.price, accent: true },
                    { label: "IND", val: p.ind_price ?? p.price },
                    { label: "GAR", val: p.gar_price ?? p.price },
                    { label: "EXP", val: p.export_price ?? p.price },
                  ].map((t) => (
                    <div key={t.label} className="flex items-center text-[10px] rounded bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <span className={`font-bold px-2 py-0.5 w-11 text-center border-r ${t.accent ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>{t.label}</span>
                      <span className={`font-bold px-2 ${t.accent ? 'text-blue-600 dark:text-blue-400' : 'text-foreground dark:text-slate-200'}`}>{formatAED(Number(t.val))}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2">
            {inStock ? (
              <Button
                onClick={() => onAddToCart(p.id)}
                variant="default"
                size="sm"
                className="flex-1 h-9 text-[12px] font-semibold bg-[#2563eb] hover:bg-blue-700 text-white rounded-lg"
              >
                <ShoppingCart className="w-3.5 h-3.5 mr-2" /> Add to cart
              </Button>
            ) : (
              <button
                type="button"
                onClick={handleContactSalesman}
                disabled={requestSalesmanMut.isPending || requested}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border border-blue-500/40 bg-blue-50/80 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-900/60 dark:border-blue-800/60 font-semibold text-[12px] transition-colors disabled:opacity-60"
              >
                {requested ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Request sent
                  </>
                ) : (
                  <>
                    <Headset className="w-3.5 h-3.5" />
                    Contact salesman
                  </>
                )}
              </button>
            )}
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center h-9 w-9 p-0 rounded-lg border text-emerald-600 border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 dark:text-emerald-400 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 shrink-0 transition-colors"
              title="Enquire on WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Superseded / Alternate Numbers link */}
      {altCount > 0 && (
        <div className="border-t-2 border-blue-100 dark:border-slate-700 px-4 py-2.5 bg-blue-50/30 dark:bg-slate-900/40">
          <div className="flex items-center justify-between text-[12px] text-blue-600 dark:text-blue-400 font-semibold cursor-default">
            <span>{altCount} Superseded / Alternate {altCount === 1 ? 'Number' : 'Numbers'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      )}
    </div>
  );
}

/* -------- Main Page -------- */
function WishlistPage() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const { user } = useAuth();
  const isStaff = useIsStaff();

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
      qc.invalidateQueries({ queryKey: ["wishlist-ids"] });
      qc.invalidateQueries({ queryKey: ["wishlist-pns"] });
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
      {/* Header row with title + Get Quote button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex flex-col gap-1.5">
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

        {/* Big "Get Quote" Button */}
        {!isLoading && items.length > 0 && (
          <Link
            to="/wishlist/quote"
            className="inline-flex items-center gap-3 px-7 py-3.5 rounded-full bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-base shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] group self-start sm:self-auto"
          >
            Get quote
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/20 group-hover:bg-white/30 transition-colors">
              <ChevronRight className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        )}
      </div>

      {isLoading && <p className="mt-8 text-sm text-muted-foreground">{t("loading")}</p>}

      {!isLoading && items.length === 0 && (
        <div className="mt-8 grid place-items-center rounded-2xl border border-dashed bg-surface-2 p-16 text-center">
          <Heart className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">{t("noSaved")}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((it: any) => it.part && (
          <WishlistPartCard
            key={it.id}
            item={it}
            isStaff={isStaff}
            onRemove={(id) => rem.mutate(id)}
            onAddToCart={(id) => addMut.mutate(id)}
          />
        ))}
      </div>
    </div>
  );
}
