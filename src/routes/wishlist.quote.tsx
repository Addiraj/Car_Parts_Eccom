import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getMyWishlist, addToCart, toggleWishlist, requestPartSalesman } from "@/lib/account.functions";
import {
  ArrowLeft, ShoppingCart, Heart, Package, Headset, Check,
  MessageCircle, ChevronRight, FileText
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useIsStaff } from "@/hooks/use-is-staff";
import { formatAED } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/wishlist/quote")({
  head: () => ({ meta: [{ title: "Get Quote — Car Parts Dubai" }] }),
  component: WishlistQuotePage,
});

/* -------- Alternate Part Card (matches reference screenshot) -------- */
function AltPartCard({
  alt, isStaff, onAddToCart, onSave, isSaved,
}: {
  alt: any;
  isStaff: boolean;
  onAddToCart?: (id: string) => void;
  onSave?: (partId: string) => void;
  isSaved?: boolean;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [requested, setRequested] = useState(false);

  const altStock = Number(alt.stock ?? 0);
  const altInStock = altStock > 0;
  const brand = String(alt.manufacturer || "GLOBAL").toUpperCase();

  const requestSalesmanMut = useMutation({
    mutationFn: (partNumber: string) =>
      requestPartSalesman({ data: { partNumber, name: alt.name } }),
    onSuccess: () => {
      setRequested(true);
      toast.success(`Our salesman will contact you regarding REF OE:${alt.part_number}`);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to submit request"),
  });

  const handleContactSalesman = () => {
    if (!user) {
      toast.error("Please sign in to contact a salesman.");
      router.navigate({ to: "/auth/login", search: { redirect: window.location.pathname } });
      return;
    }
    requestSalesmanMut.mutate(alt.part_number);
  };

  const waMsg = encodeURIComponent(
    `Hi, I'd like to enquire about part REF OE:${alt.part_number} — ${alt.name}`
  );
  const waUrl = `https://wa.me/971547516365?text=${waMsg}`;

  const brandFontSize = brand.length <= 5
    ? "text-lg"
    : brand.length <= 8
      ? "text-base"
      : brand.length <= 11
        ? "text-xs sm:text-sm"
        : "text-[10px]";

  return (
    <div className="flex rounded-xl border-2 border-blue-100 bg-white shadow-sm hover:shadow-md hover:border-blue-300 transition-all overflow-hidden dark:bg-[#0d111c] dark:border-slate-700 dark:hover:border-blue-500/50">
      {/* Brand column */}
      <div className="w-24 sm:w-28 bg-blue-50/50 dark:bg-slate-900/60 flex items-center justify-center p-3 border-r-2 border-blue-100 dark:border-slate-700 shrink-0 overflow-hidden">
        <span
          className={`font-black text-center font-mono tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-full uppercase ${brandFontSize}`}
          style={{ color: brandColor(brand) }}
          title={brand}
        >
          {brand}
        </span>
      </div>

      {/* Details column */}
      <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start gap-2 mb-1">
            <h4 className="font-bold text-[13px] uppercase leading-tight line-clamp-2 text-foreground dark:text-slate-100 flex-1">
              {alt.name}
            </h4>
            {altInStock ? (
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50 uppercase whitespace-nowrap shrink-0">
                {altStock <= 5 ? "Low stock" : "In Stock"}
              </span>
            ) : (
              <span className="text-[9px] font-bold text-red-600 bg-red-50 dark:bg-red-950/60 dark:text-red-400 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800/50 uppercase whitespace-nowrap shrink-0">
                Out of stock
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground dark:text-slate-400 font-mono uppercase tracking-wide mb-1">
            REF OE:{alt.part_number}
          </div>
          <div className="text-base font-bold text-blue-600 dark:text-blue-400 mb-2">
            {formatAED(Number(alt.price))}
          </div>

          {/* Staff tier pricing */}
          {isStaff && (
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] mb-2">
              {[
                { label: "RATE", val: alt.rate_price ?? alt.price, accent: true },
                { label: "IND", val: alt.ind_price ?? alt.price },
                { label: "GAR", val: alt.gar_price ?? alt.price },
                { label: "EXP", val: alt.export_price ?? alt.price },
              ].map((t) => (
                <div key={t.label} className="flex items-center rounded bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <span className={`font-bold px-1.5 py-0.5 w-10 text-center border-r ${t.accent ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>{t.label}</span>
                  <span className={`font-bold px-1.5 ${t.accent ? 'text-blue-600 dark:text-blue-400' : 'text-foreground dark:text-slate-200'}`}>{formatAED(Number(t.val))}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {altInStock ? (
            <Button
              onClick={() => onAddToCart?.(alt.id)}
              variant="default"
              size="sm"
              className="h-8 px-3 text-[11px] font-semibold bg-[#2563eb] hover:bg-blue-700 text-white rounded-lg"
            >
              <ShoppingCart className="w-3 h-3 mr-1.5" /> Cart
            </Button>
          ) : (
            <button
              type="button"
              onClick={handleContactSalesman}
              disabled={requestSalesmanMut.isPending || requested}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/60 dark:border-blue-800/50 font-semibold text-[11px] transition-colors disabled:opacity-60"
            >
              {requested ? (
                <><Check className="w-3 h-3 text-emerald-600" /> Sent</>
              ) : (
                <><Headset className="w-3 h-3" /> Contact</>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => onSave?.(alt.id)}
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border font-semibold text-[11px] transition-colors ${isSaved
                ? "border-red-200 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800"
              }`}
          >
            <Heart className={`w-3 h-3 ${isSaved ? "fill-current" : ""}`} /> Save
          </button>

          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50 dark:hover:bg-emerald-900/60 font-semibold text-[11px] transition-colors"
          >
            <MessageCircle className="w-3 h-3" /> WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

/* -------- Brand color generator -------- */
function brandColor(brand: string): string {
  const colors: Record<string, string> = {
    FEBI: "#d97706",
    BMW: "#2563eb",
    TRUCKTEC: "#059669",
    MAHLE: "#dc2626",
    HENGST: "#7c3aed",
    BLUEPRINT: "#2563eb",
    BOSCH: "#dc2626",
    MANN: "#16a34a",
    SACHS: "#9333ea",
    BEHR: "#0891b2",
    VALEO: "#059669",
    DENSO: "#dc2626",
    NGK: "#ea580c",
    GATES: "#7c3aed",
    MEYLE: "#2563eb",
    LEMFORDER: "#dc2626",
    BREMBO: "#dc2626",
    ATE: "#2563eb",
    TRW: "#16a34a",
    CONTINENTAL: "#d97706",
    GLOBAL: "#475569",
  };
  return colors[brand] || "#2563eb";
}

/* -------- No Stock Contact Block -------- */
function NoStockContactBlock({ part }: { part: any }) {
  const { user } = useAuth();
  const router = useRouter();
  const [requested, setRequested] = useState(false);

  const requestSalesmanMut = useMutation({
    mutationFn: (partNumber: string) =>
      requestPartSalesman({ data: { partNumber, name: part.name } }),
    onSuccess: () => {
      setRequested(true);
      toast.success(`Our salesman will contact you regarding REF OE:${part.part_number}`);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to submit request"),
  });

  const handleContactSalesman = () => {
    if (!user) {
      toast.error("Please sign in to contact a salesman.");
      router.navigate({ to: "/auth/login", search: { redirect: window.location.pathname } });
      return;
    }
    requestSalesmanMut.mutate(part.part_number);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 text-center col-span-full">
      <Headset className="w-8 h-8 text-slate-400 mb-3" />
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        For this part, please contact our team to check backorders or custom sourcing options.
      </p>
      <button
        type="button"
        onClick={handleContactSalesman}
        disabled={requestSalesmanMut.isPending || requested}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-blue-500/40 bg-blue-50/50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/60 font-semibold text-sm px-4 py-2 transition-colors disabled:opacity-60"
      >
        {requested ? (
          <>
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Request sent
          </>
        ) : (
          <>
            <Headset className="h-4 w-4" />
            Contact Salesman
          </>
        )}
      </button>
    </div>
  );
}

/* -------- Main Page -------- */
function WishlistQuotePage() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const { user } = useAuth();
  const isStaff = useIsStaff();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => getMyWishlist(),
    enabled: !!user,
  });

  const addMut = useMutation({
    mutationFn: (id: string) => addToCart({ data: { partId: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart-count"] });
      qc.invalidateQueries({ queryKey: ["cart"] });
      toast.success(t("addedToCart"));
    },
  });

  const saveMut = useMutation({
    mutationFn: (partId: string) => toggleWishlist({ data: { partId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wishlist"] });
      qc.invalidateQueries({ queryKey: ["wishlist-count"] });
      qc.invalidateQueries({ queryKey: ["wishlist-ids"] });
      qc.invalidateQueries({ queryKey: ["wishlist-pns"] });
    },
  });

  // Collect all wishlisted part IDs for "isSaved" checks
  const wishlistedPartIds = new Set(items.map((it: any) => it.part?.id).filter(Boolean));

  // ALL wishlisted items with a valid part
  const allItems = items.filter((it: any) => !!it.part);

  if (!user) {
    return (
      <div className="mx-auto max-w-[1400px] px-5 py-32 md:px-10 md:py-40 text-center">
        <p className="text-muted-foreground">Please sign in to view this page.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-12 md:px-10 md:py-16">
      {/* Back Link */}
      <Link
        to="/wishlist"
        className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-8 transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Wishlist
      </Link>

      {/* Page header */}
      <div className="flex items-center gap-4 mb-10">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/50 shrink-0">
          <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-[-0.02em] text-foreground dark:text-white">
            Quote — Available Alternatives
          </h1>
          <p className="text-sm text-muted-foreground dark:text-slate-400 mt-0.5">
            All superseded and alternate part numbers for your wishlisted items
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : allItems.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed bg-muted/20 dark:bg-slate-900/30 p-12 text-center">
          <Package className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            No items in your wishlist yet.
          </p>
          <Link
            to="/wishlist"
            className="mt-4 text-sm text-blue-600 font-semibold hover:underline"
          >
            Return to Wishlist
          </Link>
        </div>
      ) : (
        <div className="space-y-12">
          {allItems.map((it: any) => {
            const p = it.part;
            const pInStock = Number(p.stock ?? 0) > 0;

            // Filter alternates: hide out-of-stock for regular customers
            const alts: any[] = (p.part_alternative_parts || []).filter((sp: any) => {
              if (!sp.alternative_part) return false;
              if (!isStaff && Number(sp.alternative_part.stock ?? 0) <= 0) {
                return false;
              }
              return true;
            });

            // For regular users: only show the item card if it's in stock
            const showSelfCard = isStaff || pInStock;

            return (
              <section key={it.id}>
                {/* Section header: Original part name + REF */}
                <div className="mb-5 border-b-2 border-slate-200 dark:border-slate-800 pb-4">
                  <h2 className="font-bold text-xl sm:text-2xl uppercase tracking-tight text-foreground dark:text-white">
                    {p.name}
                  </h2>
                  <div className="text-sm text-muted-foreground dark:text-slate-400 font-mono uppercase tracking-wide mt-1">
                    REF OE:{p.part_number}
                  </div>
                </div>

                {/* Part cards grid: the item itself (if in stock or staff) + its alternates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {!showSelfCard && alts.length === 0 ? (
                    <NoStockContactBlock part={p} />
                  ) : (
                    <>
                      {/* The wishlisted item itself as a card (only if in stock or staff) */}
                      {showSelfCard && (
                        <AltPartCard
                          key={`self-${p.id}`}
                          alt={p}
                          isStaff={isStaff}
                          onAddToCart={(id) => addMut.mutate(id)}
                          onSave={(id) => saveMut.mutate(id)}
                          isSaved={wishlistedPartIds.has(p.id)}
                        />
                      )}

                      {/* Superseded / alternate part cards */}
                      {alts.map((sp: any) =>
                        sp.alternative_part ? (
                          <AltPartCard
                            key={sp.id}
                            alt={sp.alternative_part}
                            isStaff={isStaff}
                            onAddToCart={(id) => addMut.mutate(id)}
                            onSave={(id) => saveMut.mutate(id)}
                            isSaved={wishlistedPartIds.has(sp.alternative_part.id)}
                          />
                        ) : null
                      )}
                    </>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

