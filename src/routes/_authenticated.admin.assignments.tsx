import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  adminListAssignments,
  adminAssignCustomer,
  adminUnassignCustomer,
  adminBulkAssignCustomers,
} from "@/lib/admin.salesmen.functions";
import { toast } from "sonner";
import { Search, UserPlus, UserMinus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/assignments")({
  validateSearch: (s: Record<string, unknown>) => ({
    salesman_id: typeof s.salesman_id === "string" ? s.salesman_id : undefined,
    unassigned: s.unassigned === "1" || s.unassigned === true ? true : undefined,
  }),
  head: () => ({ meta: [{ title: "Admin · Customer Assignments" }] }),
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const search = Route.useSearch();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [salesmanFilter, setSalesmanFilter] = useState<string>(search.salesman_id ?? "");
  const [unassignedOnly, setUnassignedOnly] = useState<boolean>(!!search.unassigned);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSalesman, setBulkSalesman] = useState<string>("");

  const { data } = useQuery({
    queryKey: ["admin-assignments", q, salesmanFilter, unassignedOnly],
    queryFn: () => adminListAssignments({ data: { q, salesman_id: salesmanFilter || undefined, unassigned: unassignedOnly || undefined } }),
  });
  const salesmen = (data?.salesmen ?? []) as any[];
  const customers = (data?.customers ?? []) as any[];
  const salesmanMap = useMemo(() => new Map(salesmen.map((s: any) => [s.id, s])), [salesmen]);

  const assign = useMutation({
    mutationFn: (v: { customer_id: string; salesman_id: string }) => adminAssignCustomer({ data: v }),
    onSuccess: () => { toast.success("Assigned"); qc.invalidateQueries({ queryKey: ["admin-assignments"] }); qc.invalidateQueries({ queryKey: ["admin-salesmen"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const unassign = useMutation({
    mutationFn: (customer_id: string) => adminUnassignCustomer({ data: { customer_id } }),
    onSuccess: () => { toast.success("Unassigned"); qc.invalidateQueries({ queryKey: ["admin-assignments"] }); qc.invalidateQueries({ queryKey: ["admin-salesmen"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const bulk = useMutation({
    mutationFn: () => adminBulkAssignCustomers({ data: { customer_ids: Array.from(selected), salesman_id: bulkSalesman } }),
    onSuccess: (r: any) => { toast.success(`Assigned ${r.count} customers`); setSelected(new Set()); qc.invalidateQueries({ queryKey: ["admin-assignments"] }); qc.invalidateQueries({ queryKey: ["admin-salesmen"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleSel = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selected.size === customers.length) setSelected(new Set());
    else setSelected(new Set(customers.map((c: any) => c.id)));
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customer Assignments</h1>
          <p className="text-sm text-muted-foreground">Assign customers to salesmen, transfer between them, or unassign.</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customer name, company…"
            className="w-full rounded border bg-surface-2 py-2 pl-9 pr-3 text-sm" />
        </div>
        <select value={salesmanFilter} onChange={(e) => setSalesmanFilter(e.target.value)} className="rounded border bg-surface-2 px-3 py-2 text-sm">
          <option value="">All salesmen</option>
          {salesmen.map((s: any) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        <label className="inline-flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={unassignedOnly} onChange={(e) => setUnassignedOnly(e.target.checked)} />
          Unassigned only
        </label>
      </div>

      {selected.size > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <select value={bulkSalesman} onChange={(e) => setBulkSalesman(e.target.value)} className="rounded border bg-surface-2 px-3 py-1.5 text-sm">
            <option value="">Assign to…</option>
            {salesmen.map((s: any) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
          <button disabled={!bulkSalesman || bulk.isPending} onClick={() => bulk.mutate()}
            className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">
            {bulk.isPending ? "Assigning…" : "Apply"}
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-muted-foreground hover:underline">Clear</button>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left w-8"><input type="checkbox" checked={selected.size === customers.length && customers.length > 0} onChange={toggleAll} /></th>
              <th className="px-3 py-2 text-left">Customer</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Assigned Salesman</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {customers.map((c: any) => (
              <tr key={c.id} className="hover:bg-surface-2/50">
                <td className="px-3 py-2"><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSel(c.id)} /></td>
                <td className="px-3 py-2">
                  <Link to="/admin/customers/$id" params={{ id: c.id }} className="font-medium text-primary hover:underline">{c.full_name || "—"}</Link>
                  {c.company_name && <div className="text-xs text-muted-foreground">{c.company_name}</div>}
                </td>
                <td className="px-3 py-2 text-xs">{c.customer_type}</td>
                <td className="px-3 py-2">
                  <select
                    value={c.salesman_id ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v) assign.mutate({ customer_id: c.id, salesman_id: v });
                      else unassign.mutate(c.id);
                    }}
                    className="rounded border bg-surface-2 px-2 py-1 text-xs">
                    <option value="">— Unassigned —</option>
                    {salesmen.map((s: any) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                  {c.salesman_id && (
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      Salesman: {salesmanMap.get(c.salesman_id)?.full_name ?? "?"}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {c.salesman_id ? (
                    <button onClick={() => unassign.mutate(c.id)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-surface-2">
                      <UserMinus className="h-3 w-3" /> Unassign
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><UserPlus className="h-3 w-3" /> Pick salesman</span>
                  )}
                </td>
              </tr>
            ))}
            {!customers.length && (
              <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-muted-foreground">No customers match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
