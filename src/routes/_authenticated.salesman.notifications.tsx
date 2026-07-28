import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listSalesmanNotifications } from "@/lib/admin.notifications.functions";

export const Route = createFileRoute("/_authenticated/salesman/notifications")({
  head: () => ({ meta: [{ title: "Notifications" }] }),
  component: NotificationsPage,
});

const TYPES = ["all", "assignment", "cart", "order", "ai_lead", "quotation"] as const;

function NotificationsPage() {
  const [type, setType] = useState<(typeof TYPES)[number]>("all");
  const [offset, setOffset] = useState(0);
  const LIMIT = 30;
  const q = useQuery({
    queryKey: ["sm-notifications-page", type, offset],
    queryFn: () => listSalesmanNotifications({ data: { limit: LIMIT, offset, type } }),
  });
  const data: any = q.data ?? { items: [], total: 0 };
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>
      <div className="flex flex-wrap gap-2 mb-4">
        {TYPES.map((t) => (
          <button key={t} onClick={() => { setType(t); setOffset(0); }}
            className={`text-xs rounded-full px-3 py-1 border ${type === t ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="rounded-lg border bg-surface divide-y">
        {data.items.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No notifications.</div>}
        {data.items.map((n: any) => {
          const to = n.entity_type === "user" && n.entity_id ? `/salesman/customers/${n.entity_id}`
            : n.metadata?.customer_id ? `/salesman/customers/${n.metadata.customer_id}` : null;
          const inner = (
            <div className={`px-4 py-3 text-sm ${n.read ? "" : "bg-primary/5"}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{n.title}</div>
                <div className="text-[11px] text-muted-foreground whitespace-nowrap">{new Date(n.created_at).toLocaleString()}</div>
              </div>
              {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
              <div className="text-[10px] uppercase text-muted-foreground mt-1">{n.type}</div>
            </div>
          );
          return to ? <Link key={n.id} to={to} className="block hover:bg-muted/40">{inner}</Link>
            : <div key={n.id}>{inner}</div>;
        })}
      </div>
      <div className="mt-4 flex justify-between text-xs">
        <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))} className="rounded border px-3 py-1 disabled:opacity-40">Prev</button>
        <span className="text-muted-foreground">Showing {offset + 1}–{Math.min(offset + LIMIT, data.total)} of {data.total}</span>
        <button disabled={offset + LIMIT >= data.total} onClick={() => setOffset(offset + LIMIT)} className="rounded border px-3 py-1 disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
