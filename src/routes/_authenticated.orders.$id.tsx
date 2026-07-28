import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrder, cancelOrder } from "@/lib/orders.functions";
import { formatAED } from "@/lib/format";
import { CheckCircle2, Circle, MapPin, Package } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  head: () => ({ meta: [{ title: "Order — Car Parts Dubai" }] }),
  component: OrderDetail,
});

const steps = ["placed", "confirmed", "packed", "shipped", "delivered"] as const;

function OrderDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["order", id], queryFn: () => getOrder({ data: { id } }) });
  const cancel = useMutation({
    mutationFn: () => cancelOrder({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["order", id] }); toast.success("Order cancelled"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-10 text-center text-sm">Loading…</div>;
  if (!data) return <div className="p-10 text-center text-sm">Order not found.</div>;
  const { order, items, events } = data;
  const isCancelled = order.status === "cancelled";
  const currentIdx = steps.indexOf(order.status as any);
  const addr = order.shipping_address as any;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/orders" className="text-xs text-muted-foreground hover:text-primary">← All orders</Link>
          <h1 className="mt-1 font-mono text-2xl font-bold">{order.order_number}</h1>
          <div className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</div>
        </div>
        {!isCancelled && (order.status === "placed" || order.status === "confirmed") && (
          <button onClick={() => cancel.mutate()} className="rounded-md border border-destructive px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/5">
            Cancel order
          </button>
        )}
      </div>

      {/* Tracker */}
      <div className="mt-6 rounded-lg border bg-surface p-5">
        {isCancelled ? (
          <div className="rounded bg-destructive/10 p-3 text-sm font-semibold text-destructive">This order was cancelled.</div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            {steps.map((s, i) => (
              <div key={s} className="flex flex-1 items-center gap-2">
                <div className="flex flex-col items-center">
                  {i <= currentIdx ? <CheckCircle2 className="h-6 w-6 text-primary" /> : <Circle className="h-6 w-6 text-muted-foreground" />}
                  <div className={`mt-1 text-[10px] font-semibold uppercase ${i <= currentIdx ? "text-primary" : "text-muted-foreground"}`}>{s}</div>
                </div>
                {i < steps.length - 1 && <div className={`h-0.5 flex-1 ${i < currentIdx ? "bg-primary" : "bg-border"}`} />}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Items */}
        <section className="rounded-lg border bg-surface">
          <div className="border-b p-4 text-sm font-semibold">Items</div>
          <ul className="divide-y">
            {items.map((it: any) => (
              <li key={it.id} className="flex gap-3 p-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-surface-2">
                  {it.image_url && <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1">
                  <div className="font-mono text-[10px] text-muted-foreground">{it.part_number}</div>
                  <div className="text-sm font-medium">{it.name}</div>
                  <div className="text-xs text-muted-foreground">Qty {it.quantity} · {formatAED(Number(it.unit_price))} each</div>
                </div>
                <div className="font-mono font-semibold">{formatAED(Number(it.line_total))}</div>
              </li>
            ))}
          </ul>
        </section>

        {/* Summary + address + events */}
        <div className="space-y-4">
          <section className="rounded-lg border bg-surface p-5">
            <div className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4" /> Shipping to</div>
            <div className="mt-2 text-sm">
              <div className="font-semibold">{addr?.full_name}</div>
              <div className="text-xs text-muted-foreground">{addr?.phone}</div>
              <div className="mt-1 text-xs">{addr?.street}{addr?.building ? `, ${addr.building}` : ""}<br />{addr?.area}, {addr?.emirate}</div>
            </div>
          </section>

          <section className="rounded-lg border bg-surface p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Summary</div>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-mono">{formatAED(Number(order.subtotal))}</dd></div>
              {Number(order.discount) > 0 && <div className="flex justify-between text-success"><dt>Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</dt><dd className="font-mono">−{formatAED(Number(order.discount))}</dd></div>}
              <div className="flex justify-between"><dt>Shipping</dt><dd className="font-mono">{Number(order.shipping_fee) === 0 ? "Free" : formatAED(Number(order.shipping_fee))}</dd></div>
              <div className="flex justify-between"><dt>VAT</dt><dd className="font-mono">{formatAED(Number(order.vat))}</dd></div>
            </dl>
            <div className="mt-3 flex justify-between border-t pt-3 text-base font-bold">
              <span>Total</span><span className="font-mono text-primary">{formatAED(Number(order.total))}</span>
            </div>
            <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">Payment: {order.payment_method === "cod" ? "Cash on delivery" : order.payment_method === "wallet" ? "Credit Wallet" : order.payment_method === "stripe" ? "Card (Stripe)" : String(order.payment_method).toUpperCase()}</div>
          </section>

          <section className="rounded-lg border bg-surface p-5">
            <div className="flex items-center gap-2 text-sm font-semibold"><Package className="h-4 w-4" /> Activity</div>
            <ol className="mt-3 space-y-2 text-xs">
              {events.map((e: any) => (
                <li key={e.id} className="flex gap-2">
                  <div className="font-semibold uppercase">{e.status}</div>
                  <div className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
                  {e.note && <div className="ms-auto text-muted-foreground">{e.note}</div>}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
