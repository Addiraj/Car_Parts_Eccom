import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { adminListOrdersPaged, adminOrderStats } from "@/lib/admin.orders.functions";
import { formatAED } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Eye, Download } from "lucide-react";
import Papa from "papaparse";

export const Route = createFileRoute("/_authenticated/admin/orders/")({
  head: () => ({ meta: [{ title: "Admin · Orders" }] }),
  component: AdminOrders,
});

const STATUSES = ["ALL","placed","confirmed","packed","shipped","delivered","cancelled","refunded"] as const;
const CT = ["ALL","IND","GAR","EXP"] as const;

const STATUS_COLORS: Record<string, string> = {
  placed: "bg-blue-100 text-blue-800",
  confirmed: "bg-indigo-100 text-indigo-800",
  packed: "bg-violet-100 text-violet-800",
  shipped: "bg-amber-100 text-amber-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-zinc-200 text-zinc-700",
  refunded: "bg-destructive/15 text-destructive",
};

function AdminOrders() {
  const list = useServerFn(adminListOrdersPaged);
  const stats = useServerFn(adminOrderStats);

  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("ALL");
  const [ct, setCt] = useState<(typeof CT)[number]>("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filters = { page, pageSize: 25, q: q || undefined, status, customer_type: ct, from: from || undefined, to: to || undefined };
  const orders = useQuery({ queryKey: ["admin-orders-paged", filters], queryFn: () => list({ data: filters as any }) });
  const st = useQuery({ queryKey: ["admin-orders-stats"], queryFn: () => stats() });

  const data = orders.data ?? { items: [], total: 0, pageSize: 25 };
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const s = st.data ?? { total: 0, revenue: 0, today: 0, todayRevenue: 0, revenue30: 0, byStatus: {} };

  const cards = [
    { label: "Total Orders", value: s.total.toLocaleString() },
    { label: "Pending", value: ((s.byStatus.placed ?? 0) + (s.byStatus.confirmed ?? 0)).toLocaleString() },
    { label: "Today", value: `${s.today.toLocaleString()} · ${formatAED(s.todayRevenue)}` },
    { label: "30-Day Revenue", value: formatAED(s.revenue30) },
    { label: "Total Revenue", value: formatAED(s.revenue) },
  ];

  const exportCsv = async () => {
    const big = await list({ data: { ...filters, page: 1, pageSize: 200 } as any });
    const csv = Papa.unparse(big.items.map((o: any) => ({
      order_number: o.order_number, status: o.status, total: o.total, currency: o.currency,
      payment_method: o.payment_method, customer_type: o.customer_type,
      created_at: o.created_at, courier: o.courier ?? "", tracking_number: o.tracking_number ?? "",
    })));
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `orders-${Date.now()}.csv`; a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><ShoppingBag className="h-6 w-6" /> Orders</h1>
        <Button variant="outline" onClick={exportCsv}><Download className="mr-1 h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {cards.map(c => (
          <div key={c.label} className="rounded-lg border bg-surface p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{c.label}</div>
            <div className="mt-1 text-lg font-bold">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-surface p-3">
        <div className="grow min-w-[160px]"><Label>Search</Label><Input value={q} onChange={e => { setPage(1); setQ(e.target.value); }} placeholder="Order # / Tracking" /></div>
        <div className="w-36"><Label>Status</Label>
          <Select value={status} onValueChange={(v: any) => { setPage(1); setStatus(v); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="w-32"><Label>Customer</Label>
          <Select value={ct} onValueChange={(v: any) => { setPage(1); setCt(v); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CT.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>From</Label><Input type="date" value={from} onChange={e => { setPage(1); setFrom(e.target.value); }} /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={e => { setPage(1); setTo(e.target.value); }} /></div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="p-3">Order</th><th className="p-3">Date</th><th className="p-3">Customer</th>
              <th className="p-3">Status</th><th className="p-3">Payment</th>
              <th className="p-3 text-right">Total</th><th className="p-3">Tracking</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {orders.isLoading && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {data.items.map((o: any) => (
              <tr key={o.id} className="border-b">
                <td className="p-3 font-mono text-xs">{o.order_number}</td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
                <td className="p-3"><span className="rounded bg-muted px-2 py-0.5 text-xs font-bold">{o.customer_type ?? "—"}</span></td>
                <td className="p-3"><span className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${STATUS_COLORS[o.status] ?? "bg-muted"}`}>{o.status}</span></td>
                <td className="p-3 text-xs uppercase">{o.payment_method === "wallet" ? <span className="rounded bg-indigo-500/15 px-2 py-0.5 font-semibold text-indigo-600 dark:text-indigo-300">Wallet</span> : o.payment_method}</td>
                <td className="p-3 text-right font-mono">{formatAED(Number(o.total))}</td>
                <td className="p-3 text-xs">{o.tracking_number ? <span className="font-mono">{o.courier ? `${o.courier} · ` : ""}{o.tracking_number}</span> : <span className="text-muted-foreground">—</span>}</td>
                <td className="p-3 text-right">
                  <Link to="/admin/orders/$id" params={{ id: o.id }} className="inline-flex items-center gap-1 rounded p-1 text-muted-foreground hover:text-foreground">
                    <Eye className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
            {!orders.isLoading && !data.items.length && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No orders match.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center gap-2 text-sm">
        <div className="text-muted-foreground">{data.total.toLocaleString()} orders · page {page} / {pages}</div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
