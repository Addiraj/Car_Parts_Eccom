import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useRef } from "react";
import { getMyCart, getStaffTierPrices, type StaffTier } from "@/lib/account.functions";
import { getMyAddresses, getShippingZones, validateCoupon, placeOrder, saveAddress, VAT_RATE } from "@/lib/orders.functions";
import { createStripeCheckout } from "@/lib/stripe/stripe.functions";
import { getCheckoutPaymentContext } from "@/lib/credit.functions";
import { formatAED } from "@/lib/format";
import { toast } from "sonner";
import { MapPin, Tag, Truck, Wallet, CreditCard, Lock, AlertTriangle, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useIsSalesman } from "@/hooks/use-is-salesman";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Car Parts Dubai" }] }),
  validateSearch: (s: Record<string, unknown>) => {
    const parsed = z.object({ tier: z.enum(["rate", "ind", "gar", "exp"]).optional() }).safeParse(s);
    return parsed.success ? parsed.data : {};
  },
  component: CheckoutPage,
});

function CheckoutPage() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { tier: tierParam } = Route.useSearch();
  const isAdmin = useIsAdmin();
  const isSalesman = useIsSalesman();
  const isStaff = isAdmin || isSalesman;
  const tier: StaffTier | undefined = isStaff ? (tierParam ?? "ind") : undefined;

  // Redirect regular customers back to cart page as payment methods & direct checkout are hidden for non-staff
  useEffect(() => {
    if (!isStaff) {
      toast.info("Direct checkout is restricted. Please contact your assigned salesman from your cart.");
      navigate({ to: "/cart" });
    }
  }, [isStaff, navigate]);

  const { data: items = [] } = useQuery({ queryKey: ["cart"], queryFn: () => getMyCart() });
  const { data: addresses = [] } = useQuery({ queryKey: ["addresses"], queryFn: () => getMyAddresses() });
  const { data: zones = [] } = useQuery({ queryKey: ["shipping_zones"], queryFn: () => getShippingZones() });
  const { data: payCtx } = useQuery({ queryKey: ["checkout-payment-context"], queryFn: () => getCheckoutPaymentContext() });

  const partIds = useMemo(() => items.map((i: any) => i.part?.id).filter(Boolean) as string[], [items]);
  const { data: staffPricing } = useQuery({
    queryKey: ["cart-staff-tier-prices", partIds.join(",")],
    queryFn: () => getStaffTierPrices({ data: { partIds } }),
    enabled: isStaff && partIds.length > 0,
  });
  const tierPrices = (staffPricing?.prices ?? {}) as Record<string, { rate: number; ind: number; gar: number; exp: number }>;

  const unitFor = (it: any): number => {
    if (isStaff && tier && tierPrices[it.part?.id]) return Number(tierPrices[it.part.id][tier] || 0);
    return Number(it.part?.price || 0);
  };

  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [userPickedAddress, setUserPickedAddress] = useState(false);
  const [payment, setPayment] = useState<"cod" | "stripe" | "wallet">("cod");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [notes, setNotes] = useState("");
  const [walletError, setWalletError] = useState<string | null>(null);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const addrSectionRef = useRef<HTMLElement | null>(null);

  // Auto-select default (or newest) address once loaded, unless the user picked manually.
  useEffect(() => {
    if (userPickedAddress) return;
    if (!addresses.length) return;
    const preferred = addresses.find((a: any) => a.is_default) ?? addresses[0];
    if (preferred && preferred.id !== selectedAddressId) setSelectedAddressId(preferred.id);
  }, [addresses, userPickedAddress, selectedAddressId]);

  const selectedAddress = addresses.find((a: any) => a.id === selectedAddressId);


  const subtotal = useMemo(
    () => items.reduce((s: number, i: any) => s + unitFor(i) * i.quantity, 0),
    [items, tier, tierPrices, isStaff]
  );

  const zone = zones.find((z: any) => z.emirate === selectedAddress?.emirate);
  const shipping = zone ? (zone.free_over && subtotal >= Number(zone.free_over) ? 0 : Number(zone.fee)) : 0;
  const discount = coupon?.discount ?? 0;
  const taxable = Math.max(0, subtotal - discount);
  const vat = Math.round(taxable * VAT_RATE * 100) / 100;
  const total = Math.round((taxable + vat + shipping) * 100) / 100;

  const couponMut = useMutation({
    mutationFn: () => validateCoupon({ data: { code: couponInput, subtotal } }),
    onSuccess: (r: any) => {
      if (r.ok) { setCoupon({ code: r.code, discount: r.discount }); toast.success(`${r.code} −${formatAED(r.discount)}`); }
      else { setCoupon(null); toast.error(r.error); }
    },
  });

  const placeMut = useMutation({
    mutationFn: () => placeOrder({ data: {
      address_id: selectedAddressId, payment_method: payment as "cod" | "quote" | "wallet",
      coupon_code: coupon?.code ?? null, notes: notes || null,
      price_tier: tier ?? null,
    }}),
    onSuccess: (o: any) => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success(`${t("orderPlaced")} · ${o.order_number}`);
      navigate({ to: "/orders/$id", params: { id: o.id } });
    },
    onError: (e: any) => {
      const msg = e?.message || "Failed to place order";
      if (payment === "wallet" && /insufficient|frozen|wallet|credit/i.test(msg)) {
        setWalletError(msg);
        qc.invalidateQueries({ queryKey: ["checkout-payment-context"] });
        const wallet = (payCtx as any)?.wallet;
        const codLimit = (payCtx as any)?.cod_limits?.[(payCtx as any)?.customer_type];
        const codEnabled = codLimit?.enabled !== false;
        const codMax = Number(codLimit?.max_amount ?? 0);
        const codOk = codEnabled && (codMax === 0 || total <= codMax);
        setPayment(codOk ? "cod" : "stripe");
        // no toast; modal explains
      } else {
        toast.error(msg);
      }
    },
  });

  // Auto-deselect wallet when it becomes unusable
  useEffect(() => {
    if (payment !== "wallet") return;
    const wallet = (payCtx as any)?.wallet;
    if (!wallet || !wallet.is_active || Number(wallet.available_balance) < total) {
      const codLimit = (payCtx as any)?.cod_limits?.[(payCtx as any)?.customer_type];
      const codEnabled = codLimit?.enabled !== false;
      const codMax = Number(codLimit?.max_amount ?? 0);
      const codOk = codEnabled && (codMax === 0 || total <= codMax);
      setPayment(codOk ? "cod" : "stripe");
    }
  }, [payment, payCtx, total]);

  const stripeMut = useMutation({
    mutationFn: () => createStripeCheckout({ data: {
      address_id: selectedAddressId,
      coupon_code: coupon?.code ?? null,
      notes: notes || null,
      origin: window.location.origin,
      price_tier: tier ?? null,
    }}),

    onSuccess: (r: any) => {
      if (!r?.ok) {
        toast.error(r?.error || "Stripe is not configured yet.");
        return;
      }
      qc.invalidateQueries({ queryKey: ["cart"] });
      // Redirect to Stripe Checkout
      if (r.url) window.location.href = r.url;
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">{t("emptyCart")}</h1>
        <Link to="/catalog" className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{t("browseCatalog")}</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{t("checkout")}</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section ref={addrSectionRef} className="rounded-lg border bg-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4" /> {t("shippingAddress")}</h2>
              <div className="flex items-center gap-3">
                {addresses.length > 0 && (
                  <button type="button" onClick={() => setShowAddrForm((s) => !s)}
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    <Plus className="h-3.5 w-3.5" /> {showAddrForm ? "Cancel" : "Add new"}
                  </button>
                )}
                <Link to="/addresses" className="text-xs text-primary hover:underline">{t("manageAddresses")}</Link>
              </div>
            </div>

            {addresses.length > 0 && (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {addresses.map((a: any) => (
                  <li key={a.id}>
                    <label className={`block cursor-pointer rounded-md border p-3 text-sm transition ${(selectedAddressId === a.id) ? "border-primary bg-primary/5" : "hover:border-foreground/30"}`}>
                      <input type="radio" name="addr" value={a.id} className="sr-only"
                        checked={selectedAddressId === a.id}
                        onChange={() => { setSelectedAddressId(a.id); setUserPickedAddress(true); }} />
                      <div className="font-semibold">{a.full_name} {a.is_default && <span className="ms-2 rounded bg-secondary px-1.5 py-0.5 text-[9px] uppercase text-secondary-foreground">{t("default")}</span>}</div>
                      <div className="text-xs text-muted-foreground">{a.phone}</div>
                      <div className="mt-1 text-xs">{a.street}{a.building ? `, ${a.building}` : ""}, {a.area}, {a.emirate}</div>
                    </label>
                  </li>
                ))}
              </ul>
            )}

            {(addresses.length === 0 || showAddrForm) && (
              <InlineAddressForm
                zones={zones}
                forceDefault={addresses.length === 0}
                onSaved={(row) => {
                  qc.invalidateQueries({ queryKey: ["addresses"] });
                  setSelectedAddressId(row.id);
                  setUserPickedAddress(true);
                  setShowAddrForm(false);
                  toast.success("Address saved");
                }}
              />
            )}
          </section>


          <section className="rounded-lg border bg-surface p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Wallet className="h-4 w-4" /> {t("payment")}</h2>
            {(() => {
              const wallet = payCtx?.wallet as any;
              const codLimit = payCtx?.cod_limits?.[payCtx.customer_type];
              const codEnabled = codLimit?.enabled !== false;
              const codMax = Number(codLimit?.max_amount ?? 0);
              const codExceeded = codEnabled && codMax > 0 && total > codMax;
              // Wallet state derivation (only show the card for active wallets)
              let walletDesc = "Credit wallet not activated";
              let walletWarn: string | undefined = "Not activated";
              let walletDisabled = true;
              let walletActive = false;
              if (wallet && wallet.is_active) {
                walletActive = true;
                const bal = Number(wallet.available_balance);
                if (bal < total) {
                  walletDesc = `Balance: ${formatAED(bal)} (insufficient)`;
                  walletWarn = "Insufficient balance";
                  walletDisabled = true;
                } else {
                  walletDesc = `Balance: ${formatAED(bal)}`;
                  walletWarn = undefined;
                  walletDisabled = false;
                }
              }
              const opts: Array<{ id: string; label: string; desc: string; disabled?: boolean; warn?: string }> = [
                { id: "stripe", label: "Pay with Card (Stripe)", desc: "Secure online payment" },
                ...(walletActive ? [{ id: "wallet" as const, label: "Pay by Wallet", desc: walletDesc, disabled: walletDisabled, warn: walletWarn }] : []),
                {
                  id: "cod",
                  label: t("codLabel"),
                  desc: codEnabled && codMax > 0 ? `${t("codDesc")} · Max ${formatAED(codMax)}` : t("codDesc"),
                  disabled: !codEnabled || codExceeded,
                  warn: !codEnabled ? "COD unavailable" : codExceeded ? `Exceeds COD limit ${formatAED(codMax)}` : undefined,
                },
              ];

              return (
                <div className={`mt-4 grid gap-2 sm:grid-cols-2 ${walletActive ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
                  {opts.map((opt) => (
                    <label key={opt.id}
                      className={`relative rounded-md border p-3 text-sm transition ${opt.disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${payment === opt.id ? "border-primary bg-primary/5" : "hover:border-foreground/30"}`}>
                      <input type="radio" name="pm" className="sr-only"
                        disabled={opt.disabled}
                        checked={payment === opt.id}
                        onChange={() => !opt.disabled && setPayment(opt.id as any)} />
                      <div className="flex items-center gap-1 font-semibold">
                        {opt.id === "wallet" && <Wallet className="h-3.5 w-3.5" />}
                        {opt.id === "stripe" && <CreditCard className="h-3.5 w-3.5" />}
                        {opt.disabled && <Lock className="h-3.5 w-3.5" />}
                        {opt.label}
                      </div>
                      <div className="text-xs text-muted-foreground">{opt.desc}</div>
                      {opt.warn && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-3 w-3" /> {opt.warn}
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              );
            })()}
          </section>

          <section className="rounded-lg border bg-surface p-5">
            <h2 className="text-sm font-semibold">{t("orderNotes")}</h2>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder={t("notesPlaceholder")}
              className="mt-3 w-full rounded-md border bg-surface-2 p-3 text-sm outline-none focus:border-primary" />
          </section>
        </div>

        <aside className="h-fit rounded-lg border bg-surface p-5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("orderSummary")}</div>
            {isStaff && tier && (
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                Pricing · {tier}
              </span>
            )}
          </div>
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-xs">
            {items.map((it: any) => (
              <li key={it.id} className="flex justify-between gap-2">
                <span className="truncate">
                  <span className="font-mono text-muted-foreground">{it.quantity}× </span>
                  {it.part?.name}
                  {it.part?.manufacturer && (
                    <span className="ml-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                      ({String(it.part.manufacturer).toUpperCase()})
                    </span>
                  )}
                </span>
                <span className="font-mono">{formatAED(unitFor(it) * it.quantity)}</span>
              </li>
            ))}
          </ul>


          <div className="mt-4">
            <label className="flex items-center gap-2 text-xs font-semibold"><Tag className="h-3.5 w-3.5" /> {t("promoCode")}</label>
            <div className="mt-2 flex gap-2">
              <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="DUBAI10"
                className="min-w-0 flex-1 rounded-md border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary" />
              <button onClick={() => couponMut.mutate()} disabled={couponMut.isPending || !couponInput}
                className="rounded-md border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50">{t("apply")}</button>
            </div>
            {coupon && <p className="mt-1 text-xs text-success">{coupon.code} · −{formatAED(coupon.discount)}</p>}
          </div>

          <dl className="mt-4 space-y-1.5 border-t pt-4 text-sm">
            <div className="flex justify-between"><dt>{t("subtotal")}</dt><dd className="font-mono">{formatAED(subtotal)}</dd></div>
            {discount > 0 && <div className="flex justify-between text-success"><dt>{t("discount")}</dt><dd className="font-mono">−{formatAED(discount)}</dd></div>}
            <div className="flex justify-between"><dt className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> {t("shipping")} {zone ? `(${zone.emirate})` : ""}</dt><dd className="font-mono">{shipping === 0 ? t("free") : formatAED(shipping)}</dd></div>
            <div className="flex justify-between"><dt>{t("vat")}</dt><dd className="font-mono">{formatAED(vat)}</dd></div>
            {payment === "wallet" && (
              <div className="flex justify-between text-indigo-600 dark:text-indigo-300">
                <dt className="flex items-center gap-1"><Wallet className="h-3.5 w-3.5" /> From Wallet</dt>
                <dd className="font-mono">−{formatAED(total)}</dd>
              </div>
            )}
          </dl>
          <div className="mt-3 flex justify-between border-t pt-3 text-lg font-bold">
            <span>{t("total")}</span>
            {payment === "wallet" ? (
              <span className="flex items-baseline gap-2">
                <span className="font-mono text-xs font-normal text-muted-foreground line-through">{formatAED(total)}</span>
                <span className="font-mono text-primary">{formatAED(0)}</span>
              </span>
            ) : (
              <span className="font-mono text-primary">{formatAED(total)}</span>
            )}
          </div>

          {(() => {
            const handleSubmit = (fn: () => void) => {
              if (!selectedAddressId) {
                toast.error("Please select or add a shipping address before placing your order.");
                addrSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                return;
              }
              fn();
            };
            return payment === "stripe" ? (
              <button onClick={() => handleSubmit(() => stripeMut.mutate())} disabled={stripeMut.isPending}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
                <CreditCard className="h-4 w-4" />
                {stripeMut.isPending ? "Redirecting to Stripe…" : "Pay with Stripe"}
              </button>
            ) : (
              <button onClick={() => handleSubmit(() => placeMut.mutate())} disabled={placeMut.isPending}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
                {payment === "wallet" && <Wallet className="h-4 w-4" />}
                {placeMut.isPending ? t("placing")
                  : payment === "wallet" ? `Pay ${formatAED(0)} by Wallet`
                  : t("placeOrder")}
              </button>
            );
          })()}

        </aside>
      </div>

      {walletError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setWalletError(null)}>
          <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-500/10 p-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-foreground">Credit Limit Exhausted</h3>
                <p className="mt-1 text-sm text-muted-foreground">{walletError}</p>
              </div>
            </div>
            <button onClick={() => setWalletError(null)}
              className="mt-5 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Choose another payment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InlineAddressForm({ zones, forceDefault, onSaved }: { zones: any[]; forceDefault: boolean; onSaved: (row: any) => void }) {
  const [form, setForm] = useState({
    full_name: "", phone: "", emirate: zones[0]?.emirate ?? "Dubai",
    area: "", street: "", building: "", landmark: "", is_default: forceDefault,
  });
  const mut = useMutation({
    mutationFn: () => saveAddress({ data: { ...form, is_default: forceDefault || form.is_default } as any }),
    onSuccess: (row: any) => onSaved(row),
    onError: (e: any) => toast.error(e.message || "Failed to save address"),
  });
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
      className="mt-4 grid gap-3 rounded-md border border-dashed bg-surface-2 p-4 sm:grid-cols-2"
    >
      <input required placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="rounded border bg-background p-2 text-sm" />
      <input required placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded border bg-background p-2 text-sm" />
      <select value={form.emirate} onChange={(e) => setForm({ ...form, emirate: e.target.value })} className="rounded border bg-background p-2 text-sm">
        {(zones.length ? zones : [{ emirate: "Dubai" }, { emirate: "Abu Dhabi" }, { emirate: "Sharjah" }, { emirate: "Ajman" }, { emirate: "Ras Al Khaimah" }, { emirate: "Fujairah" }, { emirate: "Umm Al Quwain" }]).map((z: any) => (
          <option key={z.emirate}>{z.emirate}</option>
        ))}
      </select>
      <input required placeholder="Area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="rounded border bg-background p-2 text-sm" />
      <input required placeholder="Street" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className="rounded border bg-background p-2 text-sm sm:col-span-2" />
      <input placeholder="Building" value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} className="rounded border bg-background p-2 text-sm" />
      <input placeholder="Landmark" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} className="rounded border bg-background p-2 text-sm" />
      {!forceDefault && (
        <label className="flex items-center gap-2 text-xs sm:col-span-2">
          <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
          Save as default address
        </label>
      )}
      <button disabled={mut.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:col-span-2">
        {mut.isPending ? "Saving…" : "Save address"}
      </button>
    </form>
  );
}

