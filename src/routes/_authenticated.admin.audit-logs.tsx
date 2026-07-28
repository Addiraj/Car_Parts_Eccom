import { createFileRoute } from "@tanstack/react-router";
import { Fragment } from "react";
const FragmentRow = Fragment;
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { adminListAuditLogs } from "@/lib/customer-crm.functions";
import { FileText, Filter, ChevronDown, ChevronRight, Copy, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Logs — Admin" }] }),
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", entityType, action, q, from, to, page, perPage],
    queryFn: () => adminListAuditLogs({ data: {
      entity_type: entityType || undefined,
      action: action || undefined,
      q: q || undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(new Date(to).getTime() + 86400000 - 1).toISOString() : undefined,
      page, per_page: perPage,
    } }),
  });

  const rows: any[] = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));

  const toggle = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5" /><h1 className="text-2xl font-bold">Audit Logs</h1>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-surface p-3 text-sm">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <label className="text-xs flex-1 min-w-[200px]">
          <span className="mb-1 block font-medium text-muted-foreground">Search</span>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input className="input w-full pl-7" placeholder="action, email, entity id…"
              value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
        </label>
        <label className="text-xs"><span className="mb-1 block font-medium text-muted-foreground">Entity</span>
          <select className="input" value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="order">Order</option>
            <option value="quotation">Quotation</option>
            <option value="customer">Customer</option>
            <option value="part">Part</option>
            <option value="user">User</option>
            <option value="salesman">Salesman</option>
          </select>
        </label>
        <label className="text-xs"><span className="mb-1 block font-medium text-muted-foreground">Action</span>
          <input className="input" placeholder="e.g. update" value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }} />
        </label>
        <label className="text-xs"><span className="mb-1 block font-medium text-muted-foreground">From</span>
          <input type="date" className="input" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></label>
        <label className="text-xs"><span className="mb-1 block font-medium text-muted-foreground">To</span>
          <input type="date" className="input" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></label>
        <label className="text-xs"><span className="mb-1 block font-medium text-muted-foreground">Per page</span>
          <select className="input" value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}>
            <option value={25}>25</option><option value={50}>50</option><option value={100}>100</option><option value={200}>200</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b bg-surface-2 text-left text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="w-8 px-2 py-2"></th>
              <th className="px-3 py-2 font-bold">When</th>
              <th className="px-3 py-2 font-bold">Actor</th>
              <th className="px-3 py-2 font-bold">Action</th>
              <th className="px-3 py-2 font-bold">Entity</th>
              <th className="px-3 py-2 font-bold">Details</th>
              <th className="px-3 py-2 font-bold">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr> : rows.map((r) => {
              const isOpen = expanded.has(r.id);
              return (
                <FragmentRow key={r.id}>
                  <tr className="align-top hover:bg-surface-2/50 cursor-pointer" onClick={() => toggle(r.id)}>
                    <td className="px-2 py-2">
                      {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 text-xs">
                      <div>{r.actor_email ?? r.actor_id?.slice(0, 8) ?? "system"}</div>
                      {r.actor_email && r.actor_id && <div className="text-[10px] text-muted-foreground font-mono">{r.actor_id.slice(0, 8)}</div>}
                    </td>
                    <td className="px-3 py-2 text-xs font-semibold">{r.action}</td>
                    <td className="px-3 py-2 text-xs">
                      <span className="font-mono">{r.entity_type ?? "—"}</span>
                      {r.entity_id && <span className="ml-1 text-muted-foreground">#{String(r.entity_id).slice(0, 8)}</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{summarize(r)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.ip ?? "—"}</td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-surface-2/30">
                      <td colSpan={7} className="px-4 py-4">
                        <LogDetail row={r} />
                      </td>
                    </tr>
                  )}
                </FragmentRow>
              );
            })}
            {!isLoading && !rows.length && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No logs match these filters.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
        <span>{total.toLocaleString()} entries</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border px-2 py-1 disabled:opacity-40">Prev</button>
          <span className="px-2 py-1">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded border px-2 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}

function summarize(r: any): string {
  const b = r.before, a = r.after;
  if (!b && a) return "created";
  if (b && !a) return "deleted";
  if (b && a) {
    const keys = new Set([...Object.keys(b || {}), ...Object.keys(a || {})]);
    let changed = 0;
    keys.forEach((k) => { if (JSON.stringify(b?.[k]) !== JSON.stringify(a?.[k])) changed++; });
    return `${changed} field${changed === 1 ? "" : "s"} changed`;
  }
  return "—";
}

function LogDetail({ row }: { row: any }) {
  const b = row.before, a = row.after;
  const diff = useMemo(() => {
    const keys = Array.from(new Set([...Object.keys(b || {}), ...Object.keys(a || {})]));
    return keys
      .map((k) => ({ k, before: b?.[k], after: a?.[k] }))
      .filter((d) => JSON.stringify(d.before) !== JSON.stringify(d.after));
  }, [b, a]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(row, null, 2)); toast.success("Copied JSON"); }
    catch { toast.error("Copy failed"); }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-xs">
        <div><span className="font-semibold text-muted-foreground">Actor email:</span> {row.actor_email ?? "—"}</div>
        <div><span className="font-semibold text-muted-foreground">Actor ID:</span> <span className="font-mono">{row.actor_id ?? "—"}</span></div>
        <div><span className="font-semibold text-muted-foreground">Entity ID:</span> <span className="font-mono">{row.entity_id ?? "—"}</span></div>
        <div><span className="font-semibold text-muted-foreground">Customer ID:</span> <span className="font-mono">{row.customer_id ?? "—"}</span></div>
        <div><span className="font-semibold text-muted-foreground">IP:</span> {row.ip ?? "—"}</div>
        <div className="md:col-span-2 truncate"><span className="font-semibold text-muted-foreground">User agent:</span> {row.user_agent ?? "—"}</div>
      </div>

      {!b && !a && <div className="text-xs text-muted-foreground italic">No before/after payload recorded for this event.</div>}

      {(b || a) && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <JsonPane title="Before" data={b} />
          <JsonPane title="After" data={a} />
        </div>
      )}

      {diff.length > 0 && (
        <div className="rounded border bg-surface p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Changed fields</div>
          <div className="space-y-1 text-xs font-mono">
            {diff.map((d) => (
              <div key={d.k} className="flex flex-wrap items-start gap-2">
                <span className="font-semibold">{d.k}:</span>
                <span className="text-rose-600 line-through">{fmt(d.before)}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-emerald-600">{fmt(d.after)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={copy} className="inline-flex items-center gap-1.5 rounded border bg-surface px-2 py-1 text-xs hover:bg-surface-2">
        <Copy className="h-3 w-3" /> Copy full JSON
      </button>
    </div>
  );
}

function JsonPane({ title, data }: { title: string; data: any }) {
  return (
    <div className="rounded border bg-surface">
      <div className="border-b px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</div>
      <pre className="max-h-72 overflow-auto p-3 text-[11px] leading-relaxed">{data ? JSON.stringify(data, null, 2) : <span className="text-muted-foreground italic">—</span>}</pre>
    </div>
  );
}

function fmt(v: any): string {
  if (v === undefined) return "∅";
  if (v === null) return "null";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
