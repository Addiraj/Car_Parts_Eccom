import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Copy, Trash2, Search, Tag, X } from "lucide-react";
import {
  adminListOffers, adminGetOffer, adminUpsertOffer, adminDuplicateOffer, adminDeleteOffer,
  adminSetOfferStatus, adminSearchPartsForOffer, adminListPartManufacturersForOffer,
  computeOfferPrice,
  type OfferStatus, type OfferDiscountType,
} from "@/lib/offers.functions";
import { formatAED } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/special-offers")({
  head: () => ({ meta: [{ title: "Special Offers — Admin" }] }),
  component: AdminOffersPage,
});

type EditorState = {
  open: boolean;
  id?: string;
  offer_name: string;
  description: string;
  discount_type: OfferDiscountType;
  discount_value: number;
  start_date: string;
  end_date: string;
  status: OfferStatus;
  max_discount_amount: number | "";
  min_order_value: number | "";
  allow_stacking: boolean;
  eligible_customer_types: ("IND" | "GAR" | "EXP")[];
  product_ids: string[];
  manufacturers: string[];
};

const blank = (): EditorState => ({
  open: false,
  offer_name: "",
  description: "",
  discount_type: "percentage",
  discount_value: 10,
  start_date: new Date().toISOString().slice(0, 16),
  end_date: new Date(Date.now() + 7 * 86400 * 1000).toISOString().slice(0, 16),
  status: "scheduled",
  max_discount_amount: "",
  min_order_value: "",
  allow_stacking: false,
  eligible_customer_types: ["IND", "GAR", "EXP"],
  product_ids: [],
  manufacturers: [],
});

function AdminOffersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<OfferStatus | "all">("all");
  const [editor, setEditor] = useState<EditorState>(blank());

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["admin-offers", q, statusFilter],
    queryFn: () => adminListOffers({ data: { q, status: statusFilter } }),
  });

  const dup = useMutation({
    mutationFn: (id: string) => adminDuplicateOffer({ data: { id } }),
    onSuccess: () => { toast.success("Duplicated"); qc.invalidateQueries({ queryKey: ["admin-offers"] }); },
  });
  const del = useMutation({
    mutationFn: (id: string) => adminDeleteOffer({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-offers"] }); },
  });
  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: OfferStatus }) => adminSetOfferStatus({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-offers"] }),
  });

  const openCreate = () => setEditor({ ...blank(), open: true });
  const openEdit = async (id: string) => {
    const row: any = await adminGetOffer({ data: { id } });
    setEditor({
      open: true,
      id: row.id,
      offer_name: row.offer_name,
      description: row.description ?? "",
      discount_type: row.discount_type,
      discount_value: Number(row.discount_value),
      start_date: row.start_date.slice(0, 16),
      end_date: row.end_date.slice(0, 16),
      status: row.status,
      max_discount_amount: row.max_discount_amount ?? "",
      min_order_value: row.min_order_value ?? "",
      allow_stacking: !!row.allow_stacking,
      eligible_customer_types: row.eligible_customer_types ?? ["IND", "GAR", "EXP"],
      product_ids: (row.products ?? []).map((x: any) => x.part_id),
      manufacturers: [],
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Tag className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Special Offers</h1>
        <span className="text-xs text-muted-foreground">{offers.length} total</span>
        <button onClick={openCreate}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> New offer
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search offer name…"
            className="w-72 rounded-md border bg-surface-2 px-3 py-2 pl-8 text-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
          className="rounded-md border bg-surface-2 px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="scheduled">Scheduled</option>
          <option value="expired">Expired</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border bg-surface">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Offer</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Window</th>
              <th className="px-4 py-3">Targets</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td colSpan={6} className="p-4 text-muted-foreground">Loading…</td></tr>}
            {!isLoading && offers.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No offers yet. Create one to get started.</td></tr>
            )}
            {offers.map((o: any) => {
              const productCount = o.products?.length ?? 0;
              const brandCount = o.brands?.length ?? 0;
              const catCount = o.categories?.length ?? 0;
              return (
                <tr key={o.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{o.offer_name}</div>
                    {o.description && <div className="line-clamp-1 text-xs text-muted-foreground">{o.description}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {o.discount_type === "percentage" ? `${Number(o.discount_value)}%` : formatAED(Number(o.discount_value))}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <div>{new Date(o.start_date).toLocaleDateString()}</div>
                    <div>→ {new Date(o.end_date).toLocaleDateString()}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {productCount > 0 && <span className="me-1 rounded bg-secondary px-1.5 py-0.5">{productCount} parts</span>}
                    {brandCount > 0 && <span className="me-1 rounded bg-secondary px-1.5 py-0.5">{brandCount} brands</span>}
                    {catCount > 0 && <span className="me-1 rounded bg-secondary px-1.5 py-0.5">{catCount} categories</span>}
                    {productCount + brandCount + catCount === 0 && <span className="text-muted-foreground">none</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(o.id)} className="rounded p-1.5 hover:bg-muted" title="Edit"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => dup.mutate(o.id)} className="rounded p-1.5 hover:bg-muted" title="Duplicate"><Copy className="h-4 w-4" /></button>
                      <button
                        onClick={() => setStatus.mutate({ id: o.id, status: o.status === "disabled" ? "scheduled" : "disabled" })}
                        className="rounded px-2 py-1 text-xs hover:bg-muted" title="Toggle disabled">
                        {o.status === "disabled" ? "Enable" : "Disable"}
                      </button>
                      <button onClick={() => { if (confirm("Delete offer?")) del.mutate(o.id); }}
                        className="rounded p-1.5 text-destructive hover:bg-destructive/10" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editor.open && <OfferEditor state={editor} setState={setEditor} onClose={() => setEditor(blank())} />}
    </div>
  );
}

function StatusBadge({ status }: { status: OfferStatus }) {
  const cls =
    status === "active" ? "bg-success/15 text-success border-success/30" :
    status === "scheduled" ? "bg-primary/15 text-primary border-primary/30" :
    status === "expired" ? "bg-muted text-muted-foreground border-border" :
    "bg-destructive/15 text-destructive border-destructive/30";
  return <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>{status}</span>;
}

function OfferEditor({ state, setState, onClose }: { state: EditorState; setState: (s: EditorState) => void; onClose: () => void }) {
  const qc = useQueryClient();
  const upd = (patch: Partial<EditorState>) => setState({ ...state, ...patch });
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const { data: manufacturers = [] } = useQuery({
    queryKey: ["admin-offer-manufacturers"],
    queryFn: () => adminListPartManufacturersForOffer(),
  });

  const [partQuery, setPartQuery] = useState("");
  const { data: partResults = [] } = useQuery({
    queryKey: ["admin-offer-parts", partQuery],
    queryFn: () => adminSearchPartsForOffer({ data: { q: partQuery, limit: 30 } }),
  });
  const [pickedParts, setPickedParts] = useState<Map<string, { id: string; part_number: string; name: string }>>(() => {
    const m = new Map();
    for (const id of state.product_ids) m.set(id, { id, part_number: id.slice(0, 8), name: "(loaded)" });
    return m;
  });

  // hydrate picked-part labels when editing
  useMemo(() => {
    if (state.id && state.product_ids.length && pickedParts.size && Array.from(pickedParts.values())[0]?.name === "(loaded)") {
      adminSearchPartsForOffer({ data: { q: "", limit: 100 } });
    }
  }, [state.id]);

  const togglePart = (p: { id: string; part_number: string; name: string }) => {
    const m = new Map(pickedParts);
    if (m.has(p.id)) m.delete(p.id); else m.set(p.id, p);
    setPickedParts(m);
    upd({ product_ids: Array.from(m.keys()) });
  };

  const save = useMutation({
    mutationFn: () => adminUpsertOffer({
      data: {
        id: state.id,
        offer_name: state.offer_name,
        description: state.description || null,
        discount_type: state.discount_type,
        discount_value: Number(state.discount_value),
        start_date: new Date(state.start_date).toISOString(),
        end_date: new Date(state.end_date).toISOString(),
        status: state.status,
        max_discount_amount: state.max_discount_amount === "" ? null : Number(state.max_discount_amount),
        min_order_value: state.min_order_value === "" ? null : Number(state.min_order_value),
        allow_stacking: state.allow_stacking,
        eligible_customer_types: state.eligible_customer_types,
        product_ids: state.product_ids,
        manufacturers: state.manufacturers,
      },
    }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin-offers"] }); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  // preview
  const sampleOriginal = 500;
  const { final, discount } = computeOfferPrice(sampleOriginal, {
    discount_type: state.discount_type,
    discount_value: Number(state.discount_value),
    max_discount_amount: state.max_discount_amount === "" ? null : Number(state.max_discount_amount),
  });
  const savingsPct = sampleOriginal > 0 ? Math.round((discount / sampleOriginal) * 100) : 0;

  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  const scrollModal = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    el.scrollTop += e.deltaY;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-background/80 p-4 backdrop-blur" onClick={onClose} onWheel={scrollModal}>
      <div onClick={(e) => e.stopPropagation()} onWheel={scrollModal}
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border bg-surface shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-surface/95 px-6 py-4 backdrop-blur">
          <h2 className="text-xl font-bold">{state.id ? "Edit offer" : "New offer"}</h2>
          <button onClick={onClose} className="rounded p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div ref={scrollerRef} data-offer-modal-scroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Offer name">
            <input value={state.offer_name} onChange={(e) => upd({ offer_name: e.target.value })}
              className="w-full rounded-md border bg-surface-2 px-3 py-2 text-sm" />
          </Field>
          <Field label="Status">
            <select value={state.status} onChange={(e) => upd({ status: e.target.value as OfferStatus })}
              className="w-full rounded-md border bg-surface-2 px-3 py-2 text-sm">
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="expired">Expired</option>
            </select>
          </Field>
          <Field label="Description" className="md:col-span-2">
            <textarea value={state.description} onChange={(e) => upd({ description: e.target.value })} rows={2}
              className="w-full rounded-md border bg-surface-2 px-3 py-2 text-sm" />
          </Field>
          <Field label="Discount type">
            <select value={state.discount_type} onChange={(e) => upd({ discount_type: e.target.value as OfferDiscountType })}
              className="w-full rounded-md border bg-surface-2 px-3 py-2 text-sm">
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed (AED)</option>
            </select>
          </Field>
          <Field label="Discount value">
            <input type="number" min={0} value={state.discount_value}
              onChange={(e) => upd({ discount_value: Number(e.target.value) })}
              className="w-full rounded-md border bg-surface-2 px-3 py-2 text-sm" />
          </Field>
          <Field label="Start date">
            <input type="datetime-local" value={state.start_date} onChange={(e) => upd({ start_date: e.target.value })}
              className="w-full rounded-md border bg-surface-2 px-3 py-2 text-sm" />
          </Field>
          <Field label="End date">
            <input type="datetime-local" value={state.end_date} onChange={(e) => upd({ end_date: e.target.value })}
              className="w-full rounded-md border bg-surface-2 px-3 py-2 text-sm" />
          </Field>
          <Field label="Max discount amount (AED)">
            <input type="number" min={0} value={state.max_discount_amount}
              onChange={(e) => upd({ max_discount_amount: e.target.value === "" ? "" : Number(e.target.value) })}
              className="w-full rounded-md border bg-surface-2 px-3 py-2 text-sm" placeholder="Optional cap" />
          </Field>
          <Field label="Minimum order value (AED)">
            <input type="number" min={0} value={state.min_order_value}
              onChange={(e) => upd({ min_order_value: e.target.value === "" ? "" : Number(e.target.value) })}
              className="w-full rounded-md border bg-surface-2 px-3 py-2 text-sm" placeholder="Optional minimum" />
          </Field>
          <Field label="Stacking">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={state.allow_stacking}
                onChange={(e) => upd({ allow_stacking: e.target.checked })} />
              Allow stacking with other discounts
            </label>
          </Field>
          <Field label="Eligible customer types">
            <div className="flex flex-wrap gap-3 text-sm">
              {(["IND", "GAR", "EXP"] as const).map((c) => (
                <label key={c} className="inline-flex items-center gap-1.5">
                  <input type="checkbox" checked={state.eligible_customer_types.includes(c)}
                    onChange={(e) => {
                      const set = new Set(state.eligible_customer_types);
                      if (e.target.checked) set.add(c); else set.delete(c);
                      upd({ eligible_customer_types: Array.from(set) as any });
                    }} />
                  {c === "IND" ? "Individual" : c === "GAR" ? "Garage" : "Bulk/Export"}
                </label>
              ))}
            </div>
          </Field>
        </div>

        {/* Targeting */}
        <div className="mt-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Apply to</div>

          <div className="mt-3">
            <div className="text-xs font-semibold">Part manufacturers</div>
            <div className="mt-2 flex max-h-40 flex-wrap gap-1 overflow-y-auto rounded-md border bg-surface-2 p-2">
              {manufacturers.length === 0 && (
                <span className="text-xs text-muted-foreground">No manufacturers found in parts catalog.</span>
              )}
              {manufacturers.map((m) => {
                const on = state.manufacturers.includes(m.name);
                return (
                  <button key={m.name} type="button"
                    onClick={() => upd({ manufacturers: on ? state.manufacturers.filter((x) => x !== m.name) : [...state.manufacturers, m.name] })}
                    className={`rounded-full border px-2.5 py-1 text-xs ${on ? "border-primary bg-primary/15 text-primary" : "border-white/10 text-muted-foreground hover:border-white/30"}`}>
                    {m.name} <span className="opacity-60">({m.count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs font-semibold">Specific parts</div>
            <input value={partQuery} onChange={(e) => setPartQuery(e.target.value)}
              placeholder="Search by part #, name, OEM #, or brand…"
              className="mt-2 w-full rounded-md border bg-surface-2 px-3 py-2 text-sm" />
            <div className="mt-2 max-h-48 overflow-y-auto rounded-md border bg-surface-2">
              {partResults.map((p: any) => {
                const picked = pickedParts.has(p.id);
                return (
                  <button key={p.id} type="button" onClick={() => togglePart(p)}
                    className={`flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/30 ${picked ? "bg-primary/10" : ""}`}>
                    <div>
                      <div className="font-mono text-xs">{p.part_number}</div>
                      <div className="line-clamp-1">{p.name}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{p.manufacturer}</div>
                  </button>
                );
              })}
              {partResults.length === 0 && <div className="p-3 text-xs text-muted-foreground">No matches.</div>}
            </div>
            {pickedParts.size > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {Array.from(pickedParts.values()).map((p) => (
                  <span key={p.id} className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {p.part_number}
                    <button onClick={() => togglePart(p)} className="rounded-full hover:bg-primary/20"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="mt-6 rounded-lg border bg-surface-2 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview (on a {formatAED(sampleOriginal)} part)</div>
          <div className="mt-2 flex flex-wrap items-baseline gap-4">
            <span className="text-sm text-muted-foreground line-through">{formatAED(sampleOriginal)}</span>
            <span className="text-2xl font-bold text-primary">{formatAED(final)}</span>
            <span className="rounded bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">−{savingsPct}%</span>
            <span className="text-sm text-success">You save {formatAED(discount)}</span>
          </div>
        </div>

        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-surface/95 px-6 py-4 backdrop-blur">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending || !state.offer_name.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {save.isPending ? "Saving…" : "Save offer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
