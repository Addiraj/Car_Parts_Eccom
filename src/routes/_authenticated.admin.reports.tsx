import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  reportSalesLedger,
  reportQuotations,
  reportFulfillment,
  reportCredit,
  reportCartAbandonment,
} from "@/lib/admin.report-ledger.functions";
import { DateRangePicker, computeRange, RangePreset } from "@/components/admin/reports/date-range-picker";
import { KpiCards } from "@/components/admin/reports/kpi-cards";
import { ReportTable, Column } from "@/components/admin/reports/report-table";
import { formatAED } from "@/lib/format";
import { downloadCsv } from "@/lib/export-utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({ meta: [{ title: "Admin · Reports" }] }),
  component: ReportsPage,
});

const PAGE_SIZE = 25;

function fmtDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return "—";
  try { return format(new Date(iso), withTime ? "dd MMM yyyy, HH:mm" : "dd MMM yyyy"); } catch { return "—"; }
}
function aed(n: number | null | undefined) {
  if (!n && n !== 0) return "—";
  return formatAED(Number(n));
}
function pmBadge(m: string) {
  const map: Record<string, string> = {
    stripe: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    cod: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    wallet: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
    quote: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  };
  return <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium capitalize", map[m] ?? "bg-muted")}>{m}</span>;
}
function statusBadge(s: string) {
  const map: Record<string, string> = {
    placed: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    confirmed: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    packed: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
    shipped: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
    delivered: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    cancelled: "bg-red-500/15 text-red-700 dark:text-red-300",
    refunded: "bg-red-500/15 text-red-700 dark:text-red-300",
    draft: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
    sent: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    converted: "bg-green-700/20 text-green-800 dark:text-green-300 font-semibold",
    rejected: "bg-red-500/15 text-red-700 dark:text-red-300",
    expired: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    unpaid: "bg-red-500/15 text-red-700 dark:text-red-300",
    partially_paid: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    overdue: "bg-red-700/25 text-red-800 dark:text-red-300 font-semibold",
  };
  return <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium capitalize", map[s] ?? "bg-muted")}>{s?.replace(/_/g, " ")}</span>;
}
function ctBadge(t: string | null | undefined) {
  if (!t) return <span className="text-muted-foreground">—</span>;
  return <Badge variant="outline" className="text-[10px]">{t}</Badge>;
}

