import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminListUsers, adminUpdateUserCustomerType, adminToggleVinCatalog } from "@/lib/admin.functions";
import { adminApproveCustomer, adminCustomerStats } from "@/lib/admin.customers.functions";
import { CustomerTypeBadge } from "@/components/customer-type-badge";
import { formatAED } from "@/lib/format";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Search, Download, CheckCircle2, Clock, Ban, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Admin · Customers" }] }),
  component: AdminUsers,
});

type CT = "ALL" | "IND" | "GAR" | "EXP";
type ST = "ALL" | "pending" | "active" | "suspended";

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; Icon: any }> = {
    pending: { cls: "bg-amber-500/10 text-amber-600 border-amber-500/30", Icon: Clock },
    active: { cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", Icon: CheckCircle2 },
    suspended: { cls: "bg-red-500/10 text-red-600 border-red-500/30", Icon: Ban },
  };
  const s = map[status] ?? map.active;
  const I = s.Icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.cls}`}>
      <I className="h-3 w-3" /> {status}
    </span>
  );
}

function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CT>("ALL");
  const [status, setStatus] = useState<ST>("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data, isFetching } = useQuery({
    queryKey: ["admin-users", search, filter, status, page],
    queryFn: () => adminListUsers({ data: { search, customerType: filter, status, page, pageSize } }),
  });
  const items = (data as any)?.items ?? [];
  const total = (data as any)?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const { data: stats } = useQuery({ queryKey: ["admin-customer-stats"], queryFn: () => adminCustomerStats() });

  const updateType = useMutation({
    mutationFn: (v: { userId: string; customerType: "IND" | "GAR" | "EXP" }) =>
      adminUpdateUserCustomerType({ data: v }),
    onSuccess: () => {
      toast.success("Customer type updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-customer-stats"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleVinCatalog = useMutation({
    mutationFn: (v: { userId: string; enabled: boolean }) => adminToggleVinCatalog({ data: v }),
    onSuccess: () => {
      toast.success("Catalog access updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const approve = useMutation({
    mutationFn: (id: string) => adminApproveCustomer({ data: { id } }),
    onSuccess: () => {
      toast.success("Customer approved");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-customer-stats"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const exportCsv = () => {
    const headers = ["full_name", "email", "phone", "company_name", "customer_type", "status", "total_orders", "total_spend", "created_at"];
    const esc = (v: any) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(","), ...items.map((u: any) => headers.map((h) => esc(u[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "customers.csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-surface-2">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Total customers" value={String(stats?.total ?? 0)} />
        <KPI label="Pending approval" value={String(stats?.byStatus?.pending ?? 0)} accent="amber" onClick={() => { setStatus("pending"); setPage(1); }} />
        <KPI label="Active" value={String(stats?.byStatus?.active ?? 0)} accent="emerald" />
        <KPI label="Suspended" value={String(stats?.byStatus?.suspended ?? 0)} accent="red" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            placeholder="Search name, email, phone, company…"
            className="w-full rounded border bg-surface-2 py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <div className="flex rounded-lg border bg-surface p-1 text-sm">
          {(["ALL", "IND", "GAR", "EXP"] as CT[]).map((t) => (
            <button key={t} onClick={() => { setPage(1); setFilter(t); }}
              className={`rounded-md px-3 py-1.5 ${filter === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {t === "ALL" ? "All" : t}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border bg-surface p-1 text-sm">
          {(["ALL", "pending", "active", "suspended"] as ST[]).map((t) => (
            <button key={t} onClick={() => { setPage(1); setStatus(t); }}
              className={`rounded-md px-3 py-1.5 capitalize ${status === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {t === "ALL" ? "All status" : t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Customer</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Orders</th>
              <th className="px-3 py-2 text-left">Spend</th>
              <th className="px-3 py-2 text-left">Joined</th>
              <th className="px-3 py-2 text-left">Catalog Access</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((u: any) => (
              <tr key={u.id} className="hover:bg-surface-2/50">
                <td className="px-3 py-2">
                  <Link to="/admin/customers/$id" params={{ id: u.id }} className="font-medium text-primary hover:underline">
                    {u.full_name || "—"}
                  </Link>
                  {u.company_name && <div className="text-xs text-muted-foreground">{u.company_name}</div>}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{u.email ?? "—"}</td>
                <td className="px-3 py-2"><CustomerTypeBadge type={u.customer_type} showLabel={false} /></td>
                <td className="px-3 py-2"><StatusPill status={u.status} /></td>
                <td className="px-3 py-2">{u.total_orders}</td>
                <td className="px-3 py-2 font-mono">{formatAED(Number(u.total_spend))}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-2">
                  <select
                    value={u.vin_catalog_enabled ? "true" : "false"}
                    disabled={toggleVinCatalog.isPending}
                    onChange={(e) => toggleVinCatalog.mutate({ userId: u.id, enabled: e.target.value === "true" })}
                    className="rounded border bg-surface-2 px-2 py-1 text-xs"
                  >
                    <option value="false">Disabled</option>
                    <option value="true">Enabled</option>
                  </select>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {u.status === "pending" && (
                      <button onClick={() => approve.mutate(u.id)} disabled={approve.isPending}
                        className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                        <CheckCircle2 className="h-3 w-3" /> Approve
                      </button>
                    )}
                    <select
                      value={u.customer_type}
                      disabled={updateType.isPending}
                      onChange={(e) => updateType.mutate({ userId: u.id, customerType: e.target.value as any })}
                      className="rounded border bg-surface-2 px-2 py-1 text-xs"
                    >
                      <option value="IND">IND</option>
                      <option value="GAR">GAR</option>
                      <option value="EXP">EXP</option>
                    </select>
                    <Link to="/admin/customers/$id" params={{ id: u.id }} className="rounded border p-1 hover:bg-surface-2">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && !isFetching && (
              <tr><td colSpan={9} className="px-3 py-10 text-center text-sm text-muted-foreground">No customers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col items-center gap-2 text-xs text-muted-foreground">
        <span>{total.toLocaleString()} customers · page {page} / {pages}</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border px-2 py-1 disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded border px-2 py-1 disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, accent, onClick }: { label: string; value: string; accent?: "amber" | "emerald" | "red"; onClick?: () => void }) {
  const cls = accent === "amber" ? "text-amber-600" : accent === "emerald" ? "text-emerald-600" : accent === "red" ? "text-red-600" : "";
  return (
    <button onClick={onClick} disabled={!onClick} className="rounded-lg border bg-surface p-4 text-left transition hover:bg-surface-2 disabled:hover:bg-surface">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${cls}`}>{value}</div>
    </button>
  );
}
