import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListContacts, adminUpdateContactStatus, adminDeleteContact } from "@/lib/contact.functions";
import { toast } from "sonner";
import { Trash2, Mail, ChevronDown, ChevronUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/contacts")({
  head: () => ({ meta: [{ title: "Contacts — Admin" }] }),
  component: AdminContactsPage,
});

function AdminContactsPage() {
  const qc = useQueryClient();
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["admin-contacts"],
    queryFn: () => adminListContacts(),
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  const upd = useMutation({
    mutationFn: (v: { id: string; status: "new" | "read" | "replied" }) => adminUpdateContactStatus({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-contacts"] }),
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => adminDeleteContact({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-contacts"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center gap-3">
        <Mail className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Customer Inquiries</h1>
        <span className="ml-auto text-xs text-muted-foreground">{contacts.length} total</span>
      </div>

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && contacts.length === 0 && (
        <div className="mt-8 grid place-items-center rounded-lg border border-dashed bg-surface-2 p-12 text-center">
          <Mail className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No inquiries yet.</p>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {contacts.map((c: any) => {
          const open = expanded === c.id;
          return (
            <div key={c.id} className="rounded-lg border bg-surface">
              <button
                onClick={() => setExpanded(open ? null : c.id)}
                className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/30"
              >
                <StatusBadge status={c.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{c.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{c.email}</span>
                  </div>
                  <div className="mt-0.5 truncate text-sm">{c.subject}</div>
                </div>
                <div className="hidden text-xs text-muted-foreground sm:block">
                  {new Date(c.created_at).toLocaleString()}
                </div>
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {open && (
                <div className="border-t p-4">
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <Info label="Name" value={c.name} />
                    <Info label="Email" value={<a href={`mailto:${c.email}`} className="text-primary hover:underline">{c.email}</a>} />
                    {c.phone && <Info label="Phone" value={<a href={`tel:${c.phone}`} className="text-primary hover:underline">{c.phone}</a>} />}
                    <Info label="Submitted" value={new Date(c.created_at).toLocaleString()} />
                  </div>
                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</div>
                    <div className="mt-1 text-sm">{c.subject}</div>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{c.message}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                    <span className="text-xs text-muted-foreground">Status:</span>
                    <select
                      value={c.status}
                      onChange={(e) => upd.mutate({ id: c.id, status: e.target.value as any })}
                      className="rounded-md border bg-surface-2 px-2 py-1 text-sm"
                    >
                      <option value="new">New</option>
                      <option value="read">Read</option>
                      <option value="replied">Replied</option>
                    </select>
                    <button
                      onClick={() => { if (confirm("Delete this inquiry?")) del.mutate(c.id); }}
                      className="ml-auto flex items-center gap-1 rounded-md border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "new" ? "bg-primary/15 text-primary border-primary/30" :
    status === "replied" ? "bg-success/15 text-success border-success/30" :
    "bg-muted text-muted-foreground border-border";
  return <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>{status}</span>;
}
