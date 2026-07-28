import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { salesmanListAllAiThreads, salesmanGetAiThreadMessages } from "@/lib/ai-chat.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageCircle, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/salesman/conversations")({
  head: () => ({ meta: [{ title: "AI Conversations" }] }),
  component: ConversationsPage,
});

function ConversationsPage() {
  const [q, setQ] = useState("");
  const [openThread, setOpenThread] = useState<string | null>(null);
  const threads = useQuery({
    queryKey: ["sm-all-ai-threads", q],
    queryFn: () => salesmanListAllAiThreads({ data: { q } }),
  });
  const rows: any[] = (threads.data as any) ?? [];
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">AI Conversations</h1>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title…" className="w-full rounded border bg-surface-2 py-2 pl-9 pr-3 text-sm" />
      </div>
      <div className="overflow-x-auto rounded-lg border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Customer</th>
              <th className="px-3 py-2 text-left">Conversation</th>
              <th className="px-3 py-2 text-left">Language</th>
              <th className="px-3 py-2 text-left">Last message</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((t) => (
              <tr key={t.id} className="hover:bg-muted/40">
                <td className="px-3 py-2">
                  {t.user_id ? (
                    <Link to="/salesman/customers/$id" params={{ id: t.user_id }} className="text-primary hover:underline">
                      {t.customer?.full_name || t.customer?.company_name || "—"}
                    </Link>
                  ) : "—"}
                </td>
                <td className="px-3 py-2">{t.title || "Untitled"}</td>
                <td className="px-3 py-2 text-xs">{t.language || "—"}</td>
                <td className="px-3 py-2 text-xs">{new Date(t.last_message_at).toLocaleString()}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => setOpenThread(t.id)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <MessageCircle className="h-3.5 w-3.5" /> View
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-muted-foreground">No AI conversations from your assigned customers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <ThreadDialog threadId={openThread} onClose={() => setOpenThread(null)} />
    </div>
  );
}

function ThreadDialog({ threadId, onClose }: { threadId: string | null; onClose: () => void }) {
  const msgs = useQuery({
    queryKey: ["sm-thread-msgs", threadId],
    queryFn: () => salesmanGetAiThreadMessages({ data: { thread_id: threadId! } }),
    enabled: !!threadId,
  });
  const data: any = msgs.data ?? {};
  const messages: any[] = data.messages ?? [];
  return (
    <Dialog open={!!threadId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl w-[95vw]">
        <DialogHeader><DialogTitle>{data.thread?.title || "AI conversation"}</DialogTitle></DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto space-y-2 rounded border bg-surface-2 p-3">
          {msgs.isLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
          {messages.length === 0 && !msgs.isLoading && <div className="text-xs text-muted-foreground">No messages.</div>}
          {messages.map((m) => (
            <div key={m.id} className={`text-sm ${m.role === "user" ? "text-foreground" : "text-primary"}`}>
              <div className="text-[10px] uppercase text-muted-foreground">{m.role} · {new Date(m.created_at).toLocaleString()}</div>
              <div className="whitespace-pre-wrap">{m.text || (Array.isArray(m.parts) ? m.parts.map((p: any) => p?.text ?? "").join(" ") : "")}</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
