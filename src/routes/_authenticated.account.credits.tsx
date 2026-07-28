import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getMyWallet, getMyTransactions, getMyStatements } from "@/lib/credit.functions";
import { formatAED } from "@/lib/format";
import { Wallet, Search, Lock, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/account/credits")({
  head: () => ({ meta: [{ title: "My Credits — Car Parts Dubai" }] }),
  component: MyCredits,
});

function MyCredits() {
  const { data: wallet, isLoading } = useQuery({ queryKey: ["my-wallet"], queryFn: () => getMyWallet() });
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const PAGE = 15;
  const { data: tx } = useQuery({
    queryKey: ["my-tx", page, search],
    queryFn: () => getMyTransactions({ data: { limit: PAGE, offset: page * PAGE, search } }),
    enabled: !!wallet,
  });
  const { data: statements = [] } = useQuery({
    queryKey: ["my-statements"], queryFn: () => getMyStatements(), enabled: !!wallet,
  });

  if (isLoading) return <div className="mx-auto max-w-5xl p-8 text-sm text-muted-foreground">Loading…</div>;

  if (!wallet) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-bold">No Credit Wallet</h1>
        <p className="mt-2 text-muted-foreground">
          You don't have a credit wallet yet. Contact our sales team to set up a credit account.
        </p>
        <Link to="/contact" className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Contact Sales</Link>
      </div>
    );
  }

  const w = wallet as any;
  const outstanding = Math.max(0, Number(w.credit_limit) - Number(w.available_balance));
  const utilPct = Number(w.credit_limit) > 0 ? Math.round((outstanding / Number(w.credit_limit)) * 100) : 0;
  const suspended = !w.is_active;
  const frozen = suspended && w.freeze_reason;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Wallet className="h-7 w-7 text-primary" /> My Credits</h1>

      {suspended && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-200">
          <div className="flex items-center gap-2 font-semibold"><Lock className="h-4 w-4" /> Wallet {frozen ? "Frozen" : "Suspended"}</div>
          <p className="mt-1 text-sm">{w.freeze_reason || "Your credit wallet is currently suspended. Please contact support."}</p>
        </div>
      )}

      {/* Balance card */}
      <div className="rounded-2xl border p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-indigo-950 dark:to-blue-950">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Available Credits</div>
        <div className="mt-2 text-5xl font-black tracking-tight text-indigo-700 dark:text-indigo-200">{formatAED(Number(w.available_balance))}</div>
        <div className="mt-1 text-xs text-muted-foreground">Credit Limit: {formatAED(Number(w.credit_limit))} · Excl. VAT</div>
        <div className="mt-4 h-2 w-full rounded-full bg-white/50 dark:bg-white/10 overflow-hidden">
          <div className="h-full bg-indigo-600 dark:bg-indigo-400" style={{ width: `${100 - utilPct}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span>Used {formatAED(outstanding)} ({utilPct}%)</span>
          <span>{formatAED(Number(w.available_balance))} available</span>
        </div>
      </div>

      {/* Transactions */}
      <section className="rounded-lg border bg-surface">
        <div className="flex items-center justify-between gap-2 border-b p-4">
          <h2 className="text-sm font-semibold">Transaction History</h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search remarks/reason…"
              className="rounded border bg-surface-2 py-1.5 pl-7 pr-2 text-xs outline-none focus:border-primary" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-left">Remarks</th>
                <th className="p-3 text-left">Reason</th>
              </tr>
            </thead>
            <tbody>
              {(tx?.rows ?? []).map((r: any) => (
                <tr key={r.id} className={`border-t ${r.type === "credit" ? "bg-green-50/60 dark:bg-green-900/20" : "bg-red-50/60 dark:bg-red-900/20"}`}>
                  <td className="p-3 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3"><TypeBadge type={r.type} /></td>
                  <td className={`p-3 text-right font-mono font-semibold ${r.type === "credit" ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                    {r.type === "credit" ? "+" : "−"}{formatAED(Number(r.amount))}
                  </td>
                  <td className="p-3 text-xs">{r.remarks ?? "—"}</td>
                  <td className="p-3 text-xs">{r.reason ?? "—"}</td>
                </tr>
              ))}
              {!tx?.rows?.length && <tr><td colSpan={5} className="p-10 text-center text-xs text-muted-foreground">No transactions yet.</td></tr>}
            </tbody>
          </table>
        </div>
        {tx && tx.count > PAGE && (
          <div className="flex items-center justify-between border-t p-3 text-xs">
            <span>Page {page + 1} of {Math.ceil(tx.count / PAGE)}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                className="rounded border px-2 py-1 disabled:opacity-50">Prev</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * PAGE >= tx.count}
                className="rounded border px-2 py-1 disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </section>

      {/* Statements */}
      <section className="rounded-lg border bg-surface">
        <div className="border-b p-4"><h2 className="text-sm font-semibold">My Statements</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Statement #</th>
                <th className="p-3 text-left">Period</th>
                <th className="p-3 text-right">Amount Due</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {statements.map((s: any) => {
                const isOverdue = s.status !== "paid" && new Date(s.due_date) < new Date();
                return (
                  <tr key={s.id} className="border-t">
                    <td className="p-3 font-mono text-xs">{s.statement_number}</td>
                    <td className="p-3 text-xs">{s.period_start} → {s.period_end}</td>
                    <td className="p-3 text-right font-mono">{formatAED(Number(s.outstanding_amount) - Number(s.amount_paid))}</td>
                    <td className="p-3"><StatusBadge status={s.status} overdue={isOverdue} /></td>
                    <td className={`p-3 text-xs ${isOverdue ? "font-semibold text-red-600" : ""}`}>{s.due_date}{isOverdue && <AlertTriangle className="inline ms-1 h-3 w-3" />}</td>
                  </tr>
                );
              })}
              {!statements.length && <tr><td colSpan={5} className="p-10 text-center text-xs text-muted-foreground">No statements yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  return type === "credit"
    ? <span className="rounded bg-green-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700 dark:text-green-300">credit</span>
    : <span className="rounded bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700 dark:text-red-300">debit</span>;
}
function StatusBadge({ status, overdue }: { status: string; overdue: boolean }) {
  if (overdue && status !== "paid") return <span className="rounded bg-red-600/20 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700 dark:text-red-300 animate-pulse">Overdue</span>;
  const map: Record<string, string> = {
    unpaid: "bg-red-500/10 text-red-700 dark:text-red-300",
    partially_paid: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    paid: "bg-green-500/10 text-green-700 dark:text-green-300",
  };
  return <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${map[status] ?? map.unpaid}`}>{status.replace("_", " ")}</span>;
}
