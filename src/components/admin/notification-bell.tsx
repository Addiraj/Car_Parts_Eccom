import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, UserPlus, ShoppingBag, FileText } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/admin.notifications.functions";
import notifyMp3 from "@/assets/notify.mp3";

function iconFor(type: string) {
  if (type === "signup") return <UserPlus className="h-4 w-4 text-emerald-500" />;
  if (type === "order") return <ShoppingBag className="h-4 w-4 text-blue-500" />;
  if (type === "quotation") return <FileText className="h-4 w-4 text-amber-500" />;
  return <Bell className="h-4 w-4" />;
}

export function NotificationBell() {
  const qc = useQueryClient();
  const listNotificationsFn = useServerFn(listAdminNotifications);
  const markReadFn = useServerFn(markNotificationRead);
  const markAllReadFn = useServerFn(markAllNotificationsRead);

  const [open, setOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data } = useQuery({
    queryKey: ["admin-notifications", "recent"],
    queryFn: () => listNotificationsFn({ data: { limit: 15, offset: 0, type: "all" } }),
    refetchOnWindowFocus: true,
  });
  const items = (data as any)?.items ?? [];
  const unread = items.filter((n: any) => !n.read).length;

  const markOne = useMutation({
    mutationFn: (id: string) => markReadFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });
  const markAll = useMutation({
    mutationFn: () => markAllReadFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });

  useEffect(() => {
    audioRef.current = new Audio(notifyMp3);
    audioRef.current.volume = 0.5;
    const channel = supabase
      .channel("admin-notifications-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_notifications" },
        (payload) => {
          const n: any = payload.new;
          try { audioRef.current?.play().catch(() => {}); } catch {}
          toast(n.title, { description: n.body ?? undefined });
          qc.invalidateQueries({ queryKey: ["admin-notifications"] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-9 w-9 place-items-center rounded-full border hover:bg-muted"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-[360px] rounded-lg border bg-background shadow-xl">
            <div className="flex items-center justify-between border-b p-3">
              <div className="text-sm font-semibold">Notifications</div>
              <button
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending || unread === 0}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-40"
              >
                <Check className="h-3 w-3" /> Mark all read
              </button>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {items.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</div>
              )}
              {items.map((n: any) => (
                <button
                  key={n.id}
                  onClick={() => { if (!n.read) markOne.mutate(n.id); setOpen(false); }}
                  className={`flex w-full items-start gap-3 border-b px-3 py-2.5 text-left hover:bg-muted/50 ${n.read ? "" : "bg-primary/5"}`}
                >
                  <div className="mt-0.5">{iconFor(n.type)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{n.title}</div>
                    {n.body && <div className="truncate text-xs text-muted-foreground">{n.body}</div>}
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                  {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
            <div className="border-t p-2 text-center">
              <Link
                to="/admin/notifications"
                onClick={() => setOpen(false)}
                className="text-xs text-primary hover:underline"
              >
                View all
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
