import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listCustomerNotes, createCustomerNote, updateCustomerNote, deleteCustomerNote,
  listFollowups, createFollowup, completeFollowup, cancelFollowup,
  listCustomerActivities,
} from "@/lib/customer-crm.functions";
import { adminListSalesmen } from "@/lib/admin.salesmen.functions";
import {
  StickyNote, Pin, Trash2, Plus, Calendar, CheckCircle2, X, Clock, AlertTriangle,
  FileText, ShoppingBag, UserPlus, Repeat, Activity,
} from "lucide-react";

type Props = { customerId: string; canManageSalesman?: boolean };

export function CustomerCRMTabs({ customerId, canManageSalesman = true }: Props) {
  const [tab, setTab] = useState<"notes" | "followups" | "activity">("notes");
  const tabs = [
    { id: "notes" as const, label: "Notes", Icon: StickyNote },
    { id: "followups" as const, label: "Follow-ups", Icon: Calendar },
    { id: "activity" as const, label: "Activity", Icon: Activity },
  ];
  return (
    <section className="rounded-lg border bg-surface">
      <div className="flex gap-1 border-b px-3 pt-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm ${tab === t.id ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <t.Icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>
      <div className="p-4">
        {tab === "notes" && <NotesPanel customerId={customerId} />}
        {tab === "followups" && <FollowupsPanel customerId={customerId} canManageSalesman={canManageSalesman} />}
        {tab === "activity" && <ActivityPanel customerId={customerId} />}
      </div>
    </section>
  );
}

/* -------- Notes -------- */
function NotesPanel({ customerId }: { customerId: string }) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const { data = [], isLoading } = useQuery({
    queryKey: ["crm-notes", customerId],
    queryFn: () => listCustomerNotes({ data: { customer_id: customerId } }),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["crm-notes", customerId] });

  const add = useMutation({
    mutationFn: () => createCustomerNote({ data: { customer_id: customerId, body, pinned } }),
    onSuccess: () => { setBody(""); setPinned(false); invalidate(); toast.success("Note added"); },
    onError: (e: any) => toast.error(e.message),
  });
  const togglePin = useMutation({
    mutationFn: (n: any) => updateCustomerNote({ data: { id: n.id, pinned: !n.pinned } }),
    onSuccess: invalidate,
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteCustomerNote({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Deleted"); },
  });

  return (
    <div className="space-y-3">
      <div className="rounded border bg-surface-2 p-3">
        <textarea rows={3} className="w-full rounded border bg-surface p-2 text-sm"
          placeholder="Add a note about this customer…" value={body}
          onChange={(e) => setBody(e.target.value)} />
        <div className="mt-2 flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin to top
          </label>
          <button disabled={!body.trim() || add.isPending} onClick={() => add.mutate()}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <ul className="space-y-2">
          {data.map((n: any) => (
            <li key={n.id} className="rounded border bg-surface-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{n.author_name}</span>
                  {" · "}{new Date(n.created_at).toLocaleString()}
                  {n.pinned && <span className="ml-2 inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-600"><Pin className="h-3 w-3" /> Pinned</span>}
                </div>
                <div className="flex gap-1">
                  <button title={n.pinned ? "Unpin" : "Pin"} onClick={() => togglePin.mutate(n)}
                    className="rounded p-1 text-muted-foreground hover:bg-surface hover:text-foreground">
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                  <button title="Delete" onClick={() => del.mutate(n.id)}
                    className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{n.body}</p>
            </li>
          ))}
          {!data.length && <li className="rounded border border-dashed py-6 text-center text-xs text-muted-foreground">No notes yet.</li>}
        </ul>
      )}
    </div>
  );
}

