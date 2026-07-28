import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Trash2, Search, X, Plus, Loader2 } from "lucide-react";
import { adminSearchPartsForQuotation, adminSearchCustomersForQuotation } from "@/lib/admin.quotations.functions";

export type Item = {
  part_id: string | null;
  part_snapshot: { part_number: string; oem_number: string; name: string; manufacturer: string };
  quantity: number;
  unit_price: number;
  custom_price: number | null;
  line_discount: number;
};

export type Customer = {
  full_name: string;
  email: string;
  phone: string;
  company_name: string;
  address: string;
};

export type QuotationFormState = {
  customer_id: string | null;
  customer_snapshot: Customer;
  items: Item[];
  discount_type: "percent" | "fixed";
  discount_value: number;
  tax_rate: number;
  shipping_amount: number;
  notes: string;
  terms: string;
  valid_until: string;
  status: "draft" | "sent";
  currency: string;
};

export const blankState: QuotationFormState = {
  customer_id: null,
  customer_snapshot: { full_name: "", email: "", phone: "", company_name: "", address: "" },
  items: [],
  discount_type: "percent",
  discount_value: 0,
  tax_rate: 5,
  shipping_amount: 0,
  notes: "",
  terms: "Quotation valid for the period specified. Prices in AED, exclusive of any additional charges unless stated.",
  valid_until: new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10),
  status: "draft",
  currency: "AED",
};

