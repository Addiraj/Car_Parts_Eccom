import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  adminGetCustomer,
  adminApproveCustomer,
  adminSetCustomerStatus,
  adminUpdateCustomerBusiness,
} from "@/lib/admin.customers.functions";
import { adminUpdateUserCustomerType } from "@/lib/admin.functions";
import { formatAED } from "@/lib/format";
import { CustomerTypeBadge } from "@/components/customer-type-badge";
import { CustomerCRMTabs } from "@/components/admin/customer-crm-tabs";
import { CreditWalletTab } from "@/components/admin/credit-wallet-tab";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Ban,
  Clock,
  Mail,
  Phone,
  Building2,
  FileText,
  CreditCard,
  Save,
  Heart,
  MapPin,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/customers/$id")({
  head: () => ({ meta: [{ title: "Customer — Admin" }] }),
  component: CustomerDetail,
});

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string; Icon: any }> = {
    pending: { cls: "bg-amber-500/10 text-amber-600 border-amber-500/30", label: "Pending", Icon: Clock },
    active: { cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", label: "Active", Icon: CheckCircle2 },
    suspended: { cls: "bg-red-500/10 text-red-600 border-red-500/30", label: "Suspended", Icon: Ban },
  };
  const s = map[status] ?? map.active;
  const I = s.Icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${s.cls}`}>
      <I className="h-3 w-3" /> {s.label}
    </span>
  );
}

function CustomerDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-customer", id],
    queryFn: () => adminGetCustomer({ data: { id } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-customer", id] });

  const approve = useMutation({
    mutationFn: () => adminApproveCustomer({ data: { id } }),
    onSuccess: () => { toast.success("Customer approved"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const setStatus = useMutation({
    mutationFn: (v: { status: "pending" | "active" | "suspended"; note?: string }) => adminSetCustomerStatus({ data: { id, ...v } }),
    onSuccess: () => { toast.success("Status updated"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateType = useMutation({
    mutationFn: (customerType: "IND" | "GAR" | "EXP") => adminUpdateUserCustomerType({ data: { userId: id, customerType } }),
    onSuccess: () => { toast.success("Customer type updated"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: (v: any) => adminUpdateCustomerBusiness({ data: { id, ...v } }),
    onSuccess: () => { toast.success("Saved"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const [suspendNote, setSuspendNote] = useState("");
  const [showSuspend, setShowSuspend] = useState(false);
  const [form, setForm] = useState<any>(null);
  const p = data?.profile as any;
  const f = form ?? p ?? {};

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  if (!p) return <div className="py-20 text-center text-muted-foreground">Customer not found.</div>;

  return (
    <div className="space-y-6">
      <Link to="/admin/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to customers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-surface p-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{p.full_name || data?.email || "Unnamed customer"}</h1>
            <StatusBadge status={p.status} />
            <CustomerTypeBadge type={p.customer_type} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {data?.email ?? "—"}</span>
            <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {p.phone ?? "—"}</span>
            {p.company_name && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {p.company_name}</span>}
            <span>Joined {new Date(p.created_at).toLocaleDateString()}</span>
            {data?.lastSignIn && <span>Last seen {new Date(data.lastSignIn).toLocaleDateString()}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {p.status === "pending" && (
            <button onClick={() => approve.mutate()} disabled={approve.isPending}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              <CheckCircle2 className="h-4 w-4" /> Approve
            </button>
          )}
          {p.status !== "suspended" && (
            <button onClick={() => setShowSuspend(true)}
              className="inline-flex items-center gap-1 rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">
              <Ban className="h-4 w-4" /> Suspend
            </button>
          )}
          {p.status === "suspended" && (
            <button onClick={() => setStatus.mutate({ status: "active" })}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Reactivate
            </button>
          )}
        </div>
      </div>

      {showSuspend && (
        <div className="rounded-lg border border-red-300 bg-red-50/40 p-4">
          <h3 className="font-semibold text-red-700">Suspend customer</h3>
          <textarea value={suspendNote} onChange={(e) => setSuspendNote(e.target.value)}
            placeholder="Reason (saved to admin notes)…" rows={2}
            className="mt-2 w-full rounded border bg-surface-2 p-2 text-sm" />
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={() => setShowSuspend(false)} className="rounded-md border px-3 py-1.5 text-sm">Cancel</button>
            <button onClick={() => { setStatus.mutate({ status: "suspended", note: suspendNote }); setShowSuspend(false); setSuspendNote(""); }}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white">Confirm suspend</button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <KPI label="Total orders" value={String(data?.orderCount ?? 0)} />
        <KPI label="Lifetime spend" value={formatAED(Number(data?.totalSpend ?? 0))} mono />
        <KPI label="Credit limit" value={formatAED(Number(p.credit_limit ?? 0))} mono />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border bg-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Building2 className="h-4 w-4" /> Profile & Business</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name"><input className="input" value={f.full_name ?? ""} onChange={(e) => setForm({ ...f, full_name: e.target.value })} /></Field>
            <Field label="Phone"><input className="input" value={f.phone ?? ""} onChange={(e) => setForm({ ...f, phone: e.target.value })} /></Field>
            <Field label="Customer type">
              <select className="input" value={f.customer_type} onChange={(e) => updateType.mutate(e.target.value as any)}>
                <option value="IND">IND — Individual</option>
                <option value="GAR">GAR — Garage</option>
                <option value="EXP">EXP — Exporter</option>
              </select>
            </Field>
            <Field label="Credit limit (AED)">
              <input className="input" type="number" min={0} value={f.credit_limit ?? 0} onChange={(e) => setForm({ ...f, credit_limit: Number(e.target.value) })} />
            </Field>
            <Field label="Company name"><input className="input" value={f.company_name ?? ""} onChange={(e) => setForm({ ...f, company_name: e.target.value })} /></Field>
            <Field label="Trade license"><input className="input" value={f.trade_license ?? ""} onChange={(e) => setForm({ ...f, trade_license: e.target.value })} /></Field>
            <Field label="VAT number"><input className="input" value={f.vat_number ?? ""} onChange={(e) => setForm({ ...f, vat_number: e.target.value })} /></Field>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={() => update.mutate({
              full_name: f.full_name, phone: f.phone, company_name: f.company_name,
              trade_license: f.trade_license, vat_number: f.vat_number, credit_limit: Number(f.credit_limit ?? 0),
            })} disabled={update.isPending}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
              <Save className="h-4 w-4" /> Save profile
            </button>
          </div>
        </section>

        <section className="rounded-lg border bg-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><FileText className="h-4 w-4" /> Admin notes</h2>
          <textarea rows={8} className="w-full rounded border bg-surface-2 p-2 text-sm font-mono"
            value={f.admin_notes ?? ""} onChange={(e) => setForm({ ...f, admin_notes: e.target.value })}
            placeholder="Internal notes (not visible to customer)…" />
          <div className="mt-3 flex justify-end">
            <button onClick={() => update.mutate({ admin_notes: f.admin_notes ?? "" })}
              className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-surface-2">
              Save notes
            </button>
          </div>
          {p.approved_at && (
            <p className="mt-3 text-xs text-muted-foreground">
              Approved {new Date(p.approved_at).toLocaleString()}
            </p>
          )}
        </section>

        <section className="rounded-lg border bg-surface p-5 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><CreditCard className="h-4 w-4" /> Recent orders</h2>
          {data?.orders?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr><th className="px-2 py-1 text-left">Order</th><th className="text-left">Status</th><th className="text-left">Payment</th><th className="text-right">Total</th><th className="text-left">Date</th></tr>
                </thead>
                <tbody className="divide-y">
                  {data.orders.map((o: any) => (
                    <tr key={o.id}>
                      <td className="px-2 py-1.5"><Link to="/admin/orders/$id" params={{ id: o.id }} className="font-mono text-primary hover:underline">{o.order_number}</Link></td>
                      <td className="px-2 py-1.5">{o.status}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{o.payment_method ?? "—"}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{formatAED(Number(o.total))}</td>
                      <td className="px-2 py-1.5 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-muted-foreground">No orders yet.</p>}
        </section>

        <section className="rounded-lg border bg-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><MapPin className="h-4 w-4" /> Addresses ({data?.addresses?.length ?? 0})</h2>
          {data?.addresses?.length ? (
            <ul className="space-y-3 text-sm">
              {data.addresses.map((a: any) => (
                <li key={a.id} className="rounded border bg-surface-2 p-3">
                  <div className="font-medium">{a.full_name ?? "—"} · {a.phone ?? ""}{a.is_default ? " · default" : ""}</div>
                  <div className="text-muted-foreground">{[a.building, a.street, a.area, a.emirate].filter(Boolean).join(", ")}</div>
                  {a.landmark && <div className="text-xs text-muted-foreground">Landmark: {a.landmark}</div>}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No saved addresses.</p>}
        </section>

        <section className="rounded-lg border bg-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Heart className="h-4 w-4" /> Wishlist</h2>
          <p className="text-sm">{data?.wishlistCount ?? 0} items saved.</p>
          <p className="mt-2 text-xs text-muted-foreground">Roles: {(data?.roles ?? []).join(", ") || "customer"}</p>
        </section>
      </div>

      <section className="rounded-lg border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Credit Wallet</h2>
        <CreditWalletTab userId={id} />
      </section>

      <CustomerCRMTabs customerId={id} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
function KPI({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border bg-surface p-4">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
