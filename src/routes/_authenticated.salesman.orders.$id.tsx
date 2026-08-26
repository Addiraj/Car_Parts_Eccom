import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { salesmanGetOrder } from "@/lib/admin.salesmen.functions";
import { formatAED } from "@/lib/format";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/salesman/orders/$id")({
  component: SalesmanOrderDetail,
  errorComponent: ({ error }) => (
    <div className="p-6 space-y-3">
      <Link to="/salesman/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
        <div className="text-sm font-bold text-destructive">Failed to load order</div>
        <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{String(error?.message ?? error ?? "Unknown error")}</div>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-6">
      <Link to="/salesman/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>
      <div className="mt-3 text-sm text-muted-foreground">Order not found.</div>
    </div>
  ),
});

const STATUS_COLORS: Record<string, string> = {
  placed: "bg-blue-100 text-blue-800", confirmed: "bg-indigo-100 text-indigo-800",
  packed: "bg-violet-100 text-violet-800", shipped: "bg-amber-100 text-amber-800",
  delivered: "bg-emerald-100 text-emerald-800", cancelled: "bg-zinc-200 text-zinc-700",
  refunded: "bg-destructive/15 text-destructive",
};

function SalesmanOrderDetail() {
  const { id } = Route.useParams();
  const get = useServerFn(salesmanGetOrder);

  const { data, isLoading, error } = useQuery({ queryKey: ["salesman-order", id], queryFn: () => get({ data: { id } }) });

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading order…</div>;
  if (error) return (
    <div className="p-6 space-y-3">
      <Link to="/salesman/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
        <div className="text-sm font-bold text-destructive">Failed to load order</div>
        <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{(error as any)?.message ?? String(error)}</div>
      </div>
    </div>
  );
  if (!data) return <div className="p-6 text-muted-foreground">Order not found</div>;

  const o: any = data.order;
  const addr: any = o.shipping_address || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link to="/salesman/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" /> Print</Button>
          <a href={`/api/public/orders/${o.id}/pdf`} target="_blank" rel="noreferrer" download>
            <Button variant="outline" size="sm"><Download className="mr-1 h-4 w-4" /> Download PDF</Button>
          </a>
        </div>
      </div>

      <div className="rounded-lg border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Order</div>
            <div className="text-2xl font-bold font-mono">{o.order_number}</div>
            <div className="mt-1 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`rounded px-3 py-1 text-xs font-bold uppercase ${STATUS_COLORS[o.status] ?? "bg-muted"}`}>{o.status}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-surface p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Customer</div>
          <div className="mt-2 space-y-0.5 text-sm">
            <div className="font-medium">{data.profile?.full_name || "—"}</div>
            <div className="text-muted-foreground">{data.email || "—"}</div>
            <div className="text-muted-foreground">{data.profile?.phone || ""}</div>
            <div className="mt-1"><span className="rounded bg-muted px-2 py-0.5 text-xs font-bold">{o.customer_type ?? "IND"}</span></div>
          </div>
        </div>
        <div className="rounded-lg border bg-surface p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Shipping</div>
          <div className="mt-2 space-y-0.5 text-sm">
            <div>{addr.name ?? "—"}</div>
            <div>{addr.line1 ?? ""}{addr.line2 ? `, ${addr.line2}` : ""}</div>
            <div>{[addr.city, addr.emirate, addr.country].filter(Boolean).join(", ")}</div>
            <div className="text-muted-foreground">{addr.phone ?? ""}</div>
          </div>
        </div>
        <div className="rounded-lg border bg-surface p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment</div>
          <div className="mt-2 space-y-0.5 text-sm">
            <div>Method: {o.payment_method === "wallet" ? <span className="rounded bg-indigo-500/15 px-2 py-0.5 text-xs font-semibold uppercase text-indigo-600">Wallet</span> : <span className="uppercase font-medium">{o.payment_method}</span>}</div>
            <div>Coupon: <span className="font-mono">{o.coupon_code ?? "—"}</span></div>
            <div>Paid at: {o.paid_at ? new Date(o.paid_at).toLocaleString() : "—"}</div>
            {o.refund_amount > 0 && <div className="text-destructive">Refunded: {formatAED(Number(o.refund_amount))}</div>}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-surface">
        <div className="border-b p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Items ({data.items.length})</div>
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr><th className="p-3">Part</th><th className="p-3 text-right">Unit</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Line total</th></tr>
          </thead>
          <tbody>
            {data.items.map((it: any) => (
              <tr key={it.id} className="border-b">
                <td className="p-3"><div className="font-mono text-xs">Ref OE No: {it.part_number}</div><div className="text-muted-foreground">{it.name}</div></td>
                <td className="p-3 text-right font-mono">{formatAED(Number(it.unit_price))}</td>
                <td className="p-3 text-right font-mono">{it.quantity}</td>
                <td className="p-3 text-right font-mono">{formatAED(Number(it.line_total))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="text-sm">
            <tr><td colSpan={3} className="p-3 text-right text-muted-foreground">Subtotal</td><td className="p-3 text-right font-mono">{formatAED(Number(o.subtotal ?? 0))}</td></tr>
            <tr><td colSpan={3} className="p-3 text-right text-muted-foreground">VAT</td><td className="p-3 text-right font-mono">{formatAED(Number(o.vat ?? 0))}</td></tr>
            <tr><td colSpan={3} className="p-3 text-right text-muted-foreground">Shipping</td><td className="p-3 text-right font-mono">{formatAED(Number(o.shipping_fee ?? 0))}</td></tr>
            {Number(o.discount ?? 0) > 0 && <tr><td colSpan={3} className="p-3 text-right text-muted-foreground">Discount</td><td className="p-3 text-right font-mono text-emerald-700">- {formatAED(Number(o.discount))}</td></tr>}
            <tr className="border-t font-bold"><td colSpan={3} className="p-3 text-right">Total</td><td className="p-3 text-right font-mono">{formatAED(Number(o.total))}</td></tr>
          </tfoot>
        </table>
      </div>

      <div className="rounded-lg border bg-surface p-4 print:hidden">
        <div className="mb-3 text-sm font-bold">Status Timeline</div>
        <ol className="space-y-2">
          {data.events.map((e: any) => (
            <li key={e.id} className="flex items-start gap-3 text-sm">
              <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
              <div className="flex-1">
                <div><span className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${STATUS_COLORS[e.status] ?? "bg-muted"}`}>{e.status}</span> <span className="text-xs text-muted-foreground">· {new Date(e.created_at).toLocaleString()}</span></div>
                {e.note && <div className="text-muted-foreground">{e.note}</div>}
              </div>
            </li>
          ))}
          {!data.events.length && <li className="text-sm text-muted-foreground">No events yet.</li>}
        </ol>
      </div>
    </div>
  );
}
