import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { salesmanGetCustomer, salesmanCustomerActivity } from "@/lib/admin.salesmen.functions";
import { salesmanListCustomerAiThreads, salesmanGetAiThreadMessages } from "@/lib/ai-chat.functions";
import { listCustomerNotes, createCustomerNote, listFollowups, createFollowup, completeFollowup } from "@/lib/customer-crm.functions";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Activity, MessageCircle, StickyNote, CalendarClock, Bot, ChevronRight, ChevronDown } from "lucide-react";


export const Route = createFileRoute("/_authenticated/salesman/customers/$id")({
  head: () => ({ meta: [{ title: "Customer" }] }),
  component: CustomerDetail,
});

function CustomerDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { user } = useAuth();


  const customer = useQuery({
    queryKey: ["sm-customer", id],
    queryFn: () => salesmanGetCustomer({ data: { id } }),
  });
  const activity = useQuery({
    queryKey: ["sm-customer-activity", id],
    queryFn: () => salesmanCustomerActivity({ data: { customer_id: id, limit: 100 } }),
    refetchInterval: 20_000,
  });
  const threads = useQuery({
    queryKey: ["sm-customer-ai-threads", id],
    queryFn: () => salesmanListCustomerAiThreads({ data: { customer_id: id } }),
  });
  const notes = useQuery({
    queryKey: ["sm-customer-notes", id],
    queryFn: () => listCustomerNotes({ data: { customer_id: id } }),
  });
  const followups = useQuery({
    queryKey: ["sm-customer-followups", id],
    queryFn: () => listFollowups({ data: { customer_id: id } }),
  });

  // Realtime removed: using polling via refetchInterval already defined on the query.

  const c: any = customer.data ?? {};
  const acts: any[] = (activity.data as any) ?? [];
  const th: any[] = (threads.data as any) ?? [];
  const nts: any[] = (notes.data as any) ?? [];
  const fups: any[] = (followups.data as any) ?? [];

  if (customer.isError) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">You don't have access to this customer.</p>
        <Link to="/salesman/customers" className="text-primary text-sm hover:underline">← Back to My Customers</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/salesman/customers"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button></Link>
        <h1 className="text-2xl font-bold">{c.full_name || c.company_name || "Customer"}</h1>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <InfoRow label="Full name" value={c.full_name || "—"} />
        <InfoRow label="Company" value={c.company_name || "—"} />
        <InfoRow label="Phone" value={c.phone || "—"} />
        <InfoRow label="Type" value={c.customer_type || "—"} />
        <InfoRow label="Status" value={c.status || "—"} />
        <InfoRow label="Since" value={c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"} />
      </div>

      {/* Live activity */}
      <Panel title="Live customer activity" icon={<Activity className="h-4 w-4" />} badge="Real-time">
        {acts.length === 0 ? (
          <Empty text="No activity yet." />
        ) : (
          <ul className="divide-y">
            {acts.map((a) => (
              <li key={a.id} className="px-4 py-2.5 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{formatActivityType(a.activity_type)}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {a.entity_type ?? ""} {a.metadata?.name || a.metadata?.title || a.metadata?.part_number || ""}
                    </div>
                  </div>
                  <div className="whitespace-nowrap text-[11px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Follow-ups */}
      <Panel title="Follow-ups" icon={<CalendarClock className="h-4 w-4" />}>
        <FollowupsBlock
          items={fups}
          onAdd={async (title, due) => {
            if (!user) return;
            await createFollowup({ data: { customer_id: id, assigned_to: user.id, title, due_at: due, priority: "medium" } });
            qc.invalidateQueries({ queryKey: ["sm-customer-followups", id] });
          }}

          onComplete={async (fid) => {
            await completeFollowup({ data: { id: fid } });
            qc.invalidateQueries({ queryKey: ["sm-customer-followups", id] });
          }}
        />
      </Panel>

      {/* Notes */}
      <Panel title="Notes" icon={<StickyNote className="h-4 w-4" />}>
        <NotesBlock
          items={nts}
          onAdd={async (body) => {
            await createCustomerNote({ data: { customer_id: id, body } });
            qc.invalidateQueries({ queryKey: ["sm-customer-notes", id] });
          }}
        />
      </Panel>

      {/* AI conversations */}
      <Panel title="AI conversations (chatbot & avatar)" icon={<Bot className="h-4 w-4" />}>
        {th.length === 0 ? <Empty text="No AI conversations yet." /> : (
          <ul className="divide-y">
            {th.map((t) => <ThreadRow key={t.id} thread={t} />)}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-surface px-4 py-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function Panel({ title, icon, badge, children }: { title: string; icon?: React.ReactNode; badge?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-surface">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-semibold uppercase tracking-wider">{title}</h2>
        </div>
        {badge && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="p-6 text-center text-sm text-muted-foreground">{text}</div>;
}

function formatActivityType(t: string) {
  return String(t || "").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function NotesBlock({ items, onAdd }: { items: any[]; onAdd: (body: string) => Promise<void> }) {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2">
        <textarea className="input input-textarea flex-1" placeholder="Add a note…" value={body} onChange={(e) => setBody(e.target.value)} />
        <Button
          disabled={!body.trim() || saving}
          onClick={async () => { setSaving(true); try { await onAdd(body.trim()); setBody(""); } finally { setSaving(false); } }}
        >Add</Button>
      </div>
      {items.length === 0 ? <Empty text="No notes yet." /> : (
        <ul className="divide-y">
          {items.map((n) => (
            <li key={n.id} className="py-2 text-sm">
              <div className="whitespace-pre-wrap">{n.body}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{n.author_name} · {new Date(n.created_at).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FollowupsBlock({ items, onAdd, onComplete }: { items: any[]; onAdd: (title: string, due: string) => Promise<void>; onComplete: (id: string) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(() => new Date(Date.now() + 24 * 3600_000).toISOString().slice(0, 16));
  const [saving, setSaving] = useState(false);
  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        <input className="input flex-1 min-w-[200px]" placeholder="Follow-up title…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input type="datetime-local" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
        <Button
          disabled={!title.trim() || saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onAdd(title.trim(), new Date(due).toISOString());
              setTitle("");
            } catch (e: any) { alert(e?.message ?? "Failed"); } finally { setSaving(false); }
          }}
        >Add</Button>
      </div>
      {items.length === 0 ? <Empty text="No follow-ups yet." /> : (
        <ul className="divide-y">
          {items.map((f) => (
            <li key={f.id} className="py-2 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{f.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  Due {new Date(f.due_at).toLocaleString()} · {f.status}{f.is_overdue ? " · overdue" : ""}
                </div>
              </div>
              {f.status === "pending" && (
                <Button size="sm" variant="outline" onClick={() => onComplete(f.id)}>Complete</Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ThreadRow({ thread }: { thread: any }) {
  const [open, setOpen] = useState(false);
  const msgs = useQuery({
    queryKey: ["sm-ai-thread-msgs", thread.id],
    queryFn: () => salesmanGetAiThreadMessages({ data: { thread_id: thread.id } }),
    enabled: open,
  });
  const data: any = msgs.data ?? {};
  const messages: any[] = data.messages ?? [];
  return (
    <li className="px-4 py-2">
      <button className="w-full flex items-center justify-between text-left text-sm" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2 min-w-0">
          <MessageCircle className="h-4 w-4 shrink-0" />
          <span className="font-medium truncate">{thread.title || "Untitled conversation"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">{new Date(thread.last_message_at).toLocaleString()}</span>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>
      {open && (
        <div className="mt-2 rounded border bg-surface-2 p-3 max-h-96 overflow-y-auto space-y-2">
          {msgs.isLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
          {msgs.isError && <div className="text-xs text-destructive">Failed to load transcript.</div>}
          {messages.length === 0 && !msgs.isLoading && <div className="text-xs text-muted-foreground">No messages.</div>}
          {messages.map((m) => (
            <div key={m.id} className={`text-sm ${m.role === "user" ? "text-foreground" : "text-primary"}`}>
              <div className="text-[10px] uppercase text-muted-foreground">{m.role} · {new Date(m.created_at).toLocaleTimeString()}</div>
              <div className="whitespace-pre-wrap">{m.text || (Array.isArray(m.parts) ? m.parts.map((p: any) => p?.text ?? "").join(" ") : "")}</div>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}
