import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  adminListSalesmen,
  adminCreateSalesman,
  adminSetSalesmanStatus,
  adminDeleteSalesman,
} from "@/lib/admin.salesmen.functions";
import { toast } from "sonner";
import { Plus, Search, Users, UserX, UserCheck, Trash2, ExternalLink, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/salesmen")({
  head: () => ({ meta: [{ title: "Admin · Salesmen" }] }),
  component: SalesmenPage,
});

function SalesmenPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"ALL" | "active" | "inactive">("ALL");
  const [open, setOpen] = useState(false);

  const { data: rows = [] } = useQuery({
    queryKey: ["admin-salesmen", q, status],
    queryFn: () => adminListSalesmen({ data: { q, status } }),
  });

  const setStatusM = useMutation({
    mutationFn: (v: { id: string; status: "active" | "inactive" }) => adminSetSalesmanStatus({ data: v }),
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["admin-salesmen"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => adminDeleteSalesman({ data: { id } }),
    onSuccess: () => { toast.success("Salesman removed"); qc.invalidateQueries({ queryKey: ["admin-salesmen"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Salesmen</h1>
          <p className="text-sm text-muted-foreground">Manage salesman accounts and assignments.</p>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> New Salesman
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, ID…"
            className="w-full rounded border bg-surface-2 py-2 pl-9 pr-3 text-sm" />
        </div>
        <div className="flex rounded-lg border bg-surface p-1 text-sm">
          {(["ALL", "active", "inactive"] as const).map((t) => (
            <button key={t} onClick={() => setStatus(t)} className={`rounded-md px-3 py-1.5 capitalize ${status === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {t === "ALL" ? "All" : t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Salesman</th>
              <th className="px-3 py-2 text-left">Employee ID</th>
              <th className="px-3 py-2 text-left">Territory</th>
              <th className="px-3 py-2 text-left">Customers</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Joined</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(rows as any[]).map((s) => (
              <tr key={s.id} className="hover:bg-surface-2/50">
                <td className="px-3 py-2">
                  <Link to="/admin/salesmen/$id" params={{ id: s.id }} className="font-medium text-primary hover:underline">{s.full_name}</Link>
                  <div className="text-xs text-muted-foreground">{s.email} {s.phone ? `· ${s.phone}` : ""}</div>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{s.employee_id || "—"}</td>
                <td className="px-3 py-2">{s.territory || "—"}</td>
                <td className="px-3 py-2"><span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {s.assigned_count}</span></td>
                <td className="px-3 py-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.status === "active" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-muted bg-muted/40 text-muted-foreground"}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{s.joining_date ?? (s.created_at ? new Date(s.created_at).toLocaleDateString() : "—")}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={() => setStatusM.mutate({ id: s.id, status: s.status === "active" ? "inactive" : "active" })}
                      className="rounded border p-1 hover:bg-surface-2" title={s.status === "active" ? "Disable" : "Activate"}>
                      {s.status === "active" ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                    </button>
                    <Link to="/admin/salesmen/$id" params={{ id: s.id }} className="rounded border p-1 hover:bg-surface-2">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    <button onClick={() => { if (confirm(`Delete ${s.full_name}? This removes their account and all assignments.`)) del.mutate(s.id); }}
                      className="rounded border border-red-500/40 p-1 text-red-600 hover:bg-red-500/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-muted-foreground">No salesmen yet. Create one to get started.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && <CreateDialog onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["admin-salesmen"] }); }} />}
    </div>
  );
}

function CreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    employee_id: "", full_name: "", email: "", password: "", phone: "", territory: "", joining_date: "",
  });
  const create = useMutation({
    mutationFn: () => adminCreateSalesman({ data: { ...form, joining_date: form.joining_date || null } as any }),
    onSuccess: () => { toast.success("Salesman created"); onCreated(); },
    onError: (e: any) => toast.error(e.message),
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">New Salesman</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-surface-2"><X className="h-4 w-4" /></button>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
          className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Field label="Full Name *" value={form.full_name} onChange={(v) => set("full_name", v)} required />
          <Field label="Employee ID" value={form.employee_id} onChange={(v) => set("employee_id", v)} />
          <Field label="Email *" type="email" value={form.email} onChange={(v) => set("email", v)} required />
          <Field label="Password *" type="password" value={form.password} onChange={(v) => set("password", v)} required minLength={8} />
          <Field label="Phone" value={form.phone} onChange={(v) => set("phone", v)} />
          <Field label="Territory" value={form.territory} onChange={(v) => set("territory", v)} />
          <Field label="Joining Date" type="date" value={form.joining_date} onChange={(v) => set("joining_date", v)} />
          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded border px-4 py-2 text-sm">Cancel</button>
            <button disabled={create.isPending} className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {create.isPending ? "Creating…" : "Create Salesman"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, minLength }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; minLength?: number }) {
  return (
    <label className="col-span-1 block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input type={type} required={required} minLength={minLength} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded border bg-surface-2 px-3 py-2 text-sm" />
    </label>
  );
}