/* -------- Follow-ups -------- */
function FollowupsPanel({ customerId, canManageSalesman }: { customerId: string; canManageSalesman: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["crm-followups", customerId],
    queryFn: () => listFollowups({ data: { customer_id: customerId, status: "all", scope: "all" } }),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["crm-followups", customerId] });

  const complete = useMutation({
    mutationFn: (id: string) => completeFollowup({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Marked complete"); },
  });
  const cancel = useMutation({
    mutationFn: (id: string) => cancelFollowup({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Cancelled"); },
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" /> New follow-up
        </button>
      </div>

      {open && (
        <NewFollowupForm
          customerId={customerId}
          canManageSalesman={canManageSalesman}
          onClose={() => setOpen(false)}
          onCreated={() => { setOpen(false); invalidate(); }}
        />
      )}

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <ul className="space-y-2">
          {data.map((f: any) => (
            <li key={f.id} className={`rounded border p-3 ${f.is_overdue ? "border-red-300 bg-red-500/5" : "bg-surface-2"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {f.is_overdue && <AlertTriangle className="h-4 w-4 text-red-600" />}
                    {f.title}
                    <PriorityBadge p={f.priority} />
                    <StatusBadge s={f.status} overdue={f.is_overdue} />
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(f.due_at).toLocaleString()}</span>
                    <span>Assigned to {f.assignee_name}</span>
                  </div>
                  {f.description && <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>}
                </div>
                {f.status === "pending" && (
                  <div className="flex gap-1">
                    <button title="Complete" onClick={() => complete.mutate(f.id)}
                      className="rounded p-1 text-emerald-600 hover:bg-emerald-500/10">
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <button title="Cancel" onClick={() => cancel.mutate(f.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-surface hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
          {!data.length && <li className="rounded border border-dashed py-6 text-center text-xs text-muted-foreground">No follow-ups yet.</li>}
        </ul>
      )}
    </div>
  );
}

function PriorityBadge({ p }: { p: string }) {
  const map: Record<string, string> = {
    low: "bg-muted text-muted-foreground", medium: "bg-blue-500/10 text-blue-600",
    high: "bg-red-500/10 text-red-600",
  };
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${map[p] ?? map.medium}`}>{p}</span>;
}
function StatusBadge({ s, overdue }: { s: string; overdue?: boolean }) {
  if (overdue) return <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-600">Overdue</span>;
  const map: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-600", completed: "bg-emerald-500/10 text-emerald-600",
    cancelled: "bg-muted text-muted-foreground",
  };
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${map[s] ?? map.pending}`}>{s}</span>;
}

function NewFollowupForm({ customerId, onClose, onCreated, canManageSalesman }: {
  customerId: string; onClose: () => void; onCreated: () => void; canManageSalesman: boolean;
}) {
  const { data: salesmen = [] } = useQuery({
    queryKey: ["admin-salesmen-min"],
    queryFn: () => adminListSalesmen({ data: { status: "active" } }),
    enabled: canManageSalesman,
  });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const dt = new Date(); dt.setHours(dt.getHours() + 24);
  const [dueAt, setDueAt] = useState(dt.toISOString().slice(0, 16));
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [assignedTo, setAssignedTo] = useState("");

  const create = useMutation({
    mutationFn: () => createFollowup({ data: {
      customer_id: customerId,
      assigned_to: assignedTo,
      title: title.trim(),
      description: description.trim() || null,
      due_at: new Date(dueAt).toISOString(),
      priority,
    } }),
    onSuccess: () => { toast.success("Follow-up created"); onCreated(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="rounded border bg-surface-2 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs"><span className="mb-1 block font-medium text-muted-foreground">Title</span>
          <input className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="text-xs"><span className="mb-1 block font-medium text-muted-foreground">Assign to</span>
          {canManageSalesman ? (
            <select className="input w-full" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
              <option value="">— Select —</option>
              {(salesmen as any[]).map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          ) : <input className="input w-full" value="Me" disabled />}
        </label>
        <label className="text-xs"><span className="mb-1 block font-medium text-muted-foreground">Due</span>
          <input className="input w-full" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></label>
        <label className="text-xs"><span className="mb-1 block font-medium text-muted-foreground">Priority</span>
          <select className="input w-full" value={priority} onChange={(e) => setPriority(e.target.value as any)}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </select></label>
        <label className="text-xs sm:col-span-2"><span className="mb-1 block font-medium text-muted-foreground">Description</span>
          <textarea rows={2} className="w-full rounded border bg-surface p-2 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm">Cancel</button>
        <button disabled={!title.trim() || (canManageSalesman && !assignedTo) || create.isPending}
          onClick={() => create.mutate()}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
          Create
        </button>
      </div>
    </div>
  );
}

/* -------- Activity -------- */
function ActivityPanel({ customerId }: { customerId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["crm-activities", customerId],
    queryFn: () => listCustomerActivities({ data: { customer_id: customerId } }),
  });
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data.length) return <p className="rounded border border-dashed py-6 text-center text-xs text-muted-foreground">No activity yet.</p>;
  return (
    <ol className="relative ml-3 space-y-3 border-l">
      {data.map((a: any) => {
        const I = iconFor(a.activity_type);
        return (
          <li key={a.id} className="ml-4">
            <span className="absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full border bg-surface">
              <I className="h-3 w-3 text-primary" />
            </span>
            <div className="text-sm font-medium">{labelFor(a)}</div>
            <div className="text-[11px] text-muted-foreground">
              {a.actor_name} · {new Date(a.created_at).toLocaleString()}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function iconFor(t: string) {
  switch (t) {
    case "note_added": return StickyNote;
    case "followup_created": return Calendar;
    case "followup_completed": return CheckCircle2;
    case "followup_cancelled": return X;
    case "quotation_created": return FileText;
    case "order_placed": return ShoppingBag;
    case "customer_assigned": return UserPlus;
    case "customer_reassigned": return Repeat;
    default: return Activity;
  }
}
function labelFor(a: any) {
  const m = a.metadata ?? {};
  switch (a.activity_type) {
    case "note_added": return `Added a note${m.preview ? ` — "${m.preview}"` : ""}`;
    case "followup_created": return `Created follow-up "${m.title ?? ""}"`;
    case "followup_completed": return `Completed follow-up "${m.title ?? ""}"`;
    case "followup_cancelled": return `Cancelled follow-up "${m.title ?? ""}"`;
    case "quotation_created": return `Created quotation ${m.quotation_number ?? ""}`;
    case "order_placed": return `Placed order ${m.order_number ?? ""}`;
    case "customer_assigned": return `Assigned to salesman`;
    case "customer_reassigned": return `Reassigned salesman`;
    default: return a.activity_type;
  }
}
