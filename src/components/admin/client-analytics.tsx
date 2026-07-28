import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line,
} from "recharts";
import {
  Users, MessageSquare, Search, GitCompareArrows, Activity, Award, ArrowUp, ArrowDown, Download, Star,
} from "lucide-react";
import { RevealOnScroll } from "@/components/reveal-on-scroll";
import { CustomerTypeBadge } from "@/components/customer-type-badge";
import { formatAED, formatAEDCompact } from "@/lib/format";
import { downloadCsv } from "@/lib/export-utils";
import {
  reportClientSales,
  reportClientEnquiry,
  reportMostInquiredItems,
  reportClientEnquiryVsSales,
  reportTotalEnquiryVsSales,
  reportSalesRepPerformance,
} from "@/lib/admin.reports.functions";

/* ============================================================ */
/* Shared UI ================================================== */
/* ============================================================ */

function daysAgo(n: number) {
  const to = new Date();
  const from = new Date(Date.now() - n * 86400000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function RangeSelect({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="rounded-md border bg-surface px-2 py-1 text-xs"
    >
      <option value={7}>Last 7 days</option>
      <option value={30}>Last 30 days</option>
      <option value={90}>Last 90 days</option>
      <option value={365}>Last year</option>
    </select>
  );
}

function TypeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border bg-surface px-2 py-1 text-xs"
    >
      <option value="all">All types</option>
      <option value="IND">Individual</option>
      <option value="GAR">Garage</option>
      <option value="EXP">Exporter</option>
    </select>
  );
}

function Section({
  title, icon: Icon, action, children,
}: { title: string; icon: any; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <RevealOnScroll className="mb-8">
      <div className="rounded-xl border bg-surface p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Icon className="h-4 w-4 text-primary" /> {title}
          </h2>
          <div className="flex flex-wrap items-center gap-2">{action}</div>
        </div>
        {children}
      </div>
    </RevealOnScroll>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function ExportBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-surface-2"
    >
      <Download className="h-3 w-3" /> Export CSV
    </button>
  );
}

