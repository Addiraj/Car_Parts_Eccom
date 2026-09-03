import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { ShoppingCart, Heart, ChevronRight, MessageCircle, Headset, Check } from "lucide-react";
import { formatAED } from "@/lib/format";
import { useIsStaff } from "@/hooks/use-is-staff";
import { useAuth } from "@/hooks/use-auth";
import { requestPartSalesman } from "@/lib/account.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export type PartCardProps = {
  part: any;
  isWishlisted?: boolean;
  onToggleWishlist?: (partId?: string) => void;
  hideWishlistButton?: boolean;
  supersededParts?: any[];
  onAddToCart?: (partId?: string) => void;
  href?: string;
};

export function SupersededItemCard({ alt, isStaff, onAddToCart }: { alt: any; isStaff: boolean; onAddToCart?: (id?: string) => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const [requested, setRequested] = useState(false);

  const altStock = Number(alt.stock ?? 0);
  const altInStock = altStock > 0;
  const brand = String(alt.manufacturer || "GLOBAL").toUpperCase();

  const requestSalesmanMut = useMutation({
    mutationFn: (partNumber: string) => requestPartSalesman({ data: { partNumber, name: alt.name } }),
    onSuccess: () => {
      setRequested(true);
      toast.success(`Our salesman will contact you shortly regarding REF OE:${alt.part_number}`);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to submit request");
    }
  });

  const handleContactSalesman = () => {
    if (!user) {
      toast.error("Please sign in to contact a salesman.");
      router.navigate({ to: "/auth/login", search: { redirect: window.location.pathname } });
      return;
    }
    requestSalesmanMut.mutate(alt.part_number);
  };

  return (
    <div className="flex flex-col border border-border dark:border-slate-800 rounded-lg bg-card dark:bg-[#0d111c] text-card-foreground p-4 shadow-sm relative h-full">
      {/* Top row: Brand & Stock Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-mono font-black text-sm text-foreground dark:text-white uppercase tracking-tight">
          {brand}
        </span>
        {altInStock ? (
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/50 px-2 py-0.5 rounded border border-emerald-200 uppercase whitespace-nowrap">
            {isStaff ? `${altStock} IN STOCK` : "IN STOCK"}
          </span>
        ) : (
          <span className="text-[10px] font-bold text-red-600 bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30 px-2 py-0.5 rounded uppercase whitespace-nowrap">
            OUT OF STOCK
          </span>
        )}
      </div>

      {/* Title & Ref OE */}
      <h4 className="font-bold text-sm uppercase leading-tight line-clamp-1 text-foreground dark:text-slate-100 mb-1">
        {alt.name}
      </h4>
      <div className="text-[11px] text-muted-foreground dark:text-slate-400 font-mono uppercase tracking-wide mb-3">
        REF OE:{alt.part_number}
      </div>

      {/* Pricing Grid */}
      {isStaff ? (
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] mb-4">
          <div className="flex items-center rounded bg-muted/60 dark:bg-slate-900/80 border border-border/50 dark:border-slate-800 overflow-hidden">
            <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold px-1.5 py-0.5 w-10 text-center border-r border-blue-200/40 dark:border-blue-800/40">RATE</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold px-2">{formatAED(Number(alt.price))}</span>
          </div>
          <div className="flex items-center rounded bg-muted/60 dark:bg-slate-900/80 border border-border/50 dark:border-slate-800 overflow-hidden">
            <span className="bg-muted text-muted-foreground dark:bg-slate-800 dark:text-slate-400 font-bold px-1.5 py-0.5 w-10 text-center border-r border-border dark:border-slate-700">IND</span>
            <span className="font-bold px-2 text-foreground dark:text-slate-200">{formatAED(Number(alt.ind_price ?? alt.price))}</span>
          </div>
          <div className="flex items-center rounded bg-muted/60 dark:bg-slate-900/80 border border-border/50 dark:border-slate-800 overflow-hidden">
            <span className="bg-muted text-muted-foreground dark:bg-slate-800 dark:text-slate-400 font-bold px-1.5 py-0.5 w-10 text-center border-r border-border dark:border-slate-700">GAR</span>
            <span className="font-bold px-2 text-foreground dark:text-slate-200">{formatAED(Number(alt.gar_price ?? alt.price))}</span>
          </div>
          <div className="flex items-center rounded bg-muted/60 dark:bg-slate-900/80 border border-border/50 dark:border-slate-800 overflow-hidden">
            <span className="bg-muted text-muted-foreground dark:bg-slate-800 dark:text-slate-400 font-bold px-1.5 py-0.5 w-10 text-center border-r border-border dark:border-slate-700">EXP</span>
            <span className="font-bold px-2 text-foreground dark:text-slate-200">{formatAED(Number(alt.export_price ?? alt.price))}</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center text-[10px] rounded bg-muted/60 dark:bg-slate-900/80 border border-border/50 dark:border-slate-800 overflow-hidden mb-4 w-fit">
          <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 border-r border-blue-200/40 dark:border-blue-800/40">YOUR PRICE</span>
          {Number(alt.price) > 0 ? (
            <span className="text-blue-600 dark:text-blue-400 font-bold px-2.5">{formatAED(Number(alt.price))}</span>
          ) : (
            <span className="text-muted-foreground px-2.5">Contact for price</span>
          )}
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-col gap-2 mt-auto">
        {altInStock ? (
          <Button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddToCart?.(alt.id); }}
            variant="default"
            size="sm"
            className="w-full h-9 text-[12px] font-semibold bg-[#2563eb] hover:bg-blue-600 text-white"
          >
            <ShoppingCart className="w-3.5 h-3.5 mr-2" /> Add to cart
          </Button>
        ) : isStaff ? (
          <Button
            disabled
            variant="outline"
            size="sm"
            className="w-full h-9 text-[12px] text-muted-foreground font-semibold bg-muted/40 border-border cursor-not-allowed dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-500"
          >
            <ShoppingCart className="w-3.5 h-3.5 mr-2" /> Out of stock
          </Button>
        ) : (
          <button
            type="button"
            onClick={handleContactSalesman}
            disabled={requestSalesmanMut.isPending || requested}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-blue-500/40 bg-blue-50/50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/60 dark:hover:text-blue-300 font-semibold text-xs h-9 w-full transition-colors disabled:opacity-60"
          >
            {requested ? (
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
        )}
      </div>
    </div>
  );
}

export function PartCard({ part: p, isWishlisted, onToggleWishlist, hideWishlistButton, supersededParts, onAddToCart, href }: PartCardProps) {
  const isStaff = useIsStaff();
  const { user } = useAuth();
  const router = useRouter();
  const [popupOpen, setPopupOpen] = useState(false);
  const [requested, setRequested] = useState(false);

  const requestSalesmanMut = useMutation({
    mutationFn: (partNumber: string) => requestPartSalesman({ data: { partNumber, name: p.name } }),
    onSuccess: () => {
      setRequested(true);
      toast.success(`Our salesman will contact you shortly regarding REF OE:${p.part_number}`);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to submit request");
    }
  });

  const handleContactSalesman = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error("Please sign in to contact a salesman.");
      router.navigate({ to: "/auth/login", search: { redirect: window.location.pathname } });
      return;
    }
    requestSalesmanMut.mutate(p.part_number);
  };

  const stock = Number(p.stock ?? 0);
  const inStock = stock > 0;

  const visibleSuperseded = supersededParts?.filter(sp => isStaff || Number(sp.alternative_part?.stock ?? 0) > 0 || true) || [];

  const waMsg = encodeURIComponent(`Hi, I'd like to enquire about part REF OE:${p.part_number} — ${p.name}`);
  const waUrl = `https://wa.me/971547516365?text=${waMsg}`;

  const brand = String(p.manufacturer || "GLOBAL").toUpperCase();
  const brandFontSize = brand.length <= 5
    ? "text-2xl"
    : brand.length <= 8
      ? "text-xl"
      : brand.length <= 11
        ? "text-sm sm:text-base"
        : "text-xs";

  return (
    <div
      className={`flex flex-col border border-border rounded-lg bg-card text-card-foreground overflow-hidden shadow-sm h-full hover:border-primary hover:shadow-md transition-all relative dark:bg-[#0d111c] dark:border-slate-800 dark:hover:border-blue-500/50 ${href ? 'cursor-pointer' : ''}`}
      onClick={() => { if (href) router.navigate({ to: href as any }) }}
    >
      <div className="flex flex-1">
        {/* Left side: Brand */}
        <div className="w-[30%] bg-muted/40 dark:bg-slate-900/60 flex items-center justify-center p-2.5 sm:p-4 border-r border-border dark:border-slate-800/80 shrink-0 overflow-hidden">
          <span
            className={`font-black text-center text-foreground dark:text-white font-mono tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-full ${brandFontSize}`}
            title={brand}
          >
            {brand}
          </span>
        </div>

        {/* Right side: Details */}
        <div className="w-[70%] p-4 flex flex-col justify-between bg-card dark:bg-[#0d111c] relative">
          <div>
            <div className="flex justify-between items-start mb-1 gap-2">
              <h3 className="font-bold text-[13px] uppercase leading-tight line-clamp-2 text-foreground dark:text-slate-100">{p.name}</h3>
            </div>

            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <div className="text-[11px] text-muted-foreground dark:text-slate-400 font-mono uppercase tracking-wide">
                REF OE:{p.part_number} · {p.manufacturer || "GLOBAL"}
              </div>
              {inStock ? (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/50 px-2 py-0.5 rounded border border-emerald-200 uppercase whitespace-nowrap shrink-0">
                  {isStaff ? `${stock} IN STOCK` : "IN STOCK"}
                </span>
              ) : isStaff ? (
                <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800/50 px-2 py-0.5 rounded border border-red-200 uppercase whitespace-nowrap shrink-0">
                  OUT OF STOCK
                </span>
              ) : null}
            </div>

            {isStaff && (
              <div className="text-[10px] text-muted-foreground/70 dark:text-slate-500 font-bold mb-1.5 tracking-wider">
                ALL TIERS
              </div>
            )}

            {isStaff ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-4">
                <div className="flex items-center text-[10px] rounded bg-muted/60 dark:bg-slate-900/80 border border-border/50 dark:border-slate-800 overflow-hidden">
                  <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold px-2 py-1 w-12 text-center border-r border-blue-200/40 dark:border-blue-800/40">RATE</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold px-2.5">{formatAED(Number(p.rate_price ?? p.price))}</span>
                </div>
                <div className="flex items-center text-[10px] rounded bg-muted/60 dark:bg-slate-900/80 border border-border/50 dark:border-slate-800 overflow-hidden">
                  <span className="bg-muted text-muted-foreground dark:bg-slate-800 dark:text-slate-400 font-bold px-2 py-1 w-12 text-center border-r border-border dark:border-slate-700">IND</span>
                  <span className="font-bold px-2.5 text-foreground dark:text-slate-200">{p.ind_price != null ? formatAED(Number(p.ind_price)) : "-"}</span>
                </div>
                <div className="flex items-center text-[10px] rounded bg-muted/60 dark:bg-slate-900/80 border border-border/50 dark:border-slate-800 overflow-hidden">
                  <span className="bg-muted text-muted-foreground dark:bg-slate-800 dark:text-slate-400 font-bold px-2 py-1 w-12 text-center border-r border-border dark:border-slate-700">GAR</span>
                  <span className="font-bold px-2.5 text-foreground dark:text-slate-200">{p.gar_price != null ? formatAED(Number(p.gar_price)) : "-"}</span>
                </div>
                <div className="flex items-center text-[10px] rounded bg-muted/60 dark:bg-slate-900/80 border border-border/50 dark:border-slate-800 overflow-hidden">
                  <span className="bg-muted text-muted-foreground dark:bg-slate-800 dark:text-slate-400 font-bold px-2 py-1 w-12 text-center border-r border-border dark:border-slate-700">EXP</span>
                  <span className="font-bold px-2.5 text-foreground dark:text-slate-200">{p.export_price != null ? formatAED(Number(p.export_price)) : "-"}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center text-[10px] rounded bg-muted/60 dark:bg-slate-900/80 border border-border/50 dark:border-slate-800 overflow-hidden mb-4 w-fit">
                <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold px-2 py-1 border-r border-blue-200/40 dark:border-blue-800/40">YOUR PRICE</span>
                {Number(p.price) > 0 ? (
                  <span className="text-blue-600 dark:text-blue-400 font-bold px-3">{formatAED(Number(p.price))}</span>
                ) : (
                  <span className="text-muted-foreground px-3">Contact for price</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-auto border-t border-border dark:border-slate-800 pt-3">
            {inStock ? (
              <Button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddToCart?.(p.id); }} variant="default" size="sm" className="flex-1 h-9 text-[12px] font-semibold bg-[#2563eb] hover:bg-blue-600 text-white">
                <ShoppingCart className="w-3.5 h-3.5 mr-2" /> Add to cart
              </Button>
            ) : isStaff ? (
              <Button onClick={(e) => { e.preventDefault(); }} variant="outline" size="sm" className="flex-1 h-9 text-[12px] text-muted-foreground font-semibold bg-muted/40 border-border hover:bg-muted cursor-not-allowed dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-500">
                <ShoppingCart className="w-3.5 h-3.5 mr-2" /> Out of stock
              </Button>
            ) : (
              <button
                type="button"
                onClick={handleContactSalesman}
                disabled={requestSalesmanMut.isPending || requested}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-blue-500/40 bg-blue-50/50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/60 dark:hover:text-blue-300 font-semibold text-xs h-9 transition-colors disabled:opacity-60"
              >
                {requested ? (
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
            )}

            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center h-9 w-9 p-0 rounded-md border text-emerald-600 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 hover:text-emerald-700 dark:text-emerald-400 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 shrink-0 transition-colors"
              title="Enquire on WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </a>

            {!hideWishlistButton && (
              <Button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleWishlist?.(p.id); }}
                variant="outline"
                size="sm"
                className={`h-9 w-9 p-0 shrink-0 transition-colors ${isWishlisted
                    ? 'text-red-500 border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-800/60 dark:text-red-400'
                    : 'text-muted-foreground border-border hover:bg-accent dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart className={`w-4 h-4 transition-transform active:scale-125 ${isWishlisted ? 'fill-current' : ''}`} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {visibleSuperseded.length > 0 && (
        <div className="border-t border-border dark:border-slate-800 p-2 bg-muted/30 dark:bg-slate-900/50">
          <Button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPopupOpen(true); }}
            variant="ghost"
            className="w-full h-8 text-[11px] text-primary font-semibold hover:bg-primary/10 flex justify-between px-3"
          >
            <span>{visibleSuperseded.length} Superseded / Alternate {visibleSuperseded.length === 1 ? 'Number' : 'Numbers'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto border border-border bg-card text-card-foreground p-6 shadow-2xl rounded-2xl dark:border-slate-800 dark:bg-[#0b0f19] dark:text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground dark:text-white">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Superseded / alternate numbers
            </DialogTitle>
            <p className="text-xs text-muted-foreground dark:text-slate-400 mt-1">
              Alternatives available in our inventory for REF OE:{p.part_number}.
            </p>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {visibleSuperseded.map((sp: any) => (
              sp.alternative_part && (
                <SupersededItemCard
                  key={sp.id}
                  alt={sp.alternative_part}
                  isStaff={isStaff}
                  onAddToCart={onAddToCart}
                />
              )
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