function ReportsPage() {
  const [preset, setPreset] = useState<RangePreset>("30d");
  const initial = computeRange("30d");
  const [range, setRange] = useState({ from: initial.from, to: initial.to });
  const [tab, setTab] = useState("sales");

  const onDateChange = (p: RangePreset, from: string, to: string) => {
    setPreset(p); setRange({ from, to });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Transaction-level records for accounting, auditing, and business documentation.</p>
        </div>
        <DateRangePicker preset={preset} from={range.from} to={range.to} onChange={onDateChange} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="sales">📋 Sales Ledger</TabsTrigger>
          <TabsTrigger value="quotes">📄 Quotation Pipeline</TabsTrigger>
          <TabsTrigger value="fulfillment">🚚 Fulfillment</TabsTrigger>
          <TabsTrigger value="credit">💳 Credit & Payments</TabsTrigger>
          <TabsTrigger value="carts">🛒 Cart Abandonment</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-4"><SalesLedgerTab range={range} /></TabsContent>
        <TabsContent value="quotes" className="mt-4"><QuotationsTab range={range} /></TabsContent>
        <TabsContent value="fulfillment" className="mt-4"><FulfillmentTab range={range} /></TabsContent>
        <TabsContent value="credit" className="mt-4"><CreditTab range={range} /></TabsContent>
        <TabsContent value="carts" className="mt-4"><CartAbandonmentTab range={range} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ============ TAB 1: SALES LEDGER ============ */
function SalesLedgerTab({ range }: { range: { from: string; to: string } }) {
  const [page, setPage] = useState(1);
  const [pm, setPm] = useState("all");
  const [status, setStatus] = useState("all");
  const [ct, setCt] = useState("all");
  const [q, setQ] = useState("");

  const filters = { payment_method: pm, status, customer_type: ct, q };
  const query = useQuery({
    queryKey: ["report-sales", range, filters, page],
    queryFn: () => reportSalesLedger({ data: { ...range, ...filters, page, pageSize: PAGE_SIZE } }),
  });
  const data = query.data;

  const columns: Column<any>[] = [
    { key: "date", header: "Date", cell: (r) => <span className="whitespace-nowrap">{fmtDate(r.created_at, true)}</span> },
    { key: "order", header: "Order #", cell: (r) => <Link to="/admin/orders/$id" params={{ id: r.id }} className="font-mono text-primary hover:underline">{r.order_number}</Link> },
    { key: "customer", header: "Customer", cell: (r) => r.customer_name },
    { key: "type", header: "Type", cell: (r) => ctBadge(r.customer_type) },
    { key: "items", header: "Items", cell: (r) => r.item_count },
    { key: "subtotal", header: "Subtotal", cell: (r) => aed(r.subtotal), className: "text-right" },
    { key: "discount", header: "Discount", cell: (r) => Number(r.discount) > 0 ? <span className="text-red-600">-{aed(r.discount)}</span> : "—", className: "text-right" },
    { key: "shipping", header: "Shipping", cell: (r) => aed(r.shipping_fee), className: "text-right" },
    { key: "vat", header: "VAT", cell: (r) => aed(r.vat), className: "text-right" },
    { key: "total", header: "Total", cell: (r) => <span className="font-semibold">{aed(r.total)}</span>, className: "text-right" },
    { key: "pm", header: "Payment", cell: (r) => pmBadge(r.payment_method) },
    { key: "status", header: "Status", cell: (r) => statusBadge(r.status) },
  ];

  const doExport = async () => {
    try {
      const all = await reportSalesLedger({ data: { ...range, ...filters, exportAll: true } });
      downloadCsv(`sales-ledger-${range.from.slice(0, 10)}_${range.to.slice(0, 10)}.csv`,
        ["Date", "Order #", "Customer", "Type", "Items", "Subtotal", "Discount", "Shipping", "VAT", "Total", "Payment", "Status"],
        all.rows.map((r: any) => [fmtDate(r.created_at, true), r.order_number, r.customer_name, r.customer_type ?? "", r.item_count, r.subtotal, r.discount, r.shipping_fee, r.vat, r.total, r.payment_method, r.status]));
      toast.success(`Exported ${all.rows.length} rows`);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <KpiCards items={[
        { label: "Total Orders", value: String(data?.kpis.orders ?? 0), tone: "blue" },
        { label: "Gross Revenue", value: aed(data?.kpis.gross ?? 0), tone: "green" },
        { label: "Net Revenue", value: aed(data?.kpis.net ?? 0), tone: "green" },
        { label: "Total VAT Collected", value: aed(data?.kpis.vat ?? 0), tone: "amber" },
      ]} />

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search order # or customer…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-xs" />
        <Select value={pm} onValueChange={(v) => { setPm(v); setPage(1); }}><SelectTrigger className="w-40"><SelectValue placeholder="Payment" /></SelectTrigger><SelectContent>
          <SelectItem value="all">All Payments</SelectItem><SelectItem value="stripe">Stripe</SelectItem><SelectItem value="cod">COD</SelectItem><SelectItem value="wallet">Wallet</SelectItem><SelectItem value="quote">Quote</SelectItem>
        </SelectContent></Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}><SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent>
          <SelectItem value="all">All Status</SelectItem>{["placed", "confirmed", "packed", "shipped", "delivered", "cancelled"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent></Select>
        <Select value={ct} onValueChange={(v) => { setCt(v); setPage(1); }}><SelectTrigger className="w-40"><SelectValue placeholder="Customer Type" /></SelectTrigger><SelectContent>
          <SelectItem value="all">All Types</SelectItem><SelectItem value="IND">Individual</SelectItem><SelectItem value="GAR">Garage</SelectItem><SelectItem value="EXP">Export</SelectItem>
        </SelectContent></Select>
        <div className="ml-auto"><Button size="sm" onClick={doExport}><Download className="mr-1.5 h-4 w-4" />Export CSV</Button></div>
      </div>

      <ReportTable
        columns={columns}
        rows={data?.rows ?? []}
        loading={query.isLoading}
        total={data?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        onPage={setPage}
        footer={data ? (
          <tr className="border-t-2 bg-surface-2 font-semibold">
            <td className="px-3 py-2" colSpan={5}>TOTALS (all rows in range)</td>
            <td className="px-3 py-2 text-right">{aed(data.kpis.gross)}</td>
            <td className="px-3 py-2 text-right text-red-600">-{aed(data.kpis.discount)}</td>
            <td className="px-3 py-2 text-right">{aed(data.kpis.shipping)}</td>
            <td className="px-3 py-2 text-right">{aed(data.kpis.vat)}</td>
            <td className="px-3 py-2 text-right">{aed(data.kpis.net)}</td>
            <td colSpan={2} />
          </tr>
        ) : null}
      />
    </div>
  );
}

/* ============ TAB 2: QUOTATIONS ============ */
function QuotationsTab({ range }: { range: { from: string; to: string } }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [ct, setCt] = useState("all");
  const [q, setQ] = useState("");
  const filters = { status, customer_type: ct, q };
  const query = useQuery({
    queryKey: ["report-quotes", range, filters, page],
    queryFn: () => reportQuotations({ data: { ...range, ...filters, page, pageSize: PAGE_SIZE } }),
  });
  const data = query.data;
  const funnel = data?.funnel ?? {};
  const funnelTotal = Object.values(funnel).reduce((s: number, n: any) => s + n, 0);

  const columns: Column<any>[] = [
    { key: "date", header: "Date", cell: (r) => fmtDate(r.created_at) },
    { key: "num", header: "Quote #", cell: (r) => <Link to="/admin/quotations/$id" params={{ id: r.id }} className="font-mono text-primary hover:underline">{r.quotation_number}</Link> },
    { key: "customer", header: "Customer", cell: (r) => r.customer_name },
    { key: "type", header: "Type", cell: (r) => ctBadge(r.customer_type) },
    { key: "items", header: "Items", cell: (r) => r.item_count },
    { key: "value", header: "Quoted Value", cell: (r) => aed(r.grand_total), className: "text-right" },
    { key: "disc", header: "Discount", cell: (r) => aed(r.discount_amount), className: "text-right" },
    { key: "valid", header: "Valid Until", cell: (r) => {
      if (!r.valid_until) return "—";
      const exp = new Date(r.valid_until) < new Date();
      return <span className={exp ? "text-red-600" : ""}>{fmtDate(r.valid_until)}</span>;
    } },
    { key: "by", header: "Created By", cell: (r) => r.created_by_name },
    { key: "status", header: "Status", cell: (r) => statusBadge(r.status) },
    { key: "age", header: "Days Open", cell: (r) => {
      const age = r.days_open;
      const cls = age > 30 ? "text-red-600" : age > 14 ? "text-amber-600" : "";
      return <span className={cls}>{age}d</span>;
    } },
    { key: "conv", header: "Converted Order", cell: (r) => r.converted_order_number ? <Link to="/admin/orders/$id" params={{ id: r.converted_order_id }} className="font-mono text-primary hover:underline">#{r.converted_order_number}</Link> : "—" },
  ];

  const doExport = async () => {
    try {
      const all = await reportQuotations({ data: { ...range, ...filters, exportAll: true } });
      downloadCsv(`quotations-${range.from.slice(0, 10)}_${range.to.slice(0, 10)}.csv`,
        ["Date", "Quote #", "Customer", "Type", "Items", "Quoted Value", "Discount", "Valid Until", "Created By", "Status", "Days Open", "Converted Order"],
        all.rows.map((r: any) => [fmtDate(r.created_at), r.quotation_number, r.customer_name, r.customer_type ?? "", r.item_count, r.grand_total, r.discount_amount, r.valid_until ? fmtDate(r.valid_until) : "", r.created_by_name, r.status, r.days_open, r.converted_order_number ?? ""]));
      toast.success(`Exported ${all.rows.length} rows`);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <KpiCards items={[
        { label: "Total Quotations", value: String(data?.kpis.total ?? 0), tone: "blue" },
        { label: "Total Quoted Value", value: aed(data?.kpis.quotedValue ?? 0), tone: "amber" },
        { label: "Approved", value: String(data?.kpis.approved ?? 0), tone: "green" },
        { label: "Converted", value: String(data?.kpis.converted ?? 0), tone: "green" },
        { label: "Rejected / Expired", value: String(data?.kpis.rejectedExpired ?? 0), tone: "red" },
      ]} />

      {funnelTotal > 0 && (
        <div className="rounded-lg border bg-surface p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pipeline Funnel</div>
          <div className="flex h-8 w-full overflow-hidden rounded">
            {[
              { k: "draft", c: "bg-slate-400" }, { k: "sent", c: "bg-blue-500" }, { k: "approved", c: "bg-emerald-500" },
              { k: "converted", c: "bg-green-700" }, { k: "rejected", c: "bg-red-500" }, { k: "expired", c: "bg-amber-500" },
            ].map(({ k, c }) => {
              const n = (funnel as any)[k] ?? 0;
              const w = (n / funnelTotal) * 100;
              if (!n) return null;
              return <div key={k} className={cn("flex items-center justify-center text-xs font-medium text-white", c)} style={{ width: `${w}%` }}>{k}: {n}</div>;
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search quote #…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-xs" />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="all">All Status</SelectItem>{["draft", "sent", "approved", "converted", "rejected", "expired"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent></Select>
        <Select value={ct} onValueChange={(v) => { setCt(v); setPage(1); }}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="all">All Types</SelectItem><SelectItem value="IND">Individual</SelectItem><SelectItem value="GAR">Garage</SelectItem><SelectItem value="EXP">Export</SelectItem>
        </SelectContent></Select>
        <div className="ml-auto"><Button size="sm" onClick={doExport}><Download className="mr-1.5 h-4 w-4" />Export CSV</Button></div>
      </div>

      <ReportTable columns={columns} rows={data?.rows ?? []} loading={query.isLoading} total={data?.total ?? 0} page={page} pageSize={PAGE_SIZE} onPage={setPage} />
    </div>
  );
}

/* ============ TAB 3: FULFILLMENT ============ */
function FulfillmentTab({ range }: { range: { from: string; to: string } }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [pm, setPm] = useState("all");
  const [city, setCity] = useState("all");
  const [age, setAge] = useState("all");
  const filters = { status, payment_method: pm, city, age };
  const query = useQuery({
    queryKey: ["report-fulfill", range, filters, page],
    queryFn: () => reportFulfillment({ data: { ...range, ...filters, page, pageSize: PAGE_SIZE } }),
  });
  const data = query.data;
  const cityOptions = useMemo(() => data?.ordersByCity.map((c: any) => c.city) ?? [], [data]);

  const columns: Column<any>[] = [
    { key: "num", header: "Order #", cell: (r) => <Link to="/admin/orders/$id" params={{ id: r.id }} className="font-mono text-primary hover:underline">{r.order_number}</Link> },
    { key: "date", header: "Placed", cell: (r) => fmtDate(r.created_at) },
    { key: "customer", header: "Customer", cell: (r) => r.customer_name },
    { key: "city", header: "City", cell: (r) => r.city },
    { key: "items", header: "Items", cell: (r) => r.item_count },
    { key: "total", header: "Total", cell: (r) => aed(r.total), className: "text-right" },
    { key: "pm", header: "Payment", cell: (r) => pmBadge(r.payment_method) },
    { key: "status", header: "Status", cell: (r) => statusBadge(r.status) },
    { key: "age", header: "Age (d)", cell: (r) => {
      const a = r.age_days;
      const cls = a > 7 ? "text-red-600 font-semibold" : a >= 3 ? "text-amber-600" : "text-emerald-600";
      return <span className={cls}>{a}</span>;
    } },
    { key: "notes", header: "Notes", cell: (r) => r.notes ? <span className="line-clamp-1 text-xs text-muted-foreground">{r.notes}</span> : "—" },
  ];

  const doExport = async () => {
    try {
      const all = await reportFulfillment({ data: { ...range, ...filters, exportAll: true } });
      downloadCsv(`fulfillment-${range.from.slice(0, 10)}_${range.to.slice(0, 10)}.csv`,
        ["Order #", "Placed", "Customer", "City", "Items", "Total", "Payment", "Status", "Age (days)", "Notes"],
        all.rows.map((r: any) => [r.order_number, fmtDate(r.created_at), r.customer_name, r.city, r.item_count, r.total, r.payment_method, r.status, r.age_days, r.notes ?? ""]));
      toast.success(`Exported ${all.rows.length} rows`);
    } catch (e: any) { toast.error(e.message); }
  };

  const avg = data?.kpis.avgProcessingDays ?? 0;
  const successRate = data?.kpis.deliverySuccessRate ?? 0;

  return (
    <div className="space-y-4">
      <KpiCards items={[
        { label: "Orders Pending", value: String(data?.kpis.pending ?? 0), tone: "amber", pulse: (data?.kpis.pending ?? 0) > 10 },
        { label: "Avg Processing Time", value: `${avg.toFixed(1)} d`, tone: avg < 2 ? "green" : avg > 5 ? "red" : "blue" },
        { label: "Shipped Today", value: String(data?.kpis.shippedToday ?? 0), tone: "green" },
        { label: "Delivery Success Rate", value: `${successRate.toFixed(1)}%`, tone: successRate > 95 ? "green" : successRate > 85 ? "amber" : "red" },
      ]} />

      {data?.ordersByCity && data.ordersByCity.length > 0 && (
        <div className="rounded-lg border bg-surface p-4">
          <div className="mb-3 text-sm font-semibold">Orders by Shipping Destination</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.ordersByCity.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="city" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="all">All Status</SelectItem>{["placed", "confirmed", "packed", "shipped", "delivered"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent></Select>
        <Select value={city} onValueChange={(v) => { setCity(v); setPage(1); }}><SelectTrigger className="w-36"><SelectValue placeholder="City" /></SelectTrigger><SelectContent>
          <SelectItem value="all">All Cities</SelectItem>{cityOptions.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent></Select>
        <Select value={pm} onValueChange={(v) => { setPm(v); setPage(1); }}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="all">All Payments</SelectItem><SelectItem value="stripe">Stripe</SelectItem><SelectItem value="cod">COD</SelectItem><SelectItem value="wallet">Wallet</SelectItem>
        </SelectContent></Select>
        <Select value={age} onValueChange={(v) => { setAge(v); setPage(1); }}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="all">All Ages</SelectItem><SelectItem value="lt3">&lt; 3 days</SelectItem><SelectItem value="3to7">3–7 days</SelectItem><SelectItem value="gt7">&gt; 7 days</SelectItem>
        </SelectContent></Select>
        <div className="ml-auto"><Button size="sm" onClick={doExport}><Download className="mr-1.5 h-4 w-4" />Export CSV</Button></div>
      </div>

      <ReportTable columns={columns} rows={data?.rows ?? []} loading={query.isLoading} total={data?.total ?? 0} page={page} pageSize={PAGE_SIZE} onPage={setPage} />
    </div>
  );
}

/* ============ TAB 4: CREDIT ============ */
function CreditTab({ range }: { range: { from: string; to: string } }) {
  const [subtab, setSubtab] = useState("transactions");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["report-credit", range, subtab, page],
    queryFn: () => reportCredit({ data: { ...range, subtab, page, pageSize: PAGE_SIZE } }),
  });
  const data = query.data;

  const doExport = async () => {
    try {
      const all = await reportCredit({ data: { ...range, subtab, exportAll: true } });
      let headers: string[] = [], mapper: (r: any) => any[];
      if (subtab === "transactions") {
        headers = ["Date", "Customer", "Type", "Amount", "Balance After", "Reason", "Remarks", "Order #", "Updated By"];
        mapper = (r) => [fmtDate(r.created_at, true), r.customer_name, r.type, r.amount, r.balance_after, r.reason ?? "", r.remarks ?? "", r.order_number ?? "", r.updated_by_name ?? ""];
      } else if (subtab === "payments") {
        headers = ["Date", "Customer", "Amount", "Method", "Reference", "Statement", "Recorded By", "Notes"];
        mapper = (r) => [fmtDate(r.payment_date), r.customer_name, r.amount, r.payment_method, r.payment_reference ?? "", r.statement_number ?? "", r.recorded_by_name ?? "", r.notes ?? ""];
      } else {
        headers = ["Statement #", "Customer", "Period Start", "Period End", "Outstanding", "Paid", "Due Date", "Status"];
        mapper = (r) => [r.statement_number, r.customer_name, r.period_start, r.period_end, r.outstanding_amount, r.amount_paid, r.due_date, r.status];
      }
      downloadCsv(`credit-${subtab}-${range.from.slice(0, 10)}_${range.to.slice(0, 10)}.csv`, headers, all.rows.map(mapper));
      toast.success(`Exported ${all.rows.length} rows`);
    } catch (e: any) { toast.error(e.message); }
  };

  const txCols: Column<any>[] = [
    { key: "date", header: "Date", cell: (r) => fmtDate(r.created_at, true) },
    { key: "customer", header: "Customer", cell: (r) => r.customer_name },
    { key: "type", header: "Type", cell: (r) => <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium capitalize", r.type === "credit" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-red-500/15 text-red-700 dark:text-red-300")}>{r.type}</span> },
    { key: "amount", header: "Amount", cell: (r) => <span className={r.type === "credit" ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>{r.type === "debit" ? "-" : "+"}{aed(r.amount)}</span>, className: "text-right" },
    { key: "bal", header: "Balance After", cell: (r) => aed(r.balance_after), className: "text-right" },
    { key: "reason", header: "Reason", cell: (r) => r.reason ?? "—" },
    { key: "remarks", header: "Remarks", cell: (r) => <span className="text-xs text-muted-foreground line-clamp-1">{r.remarks ?? "—"}</span> },
    { key: "order", header: "Order #", cell: (r) => r.order_number ? <Link to="/admin/orders/$id" params={{ id: r.order_id }} className="font-mono text-primary hover:underline">{r.order_number}</Link> : "—" },
    { key: "by", header: "Updated By", cell: (r) => r.updated_by_name ?? "System" },
  ];
  const payCols: Column<any>[] = [
    { key: "date", header: "Date", cell: (r) => fmtDate(r.payment_date) },
    { key: "customer", header: "Customer", cell: (r) => r.customer_name },
    { key: "amount", header: "Amount", cell: (r) => <span className="text-emerald-600 font-semibold">{aed(r.amount)}</span>, className: "text-right" },
    { key: "method", header: "Method", cell: (r) => <Badge variant="outline">{r.payment_method}</Badge> },
    { key: "ref", header: "Reference", cell: (r) => <span className="font-mono text-xs">{r.payment_reference ?? "—"}</span> },
    { key: "stmt", header: "Statement", cell: (r) => r.statement_number ? <span className="font-mono text-xs">{r.statement_number}</span> : "—" },
    { key: "by", header: "Recorded By", cell: (r) => r.recorded_by_name ?? "—" },
    { key: "notes", header: "Notes", cell: (r) => <span className="text-xs text-muted-foreground line-clamp-1">{r.notes ?? "—"}</span> },
  ];
  const stmtCols: Column<any>[] = [
    { key: "num", header: "Statement #", cell: (r) => <span className="font-mono">{r.statement_number}</span> },
    { key: "customer", header: "Customer", cell: (r) => r.customer_name },
    { key: "period", header: "Period", cell: (r) => `${fmtDate(r.period_start)} – ${fmtDate(r.period_end)}` },
    { key: "outstanding", header: "Outstanding", cell: (r) => <span className="text-red-600 font-semibold">{aed(r.outstanding_amount)}</span>, className: "text-right" },
    { key: "paid", header: "Paid", cell: (r) => aed(r.amount_paid), className: "text-right" },
    { key: "due", header: "Due Date", cell: (r) => {
      const overdue = r.status !== "paid" && new Date(r.due_date) < new Date();
      return <span className={overdue ? "text-red-600 font-semibold" : ""}>{fmtDate(r.due_date)}</span>;
    } },
    { key: "status", header: "Status", cell: (r) => statusBadge(r.status) },
  ];
  const cols = subtab === "transactions" ? txCols : subtab === "payments" ? payCols : stmtCols;

  return (
    <div className="space-y-4">
      <KpiCards items={[
        { label: "Total Credit Extended", value: aed(data?.kpis.extended ?? 0), tone: "blue" },
        { label: "Total Outstanding", value: aed(data?.kpis.outstanding ?? 0), tone: "red" },
        { label: "Payments Received", value: aed(data?.kpis.paymentsReceived ?? 0), tone: "green" },
        { label: "Overdue Statements", value: String(data?.kpis.overdueCount ?? 0), tone: "red", pulse: (data?.kpis.overdueCount ?? 0) > 0 },
      ]} />

      <Tabs value={subtab} onValueChange={(v) => { setSubtab(v); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="transactions">Transaction Log</TabsTrigger>
          <TabsTrigger value="payments">Payment Receipts</TabsTrigger>
          <TabsTrigger value="statements">Billing Statements</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center justify-end">
        <Button size="sm" onClick={doExport}><Download className="mr-1.5 h-4 w-4" />Export CSV</Button>
      </div>

      <ReportTable columns={cols} rows={data?.rows ?? []} loading={query.isLoading} total={data?.total ?? 0} page={page} pageSize={PAGE_SIZE} onPage={setPage} />

      {data?.aging && (
        <div className="rounded-lg border bg-surface p-4">
          <div className="mb-3 text-sm font-semibold">Aging Summary (Outstanding)</div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Current (not due)", value: data.aging.current, tone: "text-emerald-600" },
              { label: "1–30 days overdue", value: data.aging.d30, tone: "text-amber-600" },
              { label: "31–60 days overdue", value: data.aging.d60, tone: "text-orange-600" },
              { label: "60+ days overdue", value: data.aging.d60plus, tone: "text-red-600" },
            ].map((b) => (
              <div key={b.label} className="rounded border p-3">
                <div className="text-xs text-muted-foreground">{b.label}</div>
                <div className={cn("mt-1 text-lg font-bold", b.tone)}>{aed(b.value)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ TAB 5: CART ABANDONMENT ============ */
function CartAbandonmentTab({ range }: { range: { from: string; to: string } }) {
  const [page, setPage] = useState(1);
  const [abStatus, setAbStatus] = useState("all");
  const [ct, setCt] = useState("all");
  const [q, setQ] = useState("");
  const filters = { ab_status: abStatus, customer_type: ct, q };
  const query = useQuery({
    queryKey: ["report-carts", range, filters, page],
    queryFn: () => reportCartAbandonment({ data: { ...range, ...filters, page, pageSize: PAGE_SIZE } }),
  });
  const data = query.data;

  const cartCols: Column<any>[] = [
    { key: "customer", header: "Customer", cell: (r) => <Link to="/admin/customers/$id" params={{ id: r.user_id }} className="text-primary hover:underline">{r.customer_name}</Link> },
    { key: "phone", header: "Phone", cell: (r) => r.phone },
    { key: "type", header: "Type", cell: (r) => ctBadge(r.customer_type) },
    { key: "items", header: "Items", cell: (r) => r.item_count },
    { key: "value", header: "Cart Value", cell: (r) => <span className="font-semibold">{aed(r.cart_value)}</span>, className: "text-right" },
    { key: "last", header: "Last Cart Activity", cell: (r) => {
      const days = (Date.now() - new Date(r.last_activity).getTime()) / 86400000;
      return <span className={days > 7 ? "text-red-600" : ""}>{fmtDate(r.last_activity)}</span>;
    } },
    { key: "order", header: "Last Order", cell: (r) => r.last_order ? fmtDate(r.last_order) : <span className="text-red-600">Never ordered</span> },
    { key: "status", header: "Status", cell: (r) => {
      const map: any = { hot: "bg-red-500/20 text-red-700 dark:text-red-300", warm: "bg-amber-500/20 text-amber-700 dark:text-amber-300", cold: "bg-slate-500/20 text-slate-700 dark:text-slate-300" };
      return <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold uppercase", map[r.status])}>{r.status}</span>;
    } },
  ];

  const prodCols: Column<any>[] = [
    { key: "pn", header: "Part #", cell: (r) => <span className="font-mono text-xs">{r.part_number}</span> },
    { key: "name", header: "Name", cell: (r) => r.name },
    { key: "brand", header: "Brand", cell: (r) => <Badge variant="outline">{r.manufacturer}</Badge> },
    { key: "cnt", header: "Times in Carts", cell: (r) => <span className="font-semibold">{r.count}</span>, className: "text-right" },
    { key: "value", header: "Lost Value", cell: (r) => aed(r.value), className: "text-right" },
    { key: "stock", header: "In Stock", cell: (r) => r.in_stock ? <span className="text-emerald-600">Yes</span> : <span className="text-red-600">No</span> },
  ];

  const doExportCarts = async () => {
    try {
      const all = await reportCartAbandonment({ data: { ...range, ...filters, exportAll: true } });
      downloadCsv(`abandoned-carts-${new Date().toISOString().slice(0, 10)}.csv`,
        ["Customer", "Phone", "Type", "Items", "Cart Value", "Last Cart Activity", "Last Order", "Status"],
        all.rows.map((r: any) => [r.customer_name, r.phone, r.customer_type ?? "", r.item_count, r.cart_value, fmtDate(r.last_activity), r.last_order ? fmtDate(r.last_order) : "Never", r.status]));
      toast.success(`Exported ${all.rows.length} rows`);
    } catch (e: any) { toast.error(e.message); }
  };
  const doExportProducts = () => {
    if (!data?.topProducts) return;
    downloadCsv(`abandoned-products-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Part #", "Name", "Brand", "Times in Carts", "Lost Value", "In Stock"],
      data.topProducts.map((r: any) => [r.part_number, r.name, r.manufacturer, r.count, r.value, r.in_stock ? "Yes" : "No"]));
  };

  const rate = data?.kpis.abandonmentRate ?? 0;

  return (
    <div className="space-y-4">
      <KpiCards items={[
        { label: "Active Carts (No Order)", value: String(data?.kpis.activeCarts ?? 0), tone: "amber" },
        { label: "Abandoned Cart Value", value: aed(data?.kpis.abandonedValue ?? 0), tone: "red" },
        { label: "Abandonment Rate", value: `${rate.toFixed(1)}%`, tone: rate > 60 ? "red" : rate > 30 ? "amber" : "green" },
        { label: "Recoverable Revenue (30%)", value: aed(data?.kpis.recoverable ?? 0), tone: "green" },
      ]} />

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search customer…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-xs" />
        <Select value={abStatus} onValueChange={(v) => { setAbStatus(v); setPage(1); }}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="all">All</SelectItem><SelectItem value="hot">Hot (&lt; 24h)</SelectItem><SelectItem value="warm">Warm (1–3d)</SelectItem><SelectItem value="cold">Cold (&gt; 3d)</SelectItem>
        </SelectContent></Select>
        <Select value={ct} onValueChange={(v) => { setCt(v); setPage(1); }}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="all">All Types</SelectItem><SelectItem value="IND">Individual</SelectItem><SelectItem value="GAR">Garage</SelectItem><SelectItem value="EXP">Export</SelectItem>
        </SelectContent></Select>
        <div className="ml-auto"><Button size="sm" onClick={doExportCarts}><Download className="mr-1.5 h-4 w-4" />Export Carts CSV</Button></div>
      </div>

      <ReportTable columns={cartCols} rows={data?.rows ?? []} loading={query.isLoading} total={data?.total ?? 0} page={page} pageSize={PAGE_SIZE} onPage={setPage} />

      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Top Abandoned Products</div>
        <Button size="sm" variant="outline" onClick={doExportProducts}><Download className="mr-1.5 h-4 w-4" />Export Products CSV</Button>
      </div>
      <ReportTable columns={prodCols} rows={data?.topProducts ?? []} loading={query.isLoading} total={data?.topProducts?.length ?? 0} page={1} pageSize={100} onPage={() => {}} />
    </div>
  );
}
