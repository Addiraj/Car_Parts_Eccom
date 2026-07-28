import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  adminAnalyticsOverview,
  adminTopCustomersByType,
  adminTopPartsByType,
  adminExportAnalyticsCsv,
} from "@/lib/admin.functions";
import { CustomerTypeBadge } from "@/components/customer-type-badge";
import { formatAED } from "@/lib/format";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { ClientAnalytics } from "@/components/admin/client-analytics";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({ meta: [{ title: "Admin · Analytics" }] }),
  component: AdminAnalytics,
});

const TYPES = ["IND", "GAR", "EXP"] as const;
type T = (typeof TYPES)[number];

async function downloadReport(report: "overview" | "top-customers" | "top-parts" | "monthly", type?: T) {
  try {
    const res = await adminExportAnalyticsCsv({ data: { report, type } as any });
    const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = res.filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  } catch (e: any) {
    toast.error(e.message);
  }
}

function ExportBtn(props: { report: "overview" | "top-customers" | "top-parts" | "monthly"; type?: T }) {
  return (
    <button onClick={() => downloadReport(props.report, props.type)}
      className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-surface-2">
      <Download className="h-3 w-3" /> CSV
    </button>
  );
}

function AdminAnalytics() {
  const { data } = useQuery({ queryKey: ["admin-analytics"], queryFn: () => adminAnalyticsOverview() });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <ExportBtn report="overview" />
      </div>

      {!data && <p className="text-sm text-muted-foreground">Loading…</p>}

      {data && (
        <>
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Customer breakdown</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {TYPES.map((t) => (
                <div key={t} className="rounded-lg border bg-surface p-5">
                  <CustomerTypeBadge type={t} />
                  <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                    <Stat label="Users" value={(data.usersByType[t] ?? 0).toLocaleString()} />
                    <Stat label="Orders" value={(data.ordersByType[t] ?? 0).toLocaleString()} />
                    <Stat label="Revenue" value={formatAED(Number(data.revenueByType[t] ?? 0))} small />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border bg-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Monthly orders by tier</h2>
              <ExportBtn report="monthly" />
            </div>
            <MonthlyChart data={data.monthly} />
          </section>

          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Top customers per tier</h2>
            <div className="grid gap-4 lg:grid-cols-3">
              {TYPES.map((t) => <TopCustomers key={t} type={t} />)}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Most purchased parts per tier</h2>
            <div className="grid gap-4 lg:grid-cols-3">
              {TYPES.map((t) => <TopParts key={t} type={t} />)}
            </div>
          </section>

          <AdvancedAnalytics />
          <ClientAnalytics />
        </>
      )}
    </div>
  );
}


function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-1 font-bold ${small ? "text-sm" : "text-lg"}`}>{value}</div>
    </div>
  );
}

function MonthlyChart({ data }: { data: Array<{ month: string; IND?: number; GAR?: number; EXP?: number }> }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.IND ?? 0, d.GAR ?? 0, d.EXP ?? 0]));
  const colors: Record<string, string> = { IND: "bg-blue-500", GAR: "bg-amber-500", EXP: "bg-emerald-500" };
  return (
    <div className="mt-4 overflow-x-auto">
      <div className="flex min-w-[600px] items-end gap-3 pb-2">
        {data.map((d) => (
          <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-40 w-full items-end justify-center gap-1">
              {(["IND", "GAR", "EXP"] as const).map((t) => (
                <div key={t} className={`w-2 rounded-t ${colors[t]}`} style={{ height: `${((d[t] ?? 0) / max) * 100}%` }} title={`${t}: ${d[t] ?? 0}`} />
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground">{d.month.slice(5)}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-4 text-[11px] text-muted-foreground">
        {(["IND", "GAR", "EXP"] as const).map((t) => (
          <span key={t} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded ${colors[t]}`} /> {t}</span>
        ))}
      </div>
    </div>
  );
}

