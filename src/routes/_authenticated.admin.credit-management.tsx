import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { adminCreditDashboard } from "@/lib/credit.functions";
import { formatAED } from "@/lib/format";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Wallet, AlertTriangle, TrendingUp, DollarSign, Download } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/credit-management")({
  head: () => ({ meta: [{ title: "Credit Management — Admin" }] }),
  component: CreditMgmt,
});

function CreditMgmt() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-credit-dashboard"], queryFn: () => adminCreditDashboard() });
  const [type, setType] = useState<"all" | "IND" | "GAR" | "EXP">("all");
  const [status, setStatus] = useState<"all" | "active" | "frozen">("all");
  const [overdue, setOverdue] = useState<"all" | "overdue" | "clear">("all");

  const accounts = useMemo(() => {
    let list = data?.accounts ?? [];
    if (type !== "all") list = list.filter((a: any) => a.customer_type === type);
    if (status === "active") list = list.filter((a: any) => a.is_active);
    if (status === "frozen") list = list.filter((a: any) => !a.is_active);
    if (overdue === "overdue") list = list.filter((a: any) => a.overdue);
    if (overdue === "clear") list = list.filter((a: any) => !a.overdue);
    return [...list].sort((a: any, b: any) => b.outstanding - a.outstanding);
  }, [data, type, status, overdue]);

  const agingBars = data ? [
    { name: "Current", value: data.aging.current, color: "#10b981" },
    { name: "1-30d", value: data.aging.d1_30, color: "#f59e0b" },
    { name: "31-60d", value: data.aging.d31_60, color: "#f97316" },
    { name: "61-90d", value: data.aging.d61_90, color: "#ef4444" },
    { name: "90+d", value: data.aging.d90p, color: "#7f1d1d" },
  ] : [];
  const agingTotal = agingBars.reduce((s, b) => s + b.value, 0);

  const exportCsv = () => {
    const rows = [["Customer", "Type", "Credit Limit", "Available", "Outstanding", "Utilization%", "Last Payment", "Status", "Overdue"]];
    accounts.forEach((a: any) => rows.push([
      a.name, a.customer_type, String(a.credit_limit), String(a.available_balance),
      String(a.outstanding), String(Math.round(a.utilization * 100)),
      a.last_payment ?? "", a.is_active ? "Active" : "Frozen", a.overdue ? "Yes" : "No",
    ]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `credit-accounts-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!data) return null;

  const rate = data.kpi.collectionRate;
  const rateColor = rate > 0.8 ? "text-green-600" : rate > 0.5 ? "text-amber-600" : "text-red-600";

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-3">
        <Wallet className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Credit Management</h1>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={DollarSign} color="text-blue-600" label="Total Credit Exposure" value={formatAED(data.kpi.totalExposure)} />
        <Kpi icon={TrendingUp} color="text-amber-600" label="Total Outstanding" value={formatAED(data.kpi.totalOutstanding)} />
        <Kpi icon={AlertTriangle} color={data.kpi.overdueCount > 0 ? "text-red-600 animate-pulse" : "text-muted-foreground"}
          label="Overdue Accounts" value={String(data.kpi.overdueCount)} />
        <Kpi icon={TrendingUp} color={rateColor} label="Collection Rate (MTD)" value={`${Math.round(rate * 100)}%`} />
      </div>

      {/* Accounts */}
      <section className="rounded-lg border bg-surface">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <h2 className="text-sm font-semibold">Credit Accounts ({accounts.length})</h2>
          <div className="ms-auto flex flex-wrap gap-2">
            <select value={type} onChange={(e) => setType(e.target.value as any)} className="rounded border bg-surface-2 px-2 py-1 text-xs">
              <option value="all">All types</option><option value="IND">IND</option><option value="GAR">GAR</option><option value="EXP">EXP</option>
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="rounded border bg-surface-2 px-2 py-1 text-xs">
              <option value="all">All statuses</option><option value="active">Active</option><option value="frozen">Frozen</option>
            </select>
            <select value={overdue} onChange={(e) => setOverdue(e.target.value as any)} className="rounded border bg-surface-2 px-2 py-1 text-xs">
              <option value="all">All</option><option value="overdue">Overdue only</option><option value="clear">Clear only</option>
            </select>
            <button onClick={exportCsv} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-muted">
              <Download className="h-3 w-3" /> CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-right">Credit Limit</th>
                <th className="p-3 text-right">Available</th>
                <th className="p-3 text-right">Outstanding</th>
                <th className="p-3 text-left">Utilization</th>
                <th className="p-3 text-left">Last Payment</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Overdue</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a: any) => {
                const utilPct = Math.round(a.utilization * 100);
                const utilColor = utilPct > 80 ? "bg-red-500" : utilPct > 50 ? "bg-amber-500" : "bg-green-500";
                const daysSincePay = a.last_payment ? Math.floor((Date.now() - new Date(a.last_payment).getTime()) / 86400000) : null;
                return (
                  <tr key={a.wallet_id} className="border-t">
                    <td className="p-3">
                      <Link to="/admin/customers/$id" params={{ id: a.user_id }} className="font-medium text-primary hover:underline">{a.name}</Link>
                    </td>
                    <td className="p-3"><span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold">{a.customer_type}</span></td>
                    <td className="p-3 text-right font-mono">{formatAED(a.credit_limit)}</td>
                    <td className="p-3 text-right font-mono text-green-700 dark:text-green-300">{formatAED(a.available_balance)}</td>
                    <td className="p-3 text-right font-mono font-bold text-red-700 dark:text-red-300">{formatAED(a.outstanding)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-muted"><div className={`h-full ${utilColor}`} style={{ width: `${utilPct}%` }} /></div>
                        <span className="text-xs">{utilPct}%</span>
                      </div>
                    </td>
                    <td className={`p-3 text-xs ${daysSincePay !== null && daysSincePay > 45 ? "text-red-600 font-semibold" : ""}`}>
                      {a.last_payment ?? "—"}
                    </td>
                    <td className="p-3">
                      {a.is_active
                        ? <span className="rounded bg-green-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700 dark:text-green-300">Active</span>
                        : <span className="rounded bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700 dark:text-red-300 animate-pulse">Frozen</span>}
                    </td>
                    <td className="p-3">{a.overdue
                      ? <span className="rounded bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700 dark:text-red-300">Yes</span>
                      : <span className="rounded bg-green-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700 dark:text-green-300">No</span>}
                    </td>
                  </tr>
                );
              })}
              {!accounts.length && <tr><td colSpan={9} className="p-10 text-center text-xs text-muted-foreground">No accounts match filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Aging */}
      <section className="rounded-lg border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold">Aging Report</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={agingBars}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatAED(v)} />
                <Bar dataKey="value">
                  {agingBars.map((b, i) => <Cell key={i} fill={b.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="text-sm">
            <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2 text-left">Bucket</th><th className="p-2 text-right">Amount</th><th className="p-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {agingBars.map((b) => (
                <tr key={b.name} className="border-t">
                  <td className="p-2"><span className="inline-block h-3 w-3 rounded-sm me-2" style={{ backgroundColor: b.color }} />{b.name}</td>
                  <td className="p-2 text-right font-mono">{formatAED(b.value)}</td>
                  <td className="p-2 text-right">{agingTotal > 0 ? Math.round((b.value / agingTotal) * 100) : 0}%</td>
                </tr>
              ))}
              <tr className="border-t bg-surface-2 font-bold"><td className="p-2">Total</td><td className="p-2 text-right font-mono">{formatAED(agingTotal)}</td><td className="p-2 text-right">100%</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon: Icon, color, label, value }: { icon: any; color: string; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className={`mt-2 text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
