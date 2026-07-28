import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminDashboardMetrics } from "@/lib/admin.functions";
import { formatAED } from "@/lib/format";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — Super Admin" }] }),
  component: AdminOverview,
});

function Card({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <div className="rounded-lg border bg-surface p-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-1.5 text-2xl font-bold ${accent ?? ""}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function AdminOverview() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-dashboard"], queryFn: () => adminDashboardMetrics() });
  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;
  const k = data.kpis;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Live business metrics across the platform.</p>
      </div>

      {/* Revenue */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Revenue</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card label="Total Revenue" value={formatAED(k.totalRevenue)} />
          <Card label="This Month" value={formatAED(k.monthRevenue)} />
          <Card label="Today" value={formatAED(k.todayRevenue)} />
        </div>
      </section>

      {/* Orders */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Orders</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Card label="Total" value={k.totalOrders.toLocaleString()} />
          <Card label="Pending" value={k.pending.toLocaleString()} accent="text-amber-600" />
          <Card label="Processing" value={k.processing.toLocaleString()} accent="text-blue-600" />
          <Card label="Shipped / Done" value={(k.shipped + k.completed).toLocaleString()} accent="text-emerald-600" />
          <Card label="Cancelled" value={k.cancelled.toLocaleString()} accent="text-rose-600" />
        </div>
      </section>

      {/* Customers */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Customers</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card label="Total" value={k.totalCustomers.toLocaleString()} />
          <Card label="Individual" value={k.customersIND.toLocaleString()} />
          <Card label="Garage" value={k.customersGAR.toLocaleString()} />
          <Card label="Export" value={k.customersEXP.toLocaleString()} />
        </div>
      </section>

      {/* Inventory */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Inventory</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card label="Total Products" value={k.totalProducts.toLocaleString()} />
          <Card label="Low Stock (≤5)" value={k.lowStock.toLocaleString()} accent="text-amber-600" />
          <Card label="Out of Stock" value={k.outOfStock.toLocaleString()} accent="text-rose-600" />
        </div>
      </section>

      {/* Charts */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-surface p-4">
          <div className="mb-3 text-sm font-semibold">Daily sales — last 30 days</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dailySales} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} hide />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => formatAED(v)} />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-lg border bg-surface p-4">
          <div className="mb-3 text-sm font-semibold">Monthly sales — last 12 months</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlySales} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => formatAED(v)} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Recent activity */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold">Recent orders</div>
            <Link to="/admin/orders" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <ul className="divide-y text-sm">
            {data.recentOrders.length === 0 && <li className="py-3 text-muted-foreground">No orders yet.</li>}
            {data.recentOrders.map((o: any) => (
              <li key={o.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium">{o.order_number}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()} · {o.status}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatAED(Number(o.total))}</div>
                  <div className="text-xs text-muted-foreground">{o.customer_type ?? "—"}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold">New customers</div>
            <Link to="/admin/users" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <ul className="divide-y text-sm">
            {data.recentUsers.length === 0 && <li className="py-3 text-muted-foreground">No customers yet.</li>}
            {data.recentUsers.map((u: any) => (
              <li key={u.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium">{u.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</div>
                </div>
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold uppercase">{u.customer_type}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Top products */}
      <section className="rounded-lg border bg-surface p-4">
        <div className="mb-3 text-sm font-semibold">Top selling products — last 30 days</div>
        {data.topProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sales in the last 30 days.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="py-2">Product</th><th className="py-2 text-right">Units</th><th className="py-2 text-right">Revenue</th></tr>
            </thead>
            <tbody className="divide-y">
              {data.topProducts.map((p: any, i: number) => (
                <tr key={i}>
                  <td className="py-2">{p.name}</td>
                  <td className="py-2 text-right font-medium">{p.qty}</td>
                  <td className="py-2 text-right">{formatAED(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