function fmtDate(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

/* ============================================================ */
/* 7. Client-wise Sales ======================================= */
/* ============================================================ */

function ClientSalesSection() {
  const [days, setDays] = useState(30);
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const range = useMemo(() => daysAgo(days), [days]);
  const { data, isLoading } = useQuery({
    queryKey: ["report-client-sales", range, type, search],
    queryFn: () => reportClientSales({ data: { ...range, customerType: type, search } }),
  });
  const exportRows = () => {
    if (!data) return;
    downloadCsv(
      "client-sales.csv",
      ["Name", "Type", "Phone", "Company", "Orders", "Revenue", "AOV", "Last Order", "Status"],
      data.rows.map((r) => [
        r.full_name, r.customer_type ?? "", r.phone ?? "", r.company_name ?? "",
        r.orders, r.revenue.toFixed(2), r.aov.toFixed(2), fmtDate(r.lastOrderAt), r.status,
      ]),
    );
  };
  return (
    <Section
      title="Client-wise Sales"
      icon={Users}
      action={
        <>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name / phone / company"
            className="w-48 rounded-md border bg-surface px-2 py-1 text-xs"
          />
          <TypeSelect value={type} onChange={setType} />
          <RangeSelect value={days} onChange={setDays} />
          <ExportBtn onClick={exportRows} />
        </>
      }
    >
      {isLoading || !data ? (
        <div className="h-56 animate-pulse rounded-md bg-surface-2" />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Kpi label="Active clients" value={data.totals.activeClients.toLocaleString()} />
            <Kpi label="Total revenue" value={formatAEDCompact(data.totals.totalRevenue)} />
            <Kpi label="Avg per client" value={formatAEDCompact(data.totals.avgPerClient)} />
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Client</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-right">Orders</th>
                  <th className="px-3 py-2 text-right">Revenue</th>
                  <th className="px-3 py-2 text-right">AOV</th>
                  <th className="px-3 py-2 text-left">Last Order</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.rows.slice(0, 100).map((r) => (
                  <tr key={r.user_id}>
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.full_name}</div>
                      <div className="text-[11px] text-muted-foreground">{r.company_name ?? r.phone ?? ""}</div>
                    </td>
                    <td className="px-3 py-2"><CustomerTypeBadge type={r.customer_type as any} showLabel={false} /></td>
                    <td className="px-3 py-2 text-right font-mono">{r.orders}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatAED(r.revenue)}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatAED(r.aov)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{fmtDate(r.lastOrderAt)}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        r.status === "Active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" :
                        r.status === "Dormant" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" :
                        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
                {!data.rows.length && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-xs text-muted-foreground">No client sales in range.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  );
}

/* ============================================================ */
/* 8. Client-wise Enquiry ===================================== */
/* ============================================================ */

function ClientEnquirySection() {
  const [days, setDays] = useState(30);
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const range = useMemo(() => daysAgo(days), [days]);
  const { data, isLoading } = useQuery({
    queryKey: ["report-client-enquiry", range, type, status, search],
    queryFn: () => reportClientEnquiry({ data: { ...range, customerType: type, status, search } }),
  });
  const exportRows = () => {
    if (!data) return;
    downloadCsv(
      "client-enquiry.csv",
      ["Name", "Type", "Company", "Enquiries", "Value", "Approved", "Rejected", "Converted", "Pending", "Last Enquiry"],
      data.rows.map((r) => [
        r.full_name, r.customer_type ?? "", r.company_name ?? "",
        r.total, r.value.toFixed(2), r.approved, r.rejected, r.converted, r.pending, fmtDate(r.lastAt),
      ]),
    );
  };
  return (
    <Section
      title="Client-wise Enquiry"
      icon={MessageSquare}
      action={
        <>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client" className="w-40 rounded-md border bg-surface px-2 py-1 text-xs" />
          <TypeSelect value={type} onChange={setType} />
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border bg-surface px-2 py-1 text-xs">
            <option value="all">All status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="converted">Converted</option>
          </select>
          <RangeSelect value={days} onChange={setDays} />
          <ExportBtn onClick={exportRows} />
        </>
      }
    >
      {isLoading || !data ? (
        <div className="h-56 animate-pulse rounded-md bg-surface-2" />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Kpi label="Clients enquiring" value={data.totals.enquiringClients.toLocaleString()} />
            <Kpi label="Total quotation value" value={formatAEDCompact(data.totals.totalValue)} />
            <Kpi label="Avg enquiries / client" value={data.totals.avgPerClient.toFixed(1)} />
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Client</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">Value</th>
                  <th className="px-3 py-2 text-right">Approved</th>
                  <th className="px-3 py-2 text-right">Rejected</th>
                  <th className="px-3 py-2 text-right">Converted</th>
                  <th className="px-3 py-2 text-right">Pending</th>
                  <th className="px-3 py-2 text-left">Last</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.rows.slice(0, 100).map((r) => (
                  <tr key={r.customer_id}>
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.full_name}</div>
                      <div className="text-[11px] text-muted-foreground">{r.company_name ?? r.phone ?? ""}</div>
                    </td>
                    <td className="px-3 py-2"><CustomerTypeBadge type={r.customer_type as any} showLabel={false} /></td>
                    <td className="px-3 py-2 text-right font-mono">{r.total}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatAED(r.value)}</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-600">{r.approved}</td>
                    <td className="px-3 py-2 text-right font-mono text-red-600">{r.rejected}</td>
                    <td className="px-3 py-2 text-right font-mono text-blue-600">{r.converted}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{r.pending}</td>
                    <td className="px-3 py-2 text-muted-foreground">{fmtDate(r.lastAt)}</td>
                  </tr>
                ))}
                {!data.rows.length && (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-xs text-muted-foreground">No enquiries in range.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  );
}

/* ============================================================ */
/* 9. Most Inquired Items ===================================== */
/* ============================================================ */

function MostInquiredSection() {
  const [days, setDays] = useState(30);
  const range = useMemo(() => daysAgo(days), [days]);
  const { data, isLoading } = useQuery({
    queryKey: ["report-most-inquired", range],
    queryFn: () => reportMostInquiredItems({ data: range }),
  });
  const exportInStock = () => {
    if (!data) return;
    downloadCsv("most-inquired-in-stock.csv",
      ["Part #", "Name", "Brand", "Stock", "Enquiries", "Views", "Searches", "Total"],
      data.inStock.map((r) => [r.part_number, r.name, r.brand ?? "", r.stock ?? 0, r.enquiry, r.views, r.searches, r.total]));
  };
  const exportOut = () => {
    if (!data) return;
    downloadCsv("most-inquired-out-of-stock.csv",
      ["Part #", "Name", "Brand", "Enquiries", "Searches", "Est. Lost Revenue"],
      data.outOfStock.map((r) => [r.part_number, r.name, r.brand ?? "", r.enquiry, r.searches, r.estLostRevenue ?? ""]));
  };
  return (
    <Section
      title="Most Inquired / Searched Items"
      icon={Search}
      action={<RangeSelect value={days} onChange={setDays} />}
    >
      {isLoading || !data ? (
        <div className="h-64 animate-pulse rounded-md bg-surface-2" />
      ) : (
        <>
          <div className="mb-6 h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={data.chart}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="part_number" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="inStock" name="In Stock" stackId="a" fill="#10b981" />
                <Bar dataKey="outOfStock" name="Out of Stock" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-md border">
              <div className="flex items-center justify-between border-b bg-emerald-50 px-3 py-2 dark:bg-emerald-900/20">
                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">In Stock — Push to sell</div>
                <ExportBtn onClick={exportInStock} />
              </div>
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Part</th>
                    <th className="px-3 py-2 text-right">Stock</th>
                    <th className="px-3 py-2 text-right">Enq</th>
                    <th className="px-3 py-2 text-right">Views</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.inStock.map((r) => (
                    <tr key={r.key}>
                      <td className="px-3 py-2">
                        <div className="font-mono text-[11px]">{r.part_number}</div>
                        <div className="text-[11px] text-muted-foreground">{r.name}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{r.stock ?? 0}</td>
                      <td className="px-3 py-2 text-right font-mono">{r.enquiry}</td>
                      <td className="px-3 py-2 text-right font-mono">{r.views}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold">{r.total}</td>
                    </tr>
                  ))}
                  {!data.inStock.length && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-xs text-muted-foreground">No data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="overflow-hidden rounded-md border">
              <div className="flex items-center justify-between border-b bg-red-50 px-3 py-2 dark:bg-red-900/20">
                <div className="text-xs font-semibold text-red-700 dark:text-red-300">Not In Stock — Consider stocking</div>
                <ExportBtn onClick={exportOut} />
              </div>
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Part / Query</th>
                    <th className="px-3 py-2 text-right">Enq</th>
                    <th className="px-3 py-2 text-right">Searches</th>
                    <th className="px-3 py-2 text-right">Est. Lost</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.outOfStock.map((r) => (
                    <tr key={r.key}>
                      <td className="px-3 py-2">
                        <div className="font-mono text-[11px]">{r.part_number}</div>
                        <div className="text-[11px] text-muted-foreground">{r.name}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{r.enquiry}</td>
                      <td className="px-3 py-2 text-right font-mono">{r.searches}</td>
                      <td className="px-3 py-2 text-right font-mono text-red-600">
                        {r.estLostRevenue == null ? "—" : formatAEDCompact(r.estLostRevenue)}
                      </td>
                    </tr>
                  ))}
                  {!data.outOfStock.length && (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-xs text-muted-foreground">No data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Section>
  );
}

/* ============================================================ */
/* 10. Client Enquiry vs Sales ================================ */
/* ============================================================ */

function ClientEnquiryVsSalesSection() {
  const [days, setDays] = useState(30);
  const [type, setType] = useState("all");
  const range = useMemo(() => daysAgo(days), [days]);
  const { data, isLoading } = useQuery({
    queryKey: ["report-client-evs", range, type],
    queryFn: () => reportClientEnquiryVsSales({ data: { ...range, customerType: type } }),
  });
  const exportRows = () => {
    if (!data) return;
    downloadCsv("client-enquiry-vs-sales.csv",
      ["Client", "Type", "Enquiries", "Enq Value", "Orders", "Sales Value", "Count Conv %", "Value Conv %", "Gap"],
      data.rows.map((r) => [
        r.full_name, r.customer_type ?? "", r.enquiries, r.enquiryValue.toFixed(2),
        r.orders, r.salesValue.toFixed(2), r.countConversion.toFixed(1), r.valueConversion.toFixed(1), r.gap.toFixed(2),
      ]));
  };
  return (
    <Section
      title="Client-wise Enquiry vs Sales"
      icon={GitCompareArrows}
      action={
        <>
          <TypeSelect value={type} onChange={setType} />
          <RangeSelect value={days} onChange={setDays} />
          <ExportBtn onClick={exportRows} />
        </>
      }
    >
      {isLoading || !data ? (
        <div className="h-56 animate-pulse rounded-md bg-surface-2" />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            <Kpi label="Clients enquired" value={data.totals.enquiredClients.toLocaleString()} />
            <Kpi label="Clients purchased" value={data.totals.purchasedClients.toLocaleString()} />
            <Kpi label="Overall conversion" value={`${data.totals.overallConversion.toFixed(1)}%`} />
            <Kpi label="Revenue gap" value={formatAEDCompact(data.totals.revenueGap)} />
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Client</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-right">Enquiries</th>
                  <th className="px-3 py-2 text-right">Enq Value</th>
                  <th className="px-3 py-2 text-right">Orders</th>
                  <th className="px-3 py-2 text-right">Sales</th>
                  <th className="px-3 py-2 text-right">Count %</th>
                  <th className="px-3 py-2 text-right">Value %</th>
                  <th className="px-3 py-2 text-right">Gap</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.rows.slice(0, 100).map((r) => (
                  <tr key={r.customer_id}>
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.full_name}</div>
                      <div className="text-[11px] text-muted-foreground">{r.company_name ?? ""}</div>
                    </td>
                    <td className="px-3 py-2"><CustomerTypeBadge type={r.customer_type as any} showLabel={false} /></td>
                    <td className="px-3 py-2 text-right font-mono">{r.enquiries}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatAEDCompact(r.enquiryValue)}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.orders}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatAEDCompact(r.salesValue)}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.countConversion.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right font-mono">{r.valueConversion.toFixed(1)}%</td>
                    <td className={`px-3 py-2 text-right font-mono ${r.gap > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {formatAEDCompact(r.gap)}
                    </td>
                  </tr>
                ))}
                {!data.rows.length && (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-xs text-muted-foreground">No data.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  );
}

/* ============================================================ */
/* 11. Total Enquiry vs Sales ================================= */
/* ============================================================ */

function TotalEnquiryVsSalesSection() {
  const [days, setDays] = useState(90);
  const range = useMemo(() => daysAgo(days), [days]);
  const granularity: "day" | "week" | "month" = days <= 30 ? "day" : days <= 90 ? "week" : "month";
  const { data, isLoading } = useQuery({
    queryKey: ["report-total-evs", range, granularity],
    queryFn: () => reportTotalEnquiryVsSales({ data: { ...range, granularity } }),
  });
  const exportRows = () => {
    if (!data) return;
    downloadCsv("total-enquiry-vs-sales.csv",
      ["Period", "Enquiries", "Enq Value", "Orders", "Sales Value", "Conversion %", "Gap"],
      data.series.map((r) => [r.period, r.enqCount, r.enqValue.toFixed(2), r.salesCount, r.salesValue.toFixed(2), r.conversion.toFixed(1), r.gap.toFixed(2)]));
  };
  return (
    <Section
      title="Total Enquiry vs Total Sales"
      icon={Activity}
      action={<><RangeSelect value={days} onChange={setDays} /><ExportBtn onClick={exportRows} /></>}
    >
      {isLoading || !data ? (
        <div className="h-64 animate-pulse rounded-md bg-surface-2" />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            <Kpi label="Enquiries" value={data.totals.enqCount.toLocaleString()} sub={formatAEDCompact(data.totals.enqValue)} />
            <Kpi label="Sales" value={data.totals.salesCount.toLocaleString()} sub={formatAEDCompact(data.totals.salesValue)} />
            <Kpi label="Overall conversion" value={`${data.totals.overallConversion.toFixed(1)}%`} />
            <Kpi label="Revenue gap" value={formatAEDCompact(data.totals.enqValue - data.totals.salesValue)} />
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <LineChart data={data.series}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => formatAEDCompact(v)} width={80} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} width={50} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="enqValue" name="Enquiry Value" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="salesValue" name="Sales Value" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="conversion" name="Conversion %" stroke="#2563eb" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Period</th>
                  <th className="px-3 py-2 text-right">Enq #</th>
                  <th className="px-3 py-2 text-right">Enq Value</th>
                  <th className="px-3 py-2 text-right">Sales #</th>
                  <th className="px-3 py-2 text-right">Sales Value</th>
                  <th className="px-3 py-2 text-right">Conv %</th>
                  <th className="px-3 py-2 text-right">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.series.map((r) => (
                  <tr key={r.period}>
                    <td className="px-3 py-2 text-muted-foreground">{r.period}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.enqCount}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatAEDCompact(r.enqValue)}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.salesCount}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatAEDCompact(r.salesValue)}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.conversion.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right">
                      {r.trend === "up" ? <ArrowUp className="inline h-3 w-3 text-emerald-600" /> :
                        r.trend === "down" ? <ArrowDown className="inline h-3 w-3 text-red-600" /> :
                        <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
                {!data.series.length && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-xs text-muted-foreground">No data in range.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  );
}

/* ============================================================ */
/* 12. Sales Rep Performance ================================== */
/* ============================================================ */

function SalesRepPerformanceSection() {
  const [days, setDays] = useState(30);
  const range = useMemo(() => daysAgo(days), [days]);
  const { data, isLoading } = useQuery({
    queryKey: ["report-sales-rep", range],
    queryFn: () => reportSalesRepPerformance({ data: range }),
  });
  const exportRows = () => {
    if (!data) return;
    downloadCsv("sales-rep-performance.csv",
      ["Name", "Email", "Assigned Clients", "Enquiries", "Enquiry Value", "Orders Closed", "Sales Value", "Conversion %", "Avg Deal", "Stars"],
      data.rows.map((r) => [
        r.full_name, r.email, r.assignedClients, r.enquiriesCreated, r.enquiryValue.toFixed(2),
        r.ordersClosed, r.salesValue.toFixed(2), r.conversion.toFixed(1), r.avgDealSize.toFixed(2), r.stars,
      ]));
  };
  return (
    <Section
      title="Sales Rep Performance"
      icon={Award}
      action={<><RangeSelect value={days} onChange={setDays} /><ExportBtn onClick={exportRows} /></>}
    >
      {isLoading || !data ? (
        <div className="h-56 animate-pulse rounded-md bg-surface-2" />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Kpi label="Active reps" value={data.totals.activeReps.toLocaleString()} />
            <Kpi label="Team revenue" value={formatAEDCompact(data.totals.teamRevenue)} />
            <Kpi
              label="Top converter"
              value={data.totals.bestConverter?.full_name ?? "—"}
              sub={data.totals.bestConverter ? `${data.totals.bestConverter.conversion.toFixed(1)}% conversion` : ""}
            />
          </div>
          <div className="mb-6 h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={data.rows.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="full_name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatAEDCompact(v)} width={80} />
                <Tooltip formatter={(v: any) => formatAEDCompact(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="enquiryValue" name="Enquiry Value" fill="#f59e0b" />
                <Bar dataKey="salesValue" name="Sales Value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Rep</th>
                  <th className="px-3 py-2 text-right">Assigned</th>
                  <th className="px-3 py-2 text-right">Enquiries</th>
                  <th className="px-3 py-2 text-right">Enq Value</th>
                  <th className="px-3 py-2 text-right">Orders</th>
                  <th className="px-3 py-2 text-right">Sales</th>
                  <th className="px-3 py-2 text-right">Conv %</th>
                  <th className="px-3 py-2 text-right">Avg Deal</th>
                  <th className="px-3 py-2 text-left">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.full_name}</div>
                      <div className="text-[11px] text-muted-foreground">{r.email}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{r.assignedClients}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.enquiriesCreated}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatAEDCompact(r.enquiryValue)}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.ordersClosed}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatAEDCompact(r.salesValue)}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.conversion.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right font-mono">{formatAEDCompact(r.avgDealSize)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < r.stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {!data.rows.length && (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-xs text-muted-foreground">No reps to show.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  );
}

/* ============================================================ */
/* Wrapper ==================================================== */
/* ============================================================ */

export function ClientAnalytics() {
  return (
    <div className="mt-10 border-t pt-8">
      <h2 className="mb-6 text-lg font-bold">Client & Sales Rep Analytics</h2>
      <ClientSalesSection />
      <ClientEnquirySection />
      <MostInquiredSection />
      <ClientEnquiryVsSalesSection />
      <TotalEnquiryVsSalesSection />
      <SalesRepPerformanceSection />
    </div>
  );
}
