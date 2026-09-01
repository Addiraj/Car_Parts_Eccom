import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { salesmanListAiLeads, updateAiLead, salesmanGetAiThreadMessages } from "@/lib/ai-chat.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { MessageCircle, SearchX, UserCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/salesman/inquiries")({
  component: InquiriesPage,
});

function InquiriesPage() {
  const list = useServerFn(salesmanListAiLeads);
  const update = useServerFn(updateAiLead);
  const qc = useQueryClient();
  const leads = useQuery({ queryKey: ["sm-ai-leads"], queryFn: () => list({}) });
  const m = useMutation({
    mutationFn: (v: { id: string; status: "contacted" | "closed" }) => update({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sm-ai-leads"] }),
  });
  const [viewThread, setViewThread] = useState<string | null>(null);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Inquiries & AI Leads</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">{leads.data?.length ?? 0} inquiries</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(leads.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No leads yet.</p> : null}
          {(leads.data ?? []).map((l: any) => {
            const isStockInquiry = l.status === "stock_inquiry" || l.reason?.toLowerCase().includes("out of stock");
            return (
              <div key={l.id} className={`rounded border p-3 text-sm flex flex-wrap gap-3 ${isStockInquiry ? "bg-red-50/50 border-red-100" : ""}`}>
                <div className="flex-shrink-0 pt-1">
                  {isStockInquiry ? <SearchX className="h-5 w-5 text-red-500" /> : <UserCheck className="h-5 w-5 text-blue-500" />}
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="font-medium">{l.name || "Unnamed Customer"} <Badge variant={isStockInquiry ? "destructive" : "secondary"} className="ml-2">{isStockInquiry ? "Stock Inquiry" : l.status}</Badge></div>
                  <div className="text-xs text-muted-foreground">{l.phone || l.email || "no contact"} · {format(new Date(l.created_at), "PP p")}</div>
                  <div className="mt-1 font-semibold text-slate-800">{l.reason}</div>
                </div>
                <div className="flex gap-1 items-start">
                  {l.thread_id && (
                    <Button size="sm" variant="outline" onClick={() => setViewThread(l.thread_id)}>
                      <MessageCircle className="h-4 w-4 mr-1" /> View chat
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => m.mutate({ id: l.id, status: "contacted" })}>Mark contacted</Button>
                  <Button size="sm" onClick={() => m.mutate({ id: l.id, status: "closed" })}>Close</Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <ThreadDialog threadId={viewThread} onClose={() => setViewThread(null)} />
    </div>
  );
}

function ThreadDialog({ threadId, onClose }: { threadId: string | null; onClose: () => void }) {
  const q = useQuery({
    queryKey: ["sm-ai-lead-thread", threadId],
    queryFn: () => salesmanGetAiThreadMessages({ data: { thread_id: threadId! } }),
    enabled: !!threadId,
  });
  const data: any = q.data ?? {};
  const messages: any[] = data.messages ?? [];
  return (
    <Dialog open={!!threadId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>AI conversation</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto space-y-2 rounded border bg-surface-2 p-3">
          {q.isLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
          {q.isError && <div className="text-xs text-destructive">Failed to load transcript.</div>}
          {messages.length === 0 && !q.isLoading && <div className="text-xs text-muted-foreground">No messages.</div>}
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
