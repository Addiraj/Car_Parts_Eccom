import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { salesmanMyOrders } from "@/lib/admin.salesmen.functions";
import { formatAED } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/salesman/orders")({
  head: () => ({ meta: [{ title: "My Orders" }] }),
  component: MyOrders,
});

function MyOrders() {
  const { data = [] } = useQuery({ queryKey: ["salesman-orders"], queryFn: () => salesmanMyOrders() });
  const rows = data as any[];
  return (
    <div>
      <h1 className="text-2xl font-bold">My Orders</h1>
      <div className="mt-4 overflow-x-auto rounded-lg border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
            <tr><th className="px-3 py-2 text-left">#</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Payment</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-left">Created</th></tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((o) => (
              <tr key={o.id}>
                <td className="px-3 py-2 font-mono text-xs"><Link to="/salesman/orders/$id" params={{ id: o.id }} className="text-primary hover:underline">{o.order_number}</Link></td>
                <td className="px-3 py-2 text-xs capitalize">{o.status}</td>
                <td className="px-3 py-2 text-xs">{o.payment_status ?? "—"}</td>
                <td className="px-3 py-2 text-right font-mono">{formatAED(Number(o.total ?? 0))}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-muted-foreground">No orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
