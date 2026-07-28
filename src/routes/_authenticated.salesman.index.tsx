import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { salesmanDashboard, salesmanAssignedCarts } from "@/lib/admin.salesmen.functions";
import { formatAED } from "@/lib/format";
import { ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/salesman/")({
  head: () => ({ meta: [{ title: "Salesman · Dashboard" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery({ queryKey: ["salesman-dashboard"], queryFn: () => salesmanDashboard() });
  const { data: cartsData } = useQuery({
    queryKey: ["salesman-carts"],
    queryFn: () => salesmanAssignedCarts(),
    refetchInterval: 60_000,
  });
  const d: any = data ?? {};
  const carts: any[] = (cartsData as any) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Dashboard</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <KPI label="My Customers" value={String(d.customers ?? 0)} />
        <KPI label="Active Carts" value={String(d.activeCarts ?? 0)} highlight />
        <KPI label="Quotations" value={String(d.quotations ?? 0)} />
        <KPI label="Approved" value={String(d.approvedQuotations ?? 0)} />
        <KPI label="Orders" value={String(d.orders ?? 0)} />
        <KPI label="Revenue" value={formatAED(d.revenue ?? 0)} />
      </div>

      <div className="rounded-lg border bg-surface">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">Customers with items in cart</h2>
          </div>
          <Link to="/salesman/carts" className="text-xs text-primary hover:underline">View all →</Link>
        </div>
        {carts.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No active carts right now.</div>
        ) : (
          <ul className="divide-y">
            {carts.slice(0, 5).map((c) => (
              <li key={c.customer_id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link
                    to="/salesman/customers/$id"
                    params={{ id: c.customer_id }}
                    className="text-sm font-medium hover:underline"
                  >
                    {c.customer?.full_name || c.customer?.company_name || "Customer"}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {c.item_count} item{c.item_count === 1 ? "" : "s"} · Last update {new Date(c.last_updated).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{formatAED(c.total_value)}</div>
                  <Link to="/salesman/carts" className="text-xs text-primary hover:underline">Follow up</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: open a customer from <Link to="/salesman/customers" className="text-primary hover:underline">My Customers</Link> to see their live activity, notes, follow-ups and AI conversations.
      </p>
    </div>
  );
}

function KPI({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border bg-surface p-4 ${highlight ? "border-primary/40 bg-primary/5" : ""}`}>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
