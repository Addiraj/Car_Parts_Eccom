import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  adminGetSalesman,
  adminUpdateSalesman,
  adminResetSalesmanPassword,
  adminSetSalesmanStatus,
} from "@/lib/admin.salesmen.functions";
import { formatAED } from "@/lib/format";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/salesmen/$id")({
  head: () => ({ meta: [{ title: "Salesman" }] }),
  component: SalesmanDetail,
});

function SalesmanDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["admin-salesman", id], queryFn: () => adminGetSalesman({ data: { id } }) });

  const [form, setForm] = useState<any | null>(null);
  const s: any = data?.salesman;
  if (s && !form) setForm({
    full_name: s.full_name, email: s.email, phone: s.phone ?? "",
    employee_id: s.employee_id ?? "", territory: s.territory ?? "",
    joining_date: s.joining_date ?? "",
  });

  const save = useMutation({
    mutationFn: () => adminUpdateSalesman({ data: { id, ...form, joining_date: form.joining_date || null } as any }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin-salesman", id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: () => adminSetSalesmanStatus({ data: { id, status: s?.status === "active" ? "inactive" : "active" } }),
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["admin-salesman", id] }); qc.invalidateQueries({ queryKey: ["admin-salesmen"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const reset = useMutation({
    mutationFn: (password: string) => adminResetSalesmanPassword({ data: { id, password } }),
    onSuccess: () => toast.success("Password reset"),
    onError: (e: any) => toast.error(e.message),
  });

  if (!data) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const st = data.stats;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate({ to: "/admin/salesmen" })} className="rounded border p-1.5 hover:bg-surface-2">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-2xl font-bold">{s.full_name}</h1>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.status === "active" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-muted text-muted-foreground"}`}>{s.status}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KPI label="Assigned Customers" value={String(st.assignedCustomers)} />
        <KPI label="Total Quotations" value={String(st.totalQuotations)} />
        <KPI label="Approved" value={String(st.approvedQuotations)} />
        <KPI label="Total Orders" value={String(st.totalOrders)} />
        <KPI label="Revenue" value={formatAED(st.revenue)} />
      </div>

      {form && (
        <section className="rounded-lg border bg-surface p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Profile</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <F label="Full Name" v={form.full_name} on={(v) => setForm({ ...form, full_name: v })} />
            <F label="Email" v={form.email} on={(v) => setForm({ ...form, email: v })} />
            <F label="Phone" v={form.phone} on={(v) => setForm({ ...form, phone: v })} />
            <F label="Employee ID" v={form.employee_id} on={(v) => setForm({ ...form, employee_id: v })} />
            <F label="Territory" v={form.territory} on={(v) => setForm({ ...form, territory: v })} />
            <F label="Joining Date" type="date" v={form.joining_date ?? ""} on={(v) => setForm({ ...form, joining_date: v })} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => save.mutate()} disabled={save.isPending} className="inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              <Save className="h-4 w-4" /> Save
            </button>
            <button onClick={() => toggleStatus.mutate()} className="rounded border px-4 py-2 text-sm">
              {s.status === "active" ? "Disable Account" : "Activate Account"}
            </button>
            <button onClick={() => {
              const pw = prompt("New password (min 8 chars):");
              if (pw && pw.length >= 8) reset.mutate(pw);
              else if (pw) toast.error("Password too short");
            }} className="inline-flex items-center gap-1.5 rounded border px-4 py-2 text-sm">
              <KeyRound className="h-4 w-4" /> Reset Password
            </button>
          </div>
        </section>
      )}

      <section className="rounded-lg border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Assigned Customers ({data.customers.length})</h2>
          <Link to="/admin/assignments" search={{ salesman_id: id } as any} className="text-xs text-primary hover:underline">Manage assignments</Link>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr><th className="py-2 text-left">Customer</th><th className="py-2 text-left">Type</th><th className="py-2 text-left">Status</th><th className="py-2 text-left">Assigned</th><th className="py-2 text-left">Last Activity</th></tr>
            </thead>
            <tbody className="divide-y">
              {data.customers.map((c: any) => (
                <tr key={c.id}>
                  <td className="py-2"><Link to="/admin/customers/$id" params={{ id: c.id }} className="text-primary hover:underline">{c.full_name || "—"}</Link>{c.company_name && <div className="text-xs text-muted-foreground">{c.company_name}</div>}</td>
                  <td className="py-2 text-xs">{c.customer_type}</td>
                  <td className="py-2 text-xs">{c.status}</td>
                  <td className="py-2 text-xs text-muted-foreground">{c.assigned_at ? new Date(c.assigned_at).toLocaleDateString() : "—"}</td>
                  <td className="py-2 text-xs text-muted-foreground">{c.last_activity_at ? new Date(c.last_activity_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
              {!data.customers.length && <tr><td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">No customers assigned yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-surface p-4">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
function F({ label, v, on, type = "text" }: { label: string; v: string; on: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input type={type} value={v} onChange={(e) => on(e.target.value)} className="mt-1 w-full rounded border bg-surface-2 px-3 py-2 text-sm" />
    </label>
  );
}
