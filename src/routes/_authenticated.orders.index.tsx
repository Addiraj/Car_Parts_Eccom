import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getMyOrders } from "@/lib/orders.functions";
import { formatAED } from "@/lib/format";
import { Package } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/orders/")({
  head: () => ({ meta: [{ title: "My Orders — Car Parts Dubai" }] }),
  component: OrdersPage,
});

const statusColor: Record<string, string> = {
  placed: "bg-blue-500/10 text-blue-600", confirmed: "bg-cyan-500/10 text-cyan-600",
  packed: "bg-purple-500/10 text-purple-600", shipped: "bg-amber-500/10 text-amber-600",
  delivered: "bg-success/10 text-success", cancelled: "bg-destructive/10 text-destructive",
};

function OrdersPage() {
  const { t } = useI18n();
  const { data: orders = [], isLoading } = useQuery({ queryKey: ["orders"], queryFn: () => getMyOrders() });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{t("myOrders")}</h1>
      {isLoading && <p className="mt-6 text-sm text-muted-foreground">{t("loading")}</p>}
      {!isLoading && orders.length === 0 && (
        <div className="mt-8 grid place-items-center rounded-lg border border-dashed bg-surface-2 p-12 text-center">
          <Package className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">{t("noOrders")}</p>
          <Link to="/catalog" className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{t("startShopping")}</Link>
        </div>
      )}
      {orders.length > 0 && (
        <ul className="mt-6 divide-y rounded-lg border bg-surface">
          {orders.map((o: any) => (
            <li key={o.id}>
              <Link to="/orders/$id" params={{ id: o.id }} className="flex items-center justify-between gap-4 p-4 hover:bg-muted/30">
                <div>
                  <div className="font-mono text-sm font-semibold">{o.order_number}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusColor[o.status] ?? "bg-muted"}`}>{o.status}</span>
                <div className="text-right">
                  <div className="font-bold text-primary">{formatAED(Number(o.total))}</div>
                  <div className={`text-[10px] uppercase font-semibold ${o.payment_method === "wallet" ? "text-indigo-600 dark:text-indigo-300" : "text-muted-foreground"}`}>{o.payment_method === "wallet" ? "Wallet" : o.payment_method}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
