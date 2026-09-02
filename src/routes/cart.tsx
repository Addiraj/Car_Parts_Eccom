import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyCart, updateCartQty, removeFromCart, clearCart, requestCartSalesman, type StaffTier } from "@/lib/account.functions";
import { getActiveOffersForParts, computeOfferPrice } from "@/lib/offers.functions";
import { formatAED } from "@/lib/format";
import { toast } from "sonner";
import { ShoppingCart, Trash2, LogIn, Tag, Headset, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useIsSalesman } from "@/hooks/use-is-salesman";
import { useMemo, useState, useEffect } from "react";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — Car Parts Dubai" }] }),
  component: CartPage,
});

const TIER_LABEL: Record<StaffTier, string> = { rate: "Rate", ind: "IND", gar: "GAR", exp: "EXP" };
const TIER_ORDER: StaffTier[] = ["rate", "ind", "gar", "exp"];

function CartPage() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isSalesman = useIsSalesman();
  const isStaff = isAdmin || isSalesman;
  const [requested, setRequested] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["cart"],
    queryFn: () => getMyCart(),
    enabled: !!user,
  });

  const cartSalesmanMut = useMutation({
    mutationFn: () => requestCartSalesman(),
    onSuccess: () => {
      setRequested(true);
      toast.success("Quote request sent! Your assigned salesman will contact you shortly.");

      const summary = lines.map((l: any) =>
        `• ${l.part?.name || "Part"} (REF OE:${l.part?.part_number || "N/A"} · ${String(l.part?.manufacturer || "GLOBAL").toUpperCase()}) x${l.quantity}`
      ).join("\n");

      const waText = encodeURIComponent(`Hi, I'd like to get a quote for the items in my cart:\n${summary}`);
      window.open(`https://wa.me/971547516365?text=${waText}`, "_blank");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to submit quote request"),
  });

  const partIds = useMemo(() => items.map((i: any) => i.part?.id).filter(Boolean) as string[], [items]);

  const [tier, setTier] = useState<StaffTier>("ind");
  useEffect(() => {
    if (!isStaff) return;
    const saved = (typeof window !== "undefined" ? window.localStorage.getItem("cart.priceTier") : null) as StaffTier | null;
    if (saved && TIER_ORDER.includes(saved)) setTier(saved);
  }, [isStaff]);
  useEffect(() => {
    if (isStaff && typeof window !== "undefined") window.localStorage.setItem("cart.priceTier", tier);
  }, [tier, isStaff]);

  const { data: offers = {} as Record<string, any> } = useQuery({
    queryKey: ["cart-offers", partIds.join(",")],
    queryFn: () => getActiveOffersForParts({ data: { partIds } }),
    enabled: partIds.length > 0,
  });

  const upd = useMutation({
    mutationFn: (v: { id: string; quantity: number }) => updateCartQty({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["cart-count"] });
    },
  });
  const rem = useMutation({
    mutationFn: (id: string) => removeFromCart({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["cart-count"] });
      toast.success(t("remove"));
    },
  });
  const clearCartMut = useMutation({
    mutationFn: () => clearCart(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["cart-count"] });
      toast.success("Cart cleared");
    },
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">{t("yourCart")}</h1>
        <SignInPrompt message={t("signInToUseCart")} />
      </div>
    );
  }

  const lines = items.map((it: any) => {
    let original = Number(it.part?.price || 0);
    if (isStaff) {
      if (tier === "rate") original = Number(it.part?.rate_price || it.part?.price || 0);
      else if (tier === "ind") original = Number(it.part?.ind_price || 0);
      else if (tier === "gar") original = Number(it.part?.gar_price || 0);
      else if (tier === "exp") original = Number(it.part?.export_price || 0);
    }
    const off = offers[it.part?.id];
    const { final, discount } = off ? computeOfferPrice(original, off) : { final: original, discount: 0 };
    return { ...it, originalUnit: original, finalUnit: final, savingsUnit: discount, offer: off ?? null };
  });
  const originalTotal = lines.reduce((s: number, l: any) => s + l.originalUnit * l.quantity, 0);
  const finalTotal = lines.reduce((s: number, l: any) => s + l.finalUnit * l.quantity, 0);
  const discountTotal = originalTotal - finalTotal;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("yourCart")}</h1>
        {!isLoading && items.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to remove all items from your cart?")) {
                clearCartMut.mutate();
              }
            }}
            disabled={clearCartMut.isPending}
            className="flex items-center gap-1.5 rounded-md border border-destructive/30 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> Clear All
          </button>
        )}
      </div>
      {isLoading && <p className="mt-6 text-sm text-muted-foreground">{t("loading")}</p>}
      {!isLoading && items.length === 0 && (
        <div className="mt-8 grid place-items-center rounded-lg border border-dashed bg-surface-2 p-12 text-center">
          <ShoppingCart className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">{t("emptyCart")}</p>
          <Link to="/catalog" className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{t("browseCatalog")}</Link>
        </div>
      )}
      {items.length > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <ul className="divide-y rounded-lg border bg-surface">
            {lines.map((it: any) => (
              <li key={it.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground flex-wrap mb-1">
                    <span className="font-semibold text-foreground dark:text-slate-200">REF OE:{it.part?.part_number}</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
                      {String(it.part?.manufacturer || "GLOBAL").toUpperCase()}
                    </span>
                  </div>
                  <Link to="/parts/$id" params={{ id: it.part.id }} className="block truncate text-sm font-medium hover:text-primary">{it.part?.name}</Link>
                  {it.offer && (
                    <div className="mt-1 inline-flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                      <Tag className="h-3 w-3" /> {it.offer.discount_type === "percentage" ? `${it.offer.discount_value}% off` : `${formatAED(it.offer.discount_value)} off`}
                    </div>
                  )}
                  {isStaff && it.tp && (
                    <div className="mt-2 grid grid-cols-4 gap-1 text-[10px]">
                      {TIER_ORDER.map((k) => (
                        <div
                          key={k}
                          className={`rounded border px-1.5 py-1 text-center ${tier === k ? "border-primary bg-primary/10 font-semibold text-primary" : "text-muted-foreground"}`}
                        >
                          <div className="uppercase tracking-wide">{TIER_LABEL[k]}</div>
                          <div className="font-mono text-[11px]">{formatAED(it.tp[k])}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-md border">
                    <button onClick={() => upd.mutate({ id: it.id, quantity: it.quantity - 1 })} className="px-2 py-1 text-sm hover:bg-muted">−</button>
                    <span className="w-8 text-center font-mono text-sm">{it.quantity}</span>
                    <button onClick={() => upd.mutate({ id: it.id, quantity: it.quantity + 1 })} className="px-2 py-1 text-sm hover:bg-muted">+</button>
                  </div>
                  <div className="min-w-[90px] text-right">
                    <div className="font-bold text-primary">{formatAED(it.finalUnit * it.quantity)}</div>
                    {it.offer ? (
                      <div className="text-xs text-muted-foreground line-through">{formatAED(it.originalUnit * it.quantity)}</div>
                    ) : (
                      <div className="text-xs text-muted-foreground">{formatAED(it.originalUnit)}</div>
                    )}
                  </div>
                  <button onClick={() => rem.mutate(it.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded hover:bg-destructive/10 hover:text-destructive" aria-label={t("remove")}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <aside className="h-fit rounded-lg border bg-surface p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("orderSummary")}</div>

            {isStaff && (
              <div className="mt-3 rounded-md border bg-surface-2 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Price tier</div>
                <div className="mt-2 grid grid-cols-4 gap-1">
                  {TIER_ORDER.map((k) => (
                    <button
                      key={k}
                      onClick={() => setTier(k)}
                      className={`rounded border px-2 py-1 text-xs font-semibold ${tier === k ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    >
                      {TIER_LABEL[k]}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">Checkout will use the selected tier for all lines.</p>
              </div>
            )}

            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt>{t("subtotal")}</dt><dd className="font-mono">{formatAED(originalTotal)}</dd></div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-success"><dt>{t("discount")}</dt><dd className="font-mono">− {formatAED(discountTotal)}</dd></div>
              )}
              <div className="flex justify-between"><dt>{t("shipping")}</dt><dd className="text-muted-foreground">{t("calcAtCheckout")}</dd></div>
            </dl>
            <div className="mt-4 flex justify-between border-t pt-3 text-lg font-bold">
              <span>{t("total")}</span><span className="font-mono text-primary">{formatAED(finalTotal)}</span>
            </div>
            {isStaff ? (
              <Link
                to="/checkout"
                search={{ tier }}
                className="mt-4 block w-full rounded-md bg-primary py-3 text-center text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {t("proceedToCheckout")}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => cartSalesmanMut.mutate()}
                disabled={cartSalesmanMut.isPending || requested}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#2563eb] hover:bg-blue-700 py-3 text-center text-sm font-semibold text-white shadow-md transition-all disabled:opacity-60"
              >
                {requested ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    Request sent to salesman
                  </>
                ) : (
                  <>
                    <Headset className="h-4 w-4" />
                    Contact salesman
                  </>
                )}
              </button>
            )}
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              {isStaff ? t("codOrQuote") : "Request quote & order directly from your assigned salesman"}
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}

function SignInPrompt({ message }: { message: string }) {
  const { t } = useI18n();
  return (
    <div className="mt-8 grid place-items-center rounded-lg border border-dashed bg-surface-2 p-12 text-center">
      <ShoppingCart className="h-10 w-10 text-muted-foreground" />
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      <Link
        to="/auth/login"
        search={{ redirect: "/cart" }}
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        <LogIn className="h-4 w-4" /> {t("signIn")}
      </Link>
    </div>
  );
}
