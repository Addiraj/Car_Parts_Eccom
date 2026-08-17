import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  adminListQuotations,
  adminQuotationStats,
  adminDeleteQuotation,
  adminDuplicateQuotation,
} from "@/lib/admin.quotations.functions";
import { Button } from "@/components/ui/button";
import { FileText, Eye, Copy, Trash2, Plus, Download } from "lucide-react";
import Papa from "papaparse";
import { NewQuotationDialog } from "@/components/admin/new-quotation-dialog";

export const Route = createFileRoute("/_authenticated/admin/quotations")({
  head: () => ({ meta: [{ title: "Admin · Quotations" }] }),
  component: AdminQuotations,
});

const STATUSES = ["ALL", "draft", "sent", "approved", "rejected", "expired", "converted"] as const;

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-200 text-zinc-700",
  sent: "bg-blue-100 text-blue-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-destructive/15 text-destructive",
  expired: "bg-amber-100 text-amber-800",
  converted: "bg-violet-100 text-violet-800",
};

function AdminQuotations() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(adminListQuotations);
  const stats = useServerFn(adminQuotationStats);
  const del = useServerFn(adminDeleteQuotation);
  const dup = useServerFn(adminDuplicateQuotation);

  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [newOpen, setNewOpen] = useState(false);

  const filters = { page, pageSize: 25, q: q || undefined, status, from: from || undefined, to: to || undefined };
  const items = useQuery({ queryKey: ["admin-quotations", filters], queryFn: () => list({ data: filters as any }) });
  const st = useQuery({ queryKey: ["admin-quotation-stats"], queryFn: () => stats() });

  const data = items.data ?? { items: [], total: 0, pageSize: 25 };
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const s = st.data ?? { total: 0, approved: 0, rejected: 0, pending: 0, converted: 0, conversionRate: 0, totalValue: 0 };

  const cards = [
    { label: "Total Quotations", value: s.total.toLocaleString() },
    { label: "Pending", value: s.pending.toLocaleString() },
    { label: "Approved", value: s.approved.toLocaleString() },
    { label: "Rejected", value: s.rejected.toLocaleString() },
    { label: "Converted", value: s.converted.toLocaleString() },
    { label: "Conversion Rate", value: `${s.conversionRate}%` },
  ];

  const exportCsv = () => {
    const rows = (data.items as any[]).map((it) => ({
      number: it.quotation_number,
      status: it.status,
      customer: (it.customer_snapshot as any)?.full_name ?? "",
      total: it.grand_total,
      currency: it.currency,
      valid_until: it.valid_until,
      created_at: it.created_at,
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "quotations.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const onDuplicate = async (id: string) => {
    const r = await dup({ data: { id } });
    qc.invalidateQueries({ queryKey: ["admin-quotations"] });
    navigate({ to: "/admin/quotations/$id", params: { id: r.id } });
  };
  const onDelete = async (id: string) => {
    if (!confirm("Delete this quotation?")) return;
    await del({ data: { id } });
    qc.invalidateQueries({ queryKey: ["admin-quotations"] });
    qc.invalidateQueries({ queryKey: ["admin-quotation-stats"] });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" /> Quotations</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" /> Export</Button>
          <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Quotation</Button>
        </div>
      </header>
      <NewQuotationDialog open={newOpen} onOpenChange={setNewOpen} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border bg-surface p-3">
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className="text-xl font-bold">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-surface p-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <input className="input" placeholder="Search by quotation #" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="input" value={status} onChange={(e) => { setStatus(e.target.value as any); setPage(1); }}>
          {STATUSES.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
        </select>
        <input type="date" className="input" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        <input type="date" className="input" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        <Button variant="outline" onClick={() => { setQ(""); setStatus("ALL"); setFrom(""); setTo(""); setPage(1); }}>Clear</Button>
      </div>

      <div className="rounded-lg border bg-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="text-left py-2 px-3">Quotation #</th>
              <th className="text-left py-2 px-3">Customer</th>
              <th className="text-left py-2 px-3">Status</th>
              <th className="text-right py-2 px-3">Total</th>
              <th className="text-left py-2 px-3">Valid Until</th>
              <th className="text-left py-2 px-3">Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.isLoading && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!items.isLoading && data.items.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No quotations found.</td></tr>
            )}
            {(data.items as any[]).map((it) => (
              <tr key={it.id} className="border-b hover:bg-muted/30">
                <td className="py-2 px-3 font-mono text-xs">{it.quotation_number}</td>
                <td className="py-2 px-3">{(it.customer_snapshot as any)?.full_name ?? "—"}</td>
                <td className="py-2 px-3">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs ${STATUS_COLORS[it.status]}`}>
                    {it.status}
                  </span>
                </td>
                <td className="py-2 px-3 text-right tabular-nums">{it.currency} {Number(it.grand_total).toFixed(2)}</td>
                <td className="py-2 px-3 text-xs">{it.valid_until ? new Date(it.valid_until).toLocaleDateString() : "—"}</td>
                <td className="py-2 px-3 text-xs">{new Date(it.created_at).toLocaleDateString()}</td>
                <td className="py-2 px-3 text-right whitespace-nowrap">
                  <Button asChild variant="ghost" size="sm" title="View">
                    <Link to="/admin/quotations/$id" params={{ id: it.id }}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm" title="Download PDF">
                    <a href={`/api/public/quotations/${it.share_token}/pdf`} target="_blank" rel="noreferrer" download>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" title="Duplicate" onClick={() => onDuplicate(it.id)}><Copy className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" title="Delete" onClick={() => onDelete(it.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col justify-center items-center gap-2">
        <div className="text-xs text-muted-foreground">Page {page} of {pages} · {data.total} total</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
