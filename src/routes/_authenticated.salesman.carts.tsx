import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { salesmanAssignedCarts } from "@/lib/admin.salesmen.functions";
import { formatAED } from "@/lib/format";
import { ChevronDown, ChevronRight, ShoppingCart, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/salesman/carts")({
  head: () => ({ meta: [{ title: "Salesman · Active Carts" }] }),
  component: CartsPage,
});

function CartsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["salesman-carts"],
    queryFn: () => salesmanAssignedCarts(),
    refetchInterval: 60_000,
  });
  const carts: any[] = (data as any) ?? [];
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Active Carts</h1>
        <span className="text-sm text-muted-foreground">{carts.length} customer{carts.length === 1 ? "" : "s"} with items</span>
      </div>

      {isLoading ? (
        <div className="rounded-lg border bg-surface p-6 text-sm text-muted-foreground">Loading…</div>
      ) : carts.length === 0 ? (
        <div className="rounded-lg border bg-surface p-10 text-center">
          <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">None of your assigned customers have items in their cart right now.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3"></th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Cart Value</th>
                <th className="px-4 py-3">Last Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {carts.map((c) => {
                const isOpen = !!open[c.customer_id];
                return (
                  <>
                    <tr key={c.customer_id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <button onClick={() => setOpen((s) => ({ ...s, [c.customer_id]: !isOpen }))} aria-label="Toggle items">
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{c.customer?.full_name || c.customer?.company_name || "Customer"}</div>
                        {c.customer?.company_name && c.customer?.full_name && (
                          <div className="text-xs text-muted-foreground">{c.customer.company_name}</div>
                        )}
                        {c.customer?.phone && <div className="text-xs text-muted-foreground">{c.customer.phone}</div>}
                      </td>
                      <td className="px-4 py-3">{c.item_count}</td>
                      <td className="px-4 py-3 font-medium">{formatAED(c.total_value)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(c.last_updated).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to="/salesman/customers"
                          className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-muted"
                        >
                          <ExternalLink className="h-3 w-3" /> Customer
                        </Link>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${c.customer_id}-items`} className="bg-muted/20">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="space-y-2">
                            {c.items.map((it: any) => (
                              <div key={it.id} className="flex items-center gap-3 rounded border bg-background p-2">
                                {it.image_url ? (
                                  <img src={it.image_url} alt="" className="h-10 w-10 rounded object-cover" />
                                ) : (
                                  <div className="h-10 w-10 rounded bg-muted" />
                                )}
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{it.part_name}</div>
                                  <div className="text-xs text-muted-foreground">{it.part_number}</div>
                                </div>
                                <div className="text-xs text-muted-foreground">Qty: {it.quantity}</div>
                                <div className="w-24 text-right text-xs">{formatAED(it.price)}</div>
                                <div className="w-28 text-right text-sm font-medium">{formatAED(it.line_total)}</div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
