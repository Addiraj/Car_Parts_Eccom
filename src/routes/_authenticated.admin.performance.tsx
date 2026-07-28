import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminSalesmanLeaderboard } from "@/lib/admin.salesmen.functions";
import { formatAED } from "@/lib/format";
import { Trophy, Award, Target, Zap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/performance")({
  head: () => ({ meta: [{ title: "Admin · Salesman Performance" }] }),
  component: PerfPage,
});

function PerfPage() {
  const { data: rows = [] } = useQuery({ queryKey: ["admin-salesman-perf"], queryFn: () => adminSalesmanLeaderboard() });
  const r = rows as any[];
  const topRevenue = [...r].sort((a, b) => b.revenue - a.revenue)[0];
  const topActive = [...r].sort((a, b) => b.totalOrders - a.totalOrders)[0];
  const topConv = [...r].sort((a, b) => b.conversionRate - a.conversionRate)[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Salesman Performance</h1>
        <p className="text-sm text-muted-foreground">Leaderboard and key metrics for every salesman.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Top icon={Trophy} label="Top Revenue" name={topRevenue?.full_name} value={topRevenue ? formatAED(topRevenue.revenue) : "—"} accent="text-amber-500" />
        <Top icon={Zap} label="Most Active" name={topActive?.full_name} value={topActive ? `${topActive.totalOrders} orders` : "—"} accent="text-blue-500" />
        <Top icon={Target} label="Best Conversion" name={topConv?.full_name} value={topConv ? `${topConv.conversionRate}%` : "—"} accent="text-emerald-500" />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Salesman</th>
              <th className="px-3 py-2 text-right">Customers</th>
              <th className="px-3 py-2 text-right">Quotations</th>
              <th className="px-3 py-2 text-right">Approved</th>
              <th className="px-3 py-2 text-right">Orders</th>
              <th className="px-3 py-2 text-right">Revenue</th>
              <th className="px-3 py-2 text-right">Conv %</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {r.map((s, i) => (
              <tr key={s.id} className="hover:bg-surface-2/50">
                <td className="px-3 py-2 font-mono">{i + 1}</td>
                <td className="px-3 py-2">
                  <Link to="/admin/salesmen/$id" params={{ id: s.id }} className="font-medium text-primary hover:underline">{s.full_name}</Link>
                  <div className="text-xs text-muted-foreground">{s.email}</div>
                </td>
                <td className="px-3 py-2 text-right">{s.assignedCustomers}</td>
                <td className="px-3 py-2 text-right">{s.totalQuotes}</td>
                <td className="px-3 py-2 text-right">{s.approvedQuotes}</td>
                <td className="px-3 py-2 text-right">{s.totalOrders}</td>
                <td className="px-3 py-2 text-right font-mono">{formatAED(s.revenue)}</td>
                <td className="px-3 py-2 text-right">{s.conversionRate}%</td>
              </tr>
            ))}
            {!r.length && <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">No salesmen yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Top({ icon: Icon, label, name, value, accent }: any) {
  return (
    <div className="rounded-lg border bg-surface p-5">
      <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground"><Icon className={`h-4 w-4 ${accent}`} /> {label}</div>
      <div className="mt-2 text-lg font-bold">{name ?? "—"}</div>
      <div className={`text-sm ${accent}`}>{value}</div>
      <Award className="mt-1 hidden h-4 w-4" />
    </div>
  );
}
