import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, Check, UserPlus, ShoppingBag, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import {
  listAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/admin.notifications.functions";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Admin" }] }),
  component: NotificationsPage,
});

type Filter = "all" | "signup" | "order" | "quotation";

function icon(t: string) {
  if (t === "signup") return <UserPlus className="h-4 w-4 text-emerald-500" />;
  if (t === "order") return <ShoppingBag className="h-4 w-4 text-blue-500" />;
  if (t === "quotation") return <FileText className="h-4 w-4 text-amber-500" />;
  return <Bell className="h-4 w-4" />;
}

function linkFor(n: any): { to: string; params?: any } | null {
  if (n.entity_type === "user") return { to: "/admin/customers/$id", params: { id: n.entity_id } };
  if (n.entity_type === "order") return { to: "/admin/orders/$id", params: { id: n.entity_id } };
  if (n.entity_type === "quotation") return { to: "/admin/quotations/$id", params: { id: n.entity_id } };
  return null;
}

function NotificationsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data, isFetching } = useQuery({
    queryKey: ["admin-notifications", "page", filter, page],
    queryFn: () => listAdminNotifications({ data: { limit: pageSize, offset: (page - 1) * pageSize, type: filter } }),
  });
  const items = (data as any)?.items ?? [];
  const total = (data as any)?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const markOne = useMutation({
    mutationFn: (id: string) => markNotificationRead({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });
  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button
          onClick={() => markAll.mutate()}
          disabled={markAll.isPending}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-40"
        >
          <Check className="h-3.5 w-3.5" /> Mark all read
        </button>
      </div>

      <div className="mt-4 flex rounded-lg border bg-surface p-1 text-sm w-fit">
        {(["all", "signup", "order", "quotation"] as Filter[]).map((t) => (
          <button
            key={t}
            onClick={() => { setPage(1); setFilter(t); }}
            className={`rounded-md px-3 py-1.5 capitalize ${filter === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border bg-surface">
        {items.length === 0 && !isFetching && (
          <div className="p-10 text-center text-sm text-muted-foreground">No notifications.</div>
        )}
        {items.map((n: any) => {
          const link = linkFor(n);
          const Inner = (
            <div className={`flex items-start gap-3 border-b px-4 py-3 last:border-b-0 ${n.read ? "" : "bg-primary/5"}`}>
              <div className="mt-0.5">{icon(n.type)}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
                <div className="mt-1 text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
              </div>
              {!n.read && <span className="mt-2 h-2 w-2 rounded-full bg-primary" />}
            </div>
          );
          return link ? (
            <Link
              key={n.id}
              to={link.to as any}
              params={link.params}
              onClick={() => !n.read && markOne.mutate(n.id)}
              className="block hover:bg-muted/40"
            >
              {Inner}
            </Link>
          ) : (
            <div key={n.id}>{Inner}</div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{total.toLocaleString()} total · page {page} / {pages}</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border px-2 py-1 disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded border px-2 py-1 disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