function TopCustomers({ type }: { type: T }) {
  const { data = [] } = useQuery({
    queryKey: ["top-customers", type],
    queryFn: () => adminTopCustomersByType({ data: { type, limit: 10 } }),
  });
  return (
    <div className="rounded-lg border bg-surface">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2"><CustomerTypeBadge type={type} showLabel={false} /><span className="text-xs font-semibold">Top customers</span></div>
        <ExportBtn report="top-customers" type={type} />
      </div>
      <ul className="divide-y text-sm">
        {(data as any[]).map((u, i) => (
          <li key={u.user_id} className="flex items-center gap-3 px-4 py-2">
            <span className="w-5 text-xs text-muted-foreground">#{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{u.full_name}</div>
              <div className="truncate text-[11px] text-muted-foreground">{u.email}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-xs">{formatAED(Number(u.spend))}</div>
              <div className="text-[10px] text-muted-foreground">{u.orders} orders</div>
            </div>
          </li>
        ))}
        {!data.length && <li className="px-4 py-6 text-center text-xs text-muted-foreground">No data yet.</li>}
      </ul>
    </div>
  );
}

function TopParts({ type }: { type: T }) {
  const { data = [] } = useQuery({
    queryKey: ["top-parts", type],
    queryFn: () => adminTopPartsByType({ data: { type, limit: 10 } }),
  });
  return (
    <div className="rounded-lg border bg-surface">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2"><CustomerTypeBadge type={type} showLabel={false} /><span className="text-xs font-semibold">Top parts</span></div>
        <ExportBtn report="top-parts" type={type} />
      </div>
      <ul className="divide-y text-sm">
        {(data as any[]).map((p, i) => (
          <li key={`${p.part_number}-${i}`} className="flex items-center gap-3 px-4 py-2">
            <span className="w-5 text-xs text-muted-foreground">#{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{p.name}</div>
              <div className="truncate font-mono text-[11px] text-muted-foreground">{p.part_number}</div>
            </div>
            <div className="text-right">
              <div className="text-xs">{p.qty} sold</div>
              <div className="font-mono text-[10px] text-muted-foreground">{formatAED(Number(p.revenue))}</div>
            </div>
          </li>
        ))}
        {!data.length && <li className="px-4 py-6 text-center text-xs text-muted-foreground">No data yet.</li>}
      </ul>
    </div>
  );
}

/* ================= NEW ADVANCED ANALYTICS (6 sections) ================= */
import {
  reportRevenueTrend,
  reportLowStockAlerts,
  reportDeadStockAdvanced,
  reportBrandDemand,
  reportBestSellers,
  reportPnl,
} from "@/lib/admin.reports.functions";
import { formatAEDCompact } from "@/lib/format";
import { RevealOnScroll } from "@/components/reveal-on-scroll";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar, LineChart, Line,
} from "recharts";
import { TrendingUp, AlertTriangle, PackageX, PieChart as PieIcon, Star, DollarSign, ArrowUp, ArrowDown } from "lucide-react";
import { useEffect, useMemo } from "react";
import { downloadCsv } from "@/lib/export-utils";

const BRAND_COLORS: Record<string, string> = {
  BMW: "#1E3A8A", "Mercedes-Benz": "#6B7280", Mercedes: "#6B7280",
  Audi: "#111827", Toyota: "#DC2626", Lexus: "#0F172A",
  Nissan: "#EF4444", Honda: "#B91C1C", Ford: "#1D4ED8",
  Volkswagen: "#0369A1", Porsche: "#B45309", Other: "#9CA3AF",
};
const PALETTE = ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#64748b"];
const colorFor = (name: string, i: number) => BRAND_COLORS[name] ?? PALETTE[i % PALETTE.length];

