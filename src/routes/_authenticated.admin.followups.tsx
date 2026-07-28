import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { listFollowups, completeFollowup, cancelFollowup } from "@/lib/customer-crm.functions";
import { toast } from "sonner";
import { Calendar, CheckCircle2, X, AlertTriangle, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/followups")({
  head: () => ({ meta: [{ title: "Follow-ups — Admin" }] }),
  component: AdminFollowups,
});

type FilterTab = "today" | "overdue" | "pending" | "completed" | "all";

function AdminFollowups() {
  const [tab, setTab] = useState<FilterTab>("today");
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-followups", tab],
    queryFn: () => listFollowups({ data: { status: tab, scope: "all" } }),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-followups"] });

  const complete = useMutation({
    mutationFn: (id: string) => completeFollowup({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Completed"); },
  });
  const cancel = useMutation({
    mutationFn: (id: string) => cancelFollowup({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Cancelled"); },
  });

  const tabs: Array<{ id: FilterTab; label: string }> = [
    { id: "today", label: "Today" }, { id: "overdue", label: "Overdue" },
    { id: "pending", label: "Pending" }, { id: "completed", label: "Completed" }, { id: "all", label: "All" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5" /><h1 className="text-2xl font-bold">Follow-ups</h1>
      </div>
      <div className="flex flex-wrap gap-1 border-b">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`border-b-2 px-3 py-2 text-sm ${tab === t.id ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <ul className="space-y-2">
          {data.map((f: any) => (
            <li key={f.id} className={`rounded-lg border p-4 ${f.is_overdue ? "border-red-300 bg-red-500/5" : "bg-surface"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {f.is_overdue && <AlertTriangle className="h-4 w-4 text-red-600" />}
                    {f.title}
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      f.priority === "high" ? "bg-red-500/10 text-red-600" :
                      f.priority === "medium" ? "bg-blue-500/10 text-blue-600" :
                      "bg-muted text-muted-foreground"
                    }`}>{f.priority}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(f.due_at).toLocaleString()}</span>
                    <Link to="/admin/customers/$id" params={{ id: f.customer_id }} className="text-primary hover:underline">
                      {f.customer_name}
                    </Link>
                    <span>→ {f.assignee_name}</span>
                  </div>
                  {f.description && <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>}
                </div>
                {f.status === "pending" && (
                  <div className="flex gap-1">
                    <button onClick={() => complete.mutate(f.id)} className="rounded p-1.5 text-emerald-600 hover:bg-emerald-500/10" title="Complete">
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
                    <button onClick={() => cancel.mutate(f.id)} className="rounded p-1.5 text-muted-foreground hover:bg-surface-2" title="Cancel">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
          {!data.length && <li className="rounded border border-dashed py-10 text-center text-sm text-muted-foreground">No follow-ups in this view.</li>}
        </ul>
      )}
    </div>
  );
}