function useDebounce<T>(v: T, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

export function QuotationBuilder({
  initial,
  onSubmit,
  submitting,
  primaryLabel = "Save quotation",
  searchCustomersFn,
}: {
  initial: QuotationFormState;
  onSubmit: (s: QuotationFormState) => void;
  submitting?: boolean;
  primaryLabel?: string;
  searchCustomersFn?: typeof adminSearchCustomersForQuotation;
}) {
  const [s, setS] = useState<QuotationFormState>(initial);

  // Totals
  const totals = useMemo(() => {
    const lines = s.items.map((it) => {
      const unit = it.custom_price != null ? it.custom_price : it.unit_price;
      const gross = unit * it.quantity;
      const line_total = Math.max(0, gross - (it.line_discount || 0));
      return { ...it, line_total };
    });
    const subtotal = lines.reduce((a, l) => a + l.line_total, 0);
    const discount_amount =
      s.discount_type === "percent"
        ? (subtotal * (s.discount_value || 0)) / 100
        : Math.min(subtotal, s.discount_value || 0);
    const taxable = Math.max(0, subtotal - discount_amount);
    const tax_amount = (taxable * (s.tax_rate || 0)) / 100;
    const grand_total = taxable + tax_amount + (s.shipping_amount || 0);
    return { subtotal, discount_amount, tax_amount, grand_total };
  }, [s]);

  return (
    <div className="space-y-6">
      <CustomerSection s={s} setS={setS} searchFn={searchCustomersFn ?? adminSearchCustomersForQuotation} />

      <ItemsSection s={s} setS={setS} />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-surface p-4 space-y-3">
          <h3 className="font-semibold">Notes & Terms</h3>
          <div>
            <label className="text-xs font-medium">Notes (internal/customer-visible)</label>
            <textarea className="input input-textarea" value={s.notes}
              onChange={(e) => setS({ ...s, notes: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium">Terms & Conditions</label>
            <textarea className="input input-textarea" value={s.terms}
              onChange={(e) => setS({ ...s, terms: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Valid Until</label>
              <input type="date" className="input" value={s.valid_until}
                onChange={(e) => setS({ ...s, valid_until: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium">Status</label>
              <select className="input" value={s.status}
                onChange={(e) => setS({ ...s, status: e.target.value as any })}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-surface p-4 space-y-3">
          <h3 className="font-semibold">Totals</h3>
          <Row label="Subtotal" value={fmt(totals.subtotal, s.currency)} />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground flex-1">Discount</span>
            <select className="input w-20" value={s.discount_type}
              onChange={(e) => setS({ ...s, discount_type: e.target.value as any })}>
              <option value="percent">%</option>
              <option value="fixed">{s.currency}</option>
            </select>
            <input type="number" min={0} step="0.01" className="input w-28 text-right"
              value={s.discount_value}
              onChange={(e) => setS({ ...s, discount_value: Number(e.target.value) || 0 })} />
            <span className="w-24 text-right text-sm tabular-nums">−{fmt(totals.discount_amount, s.currency)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground flex-1">Tax</span>
            <input type="number" min={0} step="0.01" className="input w-28 text-right"
              value={s.tax_rate}
              onChange={(e) => setS({ ...s, tax_rate: Number(e.target.value) || 0 })} />
            <span className="text-sm text-muted-foreground">%</span>
            <span className="w-24 text-right text-sm tabular-nums">{fmt(totals.tax_amount, s.currency)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground flex-1">Shipping</span>
            <input type="number" min={0} step="0.01" className="input w-28 text-right"
              value={s.shipping_amount}
              onChange={(e) => setS({ ...s, shipping_amount: Number(e.target.value) || 0 })} />
            <span className="w-24 text-right text-sm tabular-nums">{fmt(s.shipping_amount, s.currency)}</span>
          </div>
          <div className="border-t pt-2 flex items-center justify-between">
            <span className="font-semibold">Grand Total</span>
            <span className="text-xl font-bold tabular-nums">{fmt(totals.grand_total, s.currency)}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          disabled={submitting || s.items.length === 0}
          onClick={() => onSubmit(s)}
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {primaryLabel}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm tabular-nums">{value}</span>
    </div>
  );
}

function fmt(n: number, cur: string) {
  return `${cur} ${n.toFixed(2)}`;
}

/* ============= Customer Section ============= */
function CustomerSection({ s, setS, searchFn }: { s: QuotationFormState; setS: (s: QuotationFormState) => void; searchFn: typeof adminSearchCustomersForQuotation }) {
  const search = useServerFn(searchFn);
  const [q, setQ] = useState("");

  const dq = useDebounce(q);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!dq || dq.length < 2) { setResults([]); return; }
    setLoading(true);
    search({ data: { q: dq } })
      .then((r: any) => setResults(r ?? []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [dq, search]);

  const pick = (c: any) => {
    setS({
      ...s,
      customer_id: c.id,
      customer_snapshot: {
        full_name: c.full_name ?? "",
        email: "",
        phone: c.phone ?? "",
        company_name: c.company_name ?? "",
        address: "",
      },
    });
    setQ(""); setResults([]);
  };

  return (
    <div className="rounded-lg border bg-surface p-4 space-y-3">
      <h3 className="font-semibold">Customer</h3>
      {!s.customer_id && (
        <div className="relative">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input className="input" placeholder="Search by name / phone / company"
              value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {results.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 max-h-64 overflow-auto rounded-lg border bg-popover shadow-lg">
              {results.map((c) => (
                <button key={c.id} type="button"
                  onClick={() => pick(c)}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-muted">
                  <div className="font-medium">{c.full_name || "(no name)"} <span className="text-xs text-muted-foreground">{c.customer_type}</span></div>
                  <div className="text-xs text-muted-foreground">{[c.company_name, c.phone].filter(Boolean).join(" · ")}</div>
                </button>
              ))}
            </div>
          )}
          {loading && <div className="text-xs text-muted-foreground mt-1">Searching…</div>}
        </div>
      )}
      {s.customer_id && (
        <div className="flex items-center justify-between rounded bg-muted px-3 py-2">
          <div className="text-sm">Linked customer: <span className="font-medium">{s.customer_snapshot.full_name || s.customer_id}</span></div>
          <Button variant="ghost" size="sm" onClick={() => setS({ ...s, customer_id: null })}>
            <X className="h-4 w-4 mr-1" /> Unlink
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Full name" value={s.customer_snapshot.full_name}
          onChange={(v) => setS({ ...s, customer_snapshot: { ...s.customer_snapshot, full_name: v } })} />
        <Field label="Company" value={s.customer_snapshot.company_name}
          onChange={(v) => setS({ ...s, customer_snapshot: { ...s.customer_snapshot, company_name: v } })} />
        <Field label="Email" value={s.customer_snapshot.email}
          onChange={(v) => setS({ ...s, customer_snapshot: { ...s.customer_snapshot, email: v } })} />
        <Field label="Phone" value={s.customer_snapshot.phone}
          onChange={(v) => setS({ ...s, customer_snapshot: { ...s.customer_snapshot, phone: v } })} />
        <div className="col-span-2">
          <Field label="Address" value={s.customer_snapshot.address}
            onChange={(v) => setS({ ...s, customer_snapshot: { ...s.customer_snapshot, address: v } })} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium">{label}</label>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/* ============= Items Section ============= */
function ItemsSection({ s, setS }: { s: QuotationFormState; setS: (s: QuotationFormState) => void }) {
  const search = useServerFn(adminSearchPartsForQuotation);
  const [q, setQ] = useState("");
  const dq = useDebounce(q);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!dq || dq.length < 2) { setResults([]); return; }
    setLoading(true);
    search({ data: { q: dq } })
      .then((r: any) => setResults(r ?? []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [dq, search]);

  const addPart = (p: any) => {
    const item: Item = {
      part_id: p.id,
      part_snapshot: {
        part_number: p.part_number ?? "",
        oem_number: p.oem_number ?? "",
        name: p.name ?? "",
        manufacturer: p.manufacturer ?? "",
      },
      quantity: 1,
      unit_price: Number(p.price ?? 0),
      custom_price: null,
      line_discount: 0,
    };
    setS({ ...s, items: [...s.items, item] });
    setQ(""); setResults([]);
  };

  const addBlank = () => {
    setS({
      ...s,
      items: [...s.items, {
        part_id: null,
        part_snapshot: { part_number: "", oem_number: "", name: "Custom item", manufacturer: "" },
        quantity: 1, unit_price: 0, custom_price: null, line_discount: 0,
      }],
    });
  };

  const update = (idx: number, patch: Partial<Item>) => {
    const next = [...s.items];
    next[idx] = { ...next[idx], ...patch };
    setS({ ...s, items: next });
  };
  const remove = (idx: number) => setS({ ...s, items: s.items.filter((_, i) => i !== idx) });

  return (
    <div className="rounded-lg border bg-surface p-4 space-y-3">
      <h3 className="font-semibold">Products</h3>
      <div className="relative">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input className="input" placeholder="Search by Part #, OEM # or name…"
            value={q} onChange={(e) => setQ(e.target.value)} />
          <Button type="button" variant="outline" size="sm" onClick={addBlank}>
            <Plus className="h-4 w-4 mr-1" /> Custom
          </Button>
        </div>
        {results.length > 0 && (
          <div className="absolute z-10 left-0 right-0 mt-1 max-h-72 overflow-auto rounded-lg border bg-popover shadow-lg">
            {results.map((p) => (
              <button key={p.id} type="button" onClick={() => addPart(p)}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-muted">
                <div className="flex justify-between gap-2">
                  <span className="font-medium truncate">{p.name}</span>
                  <span className="text-xs tabular-nums">{s.currency} {Number(p.price ?? 0).toFixed(2)}</span>
                </div>
                <div className="text-xs text-muted-foreground">{p.part_number} · {p.manufacturer}</div>
              </button>
            ))}
          </div>
        )}
        {loading && <div className="text-xs text-muted-foreground mt-1">Searching…</div>}
      </div>

      {s.items.length === 0 ? (
        <div className="text-sm text-muted-foreground border-2 border-dashed rounded p-6 text-center">
          No products yet. Search above or add a custom item.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b">
                <th className="text-left py-2 px-2">Product</th>
                <th className="text-right py-2 px-2 w-20">Qty</th>
                <th className="text-right py-2 px-2 w-28">Unit Price</th>
                <th className="text-right py-2 px-2 w-28">Override</th>
                <th className="text-right py-2 px-2 w-24">Disc.</th>
                <th className="text-right py-2 px-2 w-28">Line Total</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {s.items.map((it, idx) => {
                const unit = it.custom_price != null ? it.custom_price : it.unit_price;
                const line_total = Math.max(0, unit * it.quantity - (it.line_discount || 0));
                return (
                  <tr key={idx} className="border-b">
                    <td className="py-2 px-2">
                      <input className="input mb-1" value={it.part_snapshot.name}
                        onChange={(e) => update(idx, { part_snapshot: { ...it.part_snapshot, name: e.target.value } })} />
                      <div className="flex gap-2 text-xs">
                        <input className="input text-xs" placeholder="Part #" value={it.part_snapshot.part_number}
                          onChange={(e) => update(idx, { part_snapshot: { ...it.part_snapshot, part_number: e.target.value } })} />
                        <input className="input text-xs" placeholder="OEM #" value={it.part_snapshot.oem_number}
                          onChange={(e) => update(idx, { part_snapshot: { ...it.part_snapshot, oem_number: e.target.value } })} />
                      </div>
                    </td>
                    <td className="px-2 align-top">
                      <input type="number" min={1} className="input text-right" value={it.quantity}
                        onChange={(e) => update(idx, { quantity: Math.max(1, Number(e.target.value) || 1) })} />
                    </td>
                    <td className="px-2 align-top">
                      <input type="number" min={0} step="0.01" className="input text-right" value={it.unit_price}
                        onChange={(e) => update(idx, { unit_price: Number(e.target.value) || 0 })} />
                    </td>
                    <td className="px-2 align-top">
                      <input type="number" min={0} step="0.01" className="input text-right"
                        placeholder="—" value={it.custom_price ?? ""}
                        onChange={(e) => update(idx, { custom_price: e.target.value === "" ? null : Number(e.target.value) })} />
                    </td>
                    <td className="px-2 align-top">
                      <input type="number" min={0} step="0.01" className="input text-right" value={it.line_discount}
                        onChange={(e) => update(idx, { line_discount: Number(e.target.value) || 0 })} />
                    </td>
                    <td className="px-2 align-top text-right tabular-nums">{fmt(line_total, s.currency)}</td>
                    <td className="px-2 align-top">
                      <Button variant="ghost" size="sm" onClick={() => remove(idx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