function defaultRange(days = 30) {
  const to = new Date();
  const from = new Date(Date.now() - days * 86400000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function Section({ title, icon: Icon, action, children }: { title: string; icon: any; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <RevealOnScroll className="mb-8">
      <div className="rounded-xl border bg-surface p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Icon className="h-4 w-4 text-primary" /> {title}
          </h2>
          {action}
        </div>
        {children}
      </div>
    </RevealOnScroll>
  );
}

function Delta({ current, previous }: { current: number; previous: number }) {
  if (!previous) return <span className="text-[11px] text-muted-foreground">—</span>;
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${up ? "text-emerald-600" : "text-red-600"}`}>
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function AdvancedAnalytics() {
  const range = useMemo(() => defaultRange(30), []);
  return (
    <div className="mt-10 border-t pt-8">
      <h2 className="mb-6 text-lg font-bold">Advanced Analytics</h2>
      <RevenueTrendSection range={range} />
      <LowStockSection />
      <DeadStockSection />
      <BrandDemandSection range={range} />
      <BestSellersSection range={range} />
      <PnlSection range={range} />
    </div>
  );
}

/* ---- 1. Revenue Trend ---- */
function RevenueTrendSection({ range }: { range: { from: string; to: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ["report-revenue-trend", range],
    queryFn: () => reportRevenueTrend({ data: { ...range, granularity: "day" } }),
  });
  return (
    <Section title="Revenue Trend (last 30 days)" icon={TrendingUp}>
      {isLoading || !data ? (
        <div className="h-64 animate-pulse rounded-md bg-surface-2" />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Revenue</div>
              <div className="mt-1 flex items-baseline gap-2">
                <div className="text-xl font-bold">{formatAEDCompact(data.totals.revenue)}</div>
                <Delta current={data.totals.revenue} previous={data.previous.revenue} />
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Orders</div>
              <div className="mt-1 flex items-baseline gap-2">
                <div className="text-xl font-bold">{data.totals.orders.toLocaleString()}</div>
                <Delta current={data.totals.orders} previous={data.previous.orders} />
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Avg Order Value</div>
              <div className="mt-1 flex items-baseline gap-2">
                <div className="text-xl font-bold">{formatAEDCompact(data.totals.aov)}</div>
                <Delta current={data.totals.aov} previous={data.previous.aov} />
              </div>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <AreaChart data={data.series}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatAEDCompact(v)} width={80} />
                <Tooltip formatter={(v: any) => formatAEDCompact(Number(v))} />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" fill="url(#rev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Section>
  );
}

/* ---- 2. Low Stock ---- */
function LowStockSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["report-low-stock"],
    queryFn: () => reportLowStockAlerts({ data: {} }),
  });
  const exportRows = () => {
    if (!data) return;
    downloadCsv("low-stock.csv",
      ["Part #", "Name", "Brand", "Stock", "Threshold", "Deficit", "Urgency"],
      data.rows.map((r) => [r.part_number, r.name, r.brand ?? "", r.stock, r.threshold, r.deficit, r.urgency]));
  };
  return (
    <Section title="Low Stock Alerts" icon={AlertTriangle}
      action={<button onClick={exportRows} className="rounded-md border px-2.5 py-1 text-xs hover:bg-surface-2">Export CSV</button>}>
      {isLoading || !data ? <div className="h-40 animate-pulse rounded-md bg-surface-2" /> : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-4">
            <Stat label="SKUs below threshold" value={data.totals.totalSkus.toLocaleString()} />
            <Stat label="Total deficit units" value={data.totals.totalDeficit.toLocaleString()} />
            <Stat label="Critical" value={data.totals.criticalCount.toLocaleString()} />
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Part</th>
                  <th className="px-3 py-2 text-left">Brand</th>
                  <th className="px-3 py-2 text-right">Stock</th>
                  <th className="px-3 py-2 text-right">Threshold</th>
                  <th className="px-3 py-2 text-right">Deficit</th>
                  <th className="px-3 py-2 text-right">Urgency</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.rows.slice(0, 50).map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{r.part_number}</div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.brand ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.stock}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{r.threshold}</td>
                    <td className="px-3 py-2 text-right font-mono text-red-600">{r.deficit}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        r.urgency === "CRITICAL" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" :
                        r.urgency === "WARNING" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" :
                        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{r.urgency}</span>
                    </td>
                  </tr>
                ))}
                {!data.rows.length && <tr><td colSpan={6} className="px-3 py-8 text-center text-xs text-muted-foreground">All stock levels healthy.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  );
}

/* ---- 3. Dead Stock ---- */
function DeadStockSection() {
  const [days, setDays] = useState(180);
  const { data, isLoading } = useQuery({
    queryKey: ["report-dead-stock", days],
    queryFn: () => reportDeadStockAdvanced({ data: { minDaysIdle: days } }),
  });
  const exportRows = () => {
    if (!data) return;
    downloadCsv("dead-stock.csv",
      ["Part #", "Name", "Brand", "Stock", "Price", "Trapped Value", "Days Idle", "Last Sale"],
      data.rows.map((r) => [r.part_number, r.name, r.brand ?? "", r.stock, r.price, r.trappedValue.toFixed(2), r.daysIdle ?? "Never", r.lastSaleAt ?? ""]));
  };
  return (
    <Section title="Dead Stock" icon={PackageX}
      action={
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-muted-foreground">Idle ≥</label>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-md border bg-surface px-2 py-1 text-xs">
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
            <option value={365}>1 year</option>
          </select>
          <button onClick={exportRows} className="rounded-md border px-2.5 py-1 text-xs hover:bg-surface-2">Export CSV</button>
        </div>
      }>
      {isLoading || !data ? <div className="h-40 animate-pulse rounded-md bg-surface-2" /> : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-4">
            <Stat label="Dead SKUs" value={data.totals.deadSkus.toLocaleString()} />
            <Stat label="Avg days idle" value={data.totals.avgDaysIdle.toLocaleString()} />
            <Stat label="Trapped capital" value={formatAEDCompact(data.totals.trappedCapital)} small />
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Part</th>
                  <th className="px-3 py-2 text-left">Brand</th>
                  <th className="px-3 py-2 text-right">Stock</th>
                  <th className="px-3 py-2 text-right">Trapped Value</th>
                  <th className="px-3 py-2 text-right">Days Idle</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.rows.slice(0, 50).map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{r.part_number}</div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.brand ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.stock}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatAEDCompact(r.trappedValue)}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.daysIdle == null ? "Never sold" : `${r.daysIdle}d`}</td>
                  </tr>
                ))}
                {!data.rows.length && <tr><td colSpan={5} className="px-3 py-8 text-center text-xs text-muted-foreground">No dead stock in range.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  );
}

/* ---- 4. Brand Demand ---- */
function BrandDemandSection({ range }: { range: { from: string; to: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ["report-brand-demand", range],
    queryFn: () => reportBrandDemand({ data: range }),
  });
  return (
    <Section title="Brand Demand" icon={PieIcon}>
      {isLoading || !data ? <div className="h-64 animate-pulse rounded-md bg-surface-2" /> : (
        <>
          {data.fallback && (
            <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              No sales in range — showing catalog SKU distribution instead.
            </p>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data.rows.slice(0, 10)} dataKey="revenue" nameKey="brand" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {data.rows.slice(0, 10).map((r, i) => <Cell key={r.brand} fill={colorFor(r.brand, i)} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => data.fallback ? `${v} SKUs` : formatAEDCompact(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr><th className="px-3 py-2 text-left">Brand</th>
                    <th className="px-3 py-2 text-right">{data.fallback ? "SKUs" : "Revenue"}</th>
                    <th className="px-3 py-2 text-right">Share</th></tr>
                </thead>
                <tbody className="divide-y">
                  {data.rows.slice(0, 10).map((r, i) => (
                    <tr key={r.brand}>
                      <td className="px-3 py-2"><span className="mr-2 inline-block h-2 w-2 rounded" style={{ background: colorFor(r.brand, i) }} />{r.brand}</td>
                      <td className="px-3 py-2 text-right font-mono">{data.fallback ? r.revenue : formatAEDCompact(r.revenue)}</td>
                      <td className="px-3 py-2 text-right font-mono">{(r.share * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                  {!data.rows.length && <tr><td colSpan={3} className="px-3 py-6 text-center text-xs text-muted-foreground">No data.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Section>
  );
}

/* ---- 5. Best Sellers ---- */
function BestSellersSection({ range }: { range: { from: string; to: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ["report-best-sellers", range],
    queryFn: () => reportBestSellers({ data: { ...range, limit: 10 } }),
  });
  return (
    <Section title="Best Selling Parts (Top 10)" icon={Star}>
      {isLoading || !data ? <div className="h-64 animate-pulse rounded-md bg-surface-2" /> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="part_number" tick={{ fontSize: 10 }} width={90} />
                <Tooltip />
                <Bar dataKey="units" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Part</th>
                  <th className="px-3 py-2 text-right">Units</th>
                  <th className="px-3 py-2 text-right">Revenue</th></tr>
              </thead>
              <tbody className="divide-y">
                {data.map((p, i) => (
                  <tr key={`${p.part_number}-${i}`}>
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{p.name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{p.part_number}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{p.units}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatAEDCompact(p.revenue)}</td>
                  </tr>
                ))}
                {!data.length && <tr><td colSpan={4} className="px-3 py-6 text-center text-xs text-muted-foreground">No sales in range.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Section>
  );
}

/* ---- 6. P&L ---- */
function PnlSection({ range }: { range: { from: string; to: string } }) {
  const [margin, setMargin] = useState<number>(30);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem("pnl-margin-pct");
      if (raw) {
        const n = Number(raw);
        if (Number.isFinite(n)) setMargin(n);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("pnl-margin-pct", String(margin));
  }, [margin]);

  const { data, isLoading } = useQuery({
    queryKey: ["report-pnl", range],
    queryFn: () => reportPnl({ data: { ...range, granularity: "day" } }),
  });

  const derived = useMemo(() => {
    if (!data) return null;
    const netRevenue = data.grossRevenue - data.discounts;
    const cogs = netRevenue * (1 - margin / 100);
    const gross = netRevenue - cogs;
    const net = gross - 0; // opex placeholder
    return { netRevenue, cogs, gross, net };
  }, [data, margin]);

  return (
    <Section title="Profit & Loss (last 30 days)" icon={DollarSign}>
      {isLoading || !data || !derived ? <div className="h-64 animate-pulse rounded-md bg-surface-2" /> : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Assumed margin</label>
            <input type="number" min={0} max={100} value={margin}
              onChange={(e) => setMargin(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className="w-20 rounded-md border bg-surface px-2 py-1 text-sm" />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PnlCell label="Gross Revenue" value={derived.netRevenue + data.discounts} tone="neutral" />
            <PnlCell label="Discounts" value={-data.discounts} tone="negative" />
            <PnlCell label="Est. COGS" value={-derived.cogs} tone="negative" />
            <PnlCell label="Net Profit" value={derived.net} tone={derived.net >= 0 ? "positive" : "negative"} bold />
          </div>
          <div className="mt-6 h-56 w-full">
            <ResponsiveContainer>
              <LineChart data={data.marginSeries.map((s) => ({ period: s.period, profit: (s.revenue - s.discount) * (margin / 100) }))}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatAEDCompact(v)} width={80} />
                <Tooltip formatter={(v: any) => formatAEDCompact(Number(v))} />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Section>
  );
}

function PnlCell({ label, value, tone, bold }: { label: string; value: number; tone: "positive" | "negative" | "neutral"; bold?: boolean }) {
  const color = tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-600" : "text-foreground";
  return (
    <div className="rounded-md border p-3">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono ${bold ? "text-xl font-bold" : "text-lg"} ${color}`}>{formatAEDCompact(value)}</div>
    </div>
  );
}
