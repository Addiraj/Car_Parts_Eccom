import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminGetWallet, adminActivateWallet, adminUpdateLimit, adminAddCredit,
  adminToggleActive, adminForceUnfreeze, adminListTransactions, adminListStatements,
  adminGenerateStatement, adminRecordPayment,
} from "@/lib/credit.functions";
import { formatAED } from "@/lib/format";
import { Wallet, Plus, Lock, Unlock, TrendingUp, TrendingDown, DollarSign, FileText, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

export function CreditWalletTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: wallet, isLoading } = useQuery({
    queryKey: ["admin-wallet", userId],
    queryFn: () => adminGetWallet({ data: { userId } }),
  });

  const [openLimit, setOpenLimit] = useState(false);
  const [openCredit, setOpenCredit] = useState(false);
  const [openPayment, setOpenPayment] = useState(false);
  const [openStatement, setOpenStatement] = useState(false);
  const [openActivate, setOpenActivate] = useState(false);

  const toggleMut = useMutation({
    mutationFn: () => adminToggleActive({ data: { walletId: (wallet as any).id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-wallet", userId] }); toast.success("Updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const unfreezeMut = useMutation({
    mutationFn: (reason: string) => adminForceUnfreeze({ data: { walletId: (wallet as any).id, reason } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-wallet", userId] }); toast.success("Wallet unfrozen"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading wallet…</div>;

  if (!wallet) {
    return (
      <div className="p-6 text-center">
        <Wallet className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">No credit wallet activated for this customer.</p>
        <button onClick={() => setOpenActivate(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Activate Credit Wallet
        </button>
        {openActivate && <ActivateDialog userId={userId} onClose={() => setOpenActivate(false)} />}
      </div>
    );
  }

  const w = wallet as any;
  const used = Number(w.credit_limit) - Number(w.available_balance);
  const utilPct = Number(w.credit_limit) > 0 ? Math.round((used / Number(w.credit_limit)) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 bg-gradient-to-br from-blue-50/60 to-indigo-50/60 dark:from-indigo-950/40 dark:to-blue-950/40">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Credit Wallet</div>
            <div className="mt-2 grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Credit Limit</div>
                <div className="text-lg font-bold">{formatAED(Number(w.credit_limit))}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Available</div>
                <div className="text-lg font-bold text-green-700 dark:text-green-300">{formatAED(Number(w.available_balance))}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Outstanding</div>
                <div className="text-lg font-bold text-red-700 dark:text-red-300">{formatAED(used)}</div>
              </div>
            </div>
            <div className="mt-3 h-2 w-full max-w-md rounded-full bg-white/50 dark:bg-white/10 overflow-hidden">
              <div className={`h-full ${utilPct > 80 ? "bg-red-500" : utilPct > 50 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${utilPct}%` }} />
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">Utilization: {utilPct}% · Terms: NET {w.payment_terms_days} days</div>
          </div>
          <div>
            {w.is_active
              ? <span className="rounded bg-green-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700 dark:text-green-300">Active</span>
              : <span className="rounded bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700 dark:text-red-300 animate-pulse">Frozen</span>}
            {!w.is_active && w.freeze_reason && <div className="mt-1 max-w-[200px] text-[10px] text-red-600">{w.freeze_reason}</div>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setOpenLimit(true)} className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-xs hover:bg-muted"><TrendingUp className="h-3.5 w-3.5" /> Update Limit</button>
        <button onClick={() => setOpenCredit(true)} className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-xs hover:bg-muted"><Plus className="h-3.5 w-3.5" /> Add Credit</button>
        <button onClick={() => setOpenPayment(true)} className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-xs hover:bg-muted"><DollarSign className="h-3.5 w-3.5" /> Record Payment</button>
        <button onClick={() => setOpenStatement(true)} className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-xs hover:bg-muted"><FileText className="h-3.5 w-3.5" /> Generate Statement</button>
        <button onClick={() => toggleMut.mutate()} className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-xs hover:bg-muted">
          {w.is_active ? <><Lock className="h-3.5 w-3.5" /> Suspend</> : <><Unlock className="h-3.5 w-3.5" /> Activate</>}
        </button>
        {!w.is_active && (
          <button onClick={() => { const r = prompt("Reason to force unfreeze:"); if (r) unfreezeMut.mutate(r); }}
            className="inline-flex items-center gap-1 rounded border border-amber-500 px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950">
            <RefreshCcw className="h-3.5 w-3.5" /> Force Unfreeze
          </button>
        )}
      </div>

      <TransactionsList walletId={w.id} />
      <StatementsList walletId={w.id} />

      {openLimit && <UpdateLimitDialog wallet={w} onClose={() => setOpenLimit(false)} />}
      {openCredit && <AddCreditDialog wallet={w} onClose={() => setOpenCredit(false)} />}
      {openPayment && <RecordPaymentDialog wallet={w} onClose={() => setOpenPayment(false)} />}
      {openStatement && <GenerateStatementDialog wallet={w} onClose={() => setOpenStatement(false)} />}
    </div>
  );
}

/* ------------------------------------- */

function ActivateDialog({ userId, onClose }: { userId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [limit, setLimit] = useState(10000);
  const [terms, setTerms] = useState(30);
  const [notes, setNotes] = useState("");
  const mut = useMutation({
    mutationFn: () => adminActivateWallet({ data: { userId, credit_limit: limit, payment_terms_days: terms, notes } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-wallet", userId] });
      toast.success("Wallet activated");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Modal title="Activate Credit Wallet" onClose={onClose}>
      <Field label="Credit Limit (AED)"><input type="number" value={limit} min={0} onChange={(e) => setLimit(Number(e.target.value))} className={inp} /></Field>
      <Field label="Payment Terms (days)"><input type="number" value={terms} min={0} max={365} onChange={(e) => setTerms(Number(e.target.value))} className={inp} /></Field>
      <Field label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inp} /></Field>
      <SubmitRow onCancel={onClose} onSubmit={() => mut.mutate()} loading={mut.isPending} label="Activate" />
    </Modal>
  );
}

function UpdateLimitDialog({ wallet, onClose }: { wallet: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [limit, setLimit] = useState(Number(wallet.credit_limit));
  const [reset, setReset] = useState(false);
  const [reason, setReason] = useState("");
  const mut = useMutation({
    mutationFn: () => adminUpdateLimit({ data: { walletId: wallet.id, new_limit: limit, reset_balance: reset, reason } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-wallet", wallet.user_id] }); toast.success("Limit updated"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Modal title="Update Credit Limit" onClose={onClose}>
      <Field label="New Credit Limit (AED)"><input type="number" value={limit} min={0} onChange={(e) => setLimit(Number(e.target.value))} className={inp} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reset} onChange={(e) => setReset(e.target.checked)} /> Reset available balance to (limit − used)</label>
      <Field label="Reason (required)"><input value={reason} onChange={(e) => setReason(e.target.value)} className={inp} /></Field>
      <SubmitRow onCancel={onClose} onSubmit={() => mut.mutate()} loading={mut.isPending} label="Update" disabled={!reason.trim()} />
    </Modal>
  );
}

function AddCreditDialog({ wallet, onClose }: { wallet: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [uncap, setUncap] = useState(false);
  const mut = useMutation({
    mutationFn: () => adminAddCredit({ data: { walletId: wallet.id, amount, reason, notes, uncap } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-wallet", wallet.user_id] }); toast.success("Credit added"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Modal title="Add Credit (Manual Top-Up)" onClose={onClose}>
      <Field label="Amount (AED)"><input type="number" value={amount} min={0} onChange={(e) => setAmount(Number(e.target.value))} className={inp} /></Field>
      <Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Promotional credit, adjustment…" className={inp} /></Field>
      <Field label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inp} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={uncap} onChange={(e) => setUncap(e.target.checked)} /> Allow exceeding credit limit</label>
      <SubmitRow onCancel={onClose} onSubmit={() => mut.mutate()} loading={mut.isPending} label="Add Credit" disabled={amount <= 0 || !reason.trim()} />
    </Modal>
  );
}

function RecordPaymentDialog({ wallet, onClose }: { wallet: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<"bank_transfer" | "cash" | "cheque" | "card" | "other">("bank_transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const mut = useMutation({
    mutationFn: () => adminRecordPayment({ data: { walletId: wallet.id, amount, method, reference, notes } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-wallet", wallet.user_id] }); toast.success("Payment recorded"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Modal title="Record Payment" onClose={onClose}>
      <Field label="Amount (AED)"><input type="number" value={amount} min={0} onChange={(e) => setAmount(Number(e.target.value))} className={inp} /></Field>
      <Field label="Method">
        <select value={method} onChange={(e) => setMethod(e.target.value as any)} className={inp}>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cash">Cash</option>
          <option value="cheque">Cheque</option>
          <option value="card">Card</option>
          <option value="other">Other</option>
        </select>
      </Field>
      <Field label="Reference / Cheque #"><input value={reference} onChange={(e) => setReference(e.target.value)} className={inp} /></Field>
      <Field label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inp} /></Field>
      <SubmitRow onCancel={onClose} onSubmit={() => mut.mutate()} loading={mut.isPending} label="Record" disabled={amount <= 0} />
    </Modal>
  );
}

function GenerateStatementDialog({ wallet, onClose }: { wallet: any; onClose: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(); monthStart.setDate(1);
  const [start, setStart] = useState(monthStart.toISOString().slice(0, 10));
  const [end, setEnd] = useState(today);
  const [terms, setTerms] = useState(Number(wallet.payment_terms_days) || 30);
  const mut = useMutation({
    mutationFn: () => adminGenerateStatement({ data: { walletId: wallet.id, period_start: start, period_end: end, terms_days: terms } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-statements", wallet.id] }); toast.success("Statement generated"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Modal title="Generate Billing Statement" onClose={onClose}>
      <Field label="Period Start"><input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inp} /></Field>
      <Field label="Period End"><input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={inp} /></Field>
      <Field label="Payment Terms (days)"><input type="number" value={terms} min={0} max={365} onChange={(e) => setTerms(Number(e.target.value))} className={inp} /></Field>
      <SubmitRow onCancel={onClose} onSubmit={() => mut.mutate()} loading={mut.isPending} label="Generate" />
    </Modal>
  );
}

function TransactionsList({ walletId }: { walletId: string }) {
  const { data } = useQuery({
    queryKey: ["admin-wallet-tx", walletId],
    queryFn: () => adminListTransactions({ data: { walletId, limit: 20 } }),
  });
  return (
    <div className="rounded-md border">
      <div className="border-b p-3"><h3 className="text-sm font-semibold">Recent Transactions</h3></div>
      <div className="max-h-80 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-surface-2 text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="p-2 text-left">Date</th><th className="p-2 text-left">Type</th>
              <th className="p-2 text-right">Amount</th><th className="p-2 text-left">Reason / Remarks</th><th className="p-2 text-left">By</th>
            </tr>
          </thead>
          <tbody>
            {(data?.rows ?? []).map((r: any) => (
              <tr key={r.id} className={`border-t ${r.type === "credit" ? "bg-green-50/40 dark:bg-green-900/10" : "bg-red-50/40 dark:bg-red-900/10"}`}>
                <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2">{r.type === "credit"
                  ? <span className="inline-flex items-center gap-0.5 text-green-700 dark:text-green-300"><TrendingUp className="h-3 w-3" /> credit</span>
                  : <span className="inline-flex items-center gap-0.5 text-red-700 dark:text-red-300"><TrendingDown className="h-3 w-3" /> debit</span>}</td>
                <td className={`p-2 text-right font-mono font-semibold ${r.type === "credit" ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                  {r.type === "credit" ? "+" : "−"}{formatAED(Number(r.amount))}
                </td>
                <td className="p-2">{r.reason ?? ""}{r.remarks ? ` · ${r.remarks}` : ""}</td>
                <td className="p-2">{r.updated_by_name ?? "—"}</td>
              </tr>
            ))}
            {!data?.rows?.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No transactions.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatementsList({ walletId }: { walletId: string }) {
  const { data } = useQuery({
    queryKey: ["admin-statements", walletId],
    queryFn: () => adminListStatements({ data: { walletId } }),
  });
  return (
    <div className="rounded-md border">
      <div className="border-b p-3"><h3 className="text-sm font-semibold">Billing Statements</h3></div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-surface-2 text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="p-2 text-left">Statement #</th><th className="p-2 text-left">Period</th>
              <th className="p-2 text-right">Outstanding</th><th className="p-2 text-right">Paid</th>
              <th className="p-2 text-left">Status</th><th className="p-2 text-left">Due</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((s: any) => (
              <tr key={s.id} className="border-t">
                <td className="p-2 font-mono">{s.statement_number}</td>
                <td className="p-2">{s.period_start} → {s.period_end}</td>
                <td className="p-2 text-right font-mono">{formatAED(Number(s.outstanding_amount))}</td>
                <td className="p-2 text-right font-mono">{formatAED(Number(s.amount_paid))}</td>
                <td className="p-2">{s.status}</td>
                <td className="p-2">{s.due_date}</td>
              </tr>
            ))}
            {!data?.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No statements.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------- Primitives ------- */
const inp = "w-full rounded-md border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary";
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold">{title}</h3>
        <div className="mt-4 space-y-3">{children}</div>
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs font-semibold">{label}</label><div className="mt-1">{children}</div></div>;
}
function SubmitRow({ onCancel, onSubmit, loading, label, disabled }: { onCancel: () => void; onSubmit: () => void; loading: boolean; label: string; disabled?: boolean }) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <button onClick={onCancel} className="rounded border px-3 py-1.5 text-sm hover:bg-muted">Cancel</button>
      <button onClick={onSubmit} disabled={loading || disabled} className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
        {loading ? "Saving…" : label}
      </button>
    </div>
  );
}
