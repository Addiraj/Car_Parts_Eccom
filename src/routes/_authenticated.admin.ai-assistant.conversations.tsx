import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminListAllThreads, adminGetThread, adminListChatUsers } from "@/lib/ai-chat.functions";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { User, Phone, Mail } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/ai-assistant/conversations")({
  component: ConversationsPage,
});

function ConversationsPage() {
  const listUsers = useServerFn(adminListChatUsers);
  const listThreads = useServerFn(adminListAllThreads);
  const getThread = useServerFn(adminGetThread);

  const [q, setQ] = React.useState("");
  const [selectedUser, setSelectedUser] = React.useState<{ user_id: string | null; label: string } | null>(null);
  const [selectedThread, setSelectedThread] = React.useState<string | null>(null);

  const users = useQuery({ queryKey: ["ai-chat-users", q], queryFn: () => listUsers({ data: { q } }) });
  const threads = useQuery({
    queryKey: ["ai-threads", selectedUser?.user_id ?? "__none__"],
    queryFn: () => listThreads({ data: { user_id: selectedUser?.user_id ?? null } }),
    enabled: !!selectedUser,
  });
  const detail = useQuery({
    queryKey: ["ai-thread", selectedThread],
    queryFn: () => getThread({ data: { id: selectedThread! } }),
    enabled: !!selectedThread,
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">AI Conversations</h1>
      <div className="grid grid-cols-1 lg:grid-cols-[280px_280px_1fr] gap-4">
        {/* Users */}
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">Users</CardTitle>
            <Input placeholder="Search name / phone / email" value={q} onChange={(e) => setQ(e.target.value)} />
          </CardHeader>
          <CardContent className="p-0 max-h-[70vh] overflow-y-auto">
            {users.isLoading && <div className="p-3 text-sm text-muted-foreground">Loading…</div>}
            {(users.data ?? []).map((u: any) => {
              const key = u.user_id ?? "__guest__";
              const active = (selectedUser?.user_id ?? "__guest__") === key;
              return (
                <button
                  key={key}
                  onClick={() => { setSelectedUser({ user_id: u.user_id, label: u.full_name }); setSelectedThread(null); }}
                  className={`block w-full text-left border-b px-3 py-2 hover:bg-accent ${active ? "bg-accent" : ""}`}
                >
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <User size={12} /> {u.full_name}
                    <span className="ml-auto text-[10px] rounded bg-muted px-1.5 py-0.5">{u.thread_count}</span>
                  </div>
                  {u.phone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone size={10} /> {u.phone}</div>}
                  {u.email && <div className="flex items-center gap-1 text-xs text-muted-foreground truncate"><Mail size={10} /> {u.email}</div>}
                  <div className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(u.last_message_at), "PP p")}</div>
                </button>
              );
            })}
            {!users.isLoading && !(users.data ?? []).length && (
              <div className="p-3 text-sm text-muted-foreground">No users found.</div>
            )}
          </CardContent>
        </Card>

        {/* Threads */}
        <Card>
          <CardHeader><CardTitle className="text-base">Threads {selectedUser ? `· ${selectedUser.label}` : ""}</CardTitle></CardHeader>
          <CardContent className="p-0 max-h-[70vh] overflow-y-auto">
            {!selectedUser ? <p className="p-3 text-sm text-muted-foreground">Select a user.</p> :
              (threads.data ?? []).map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedThread(t.id)}
                  className={`block w-full text-left border-b px-3 py-2 hover:bg-accent ${selectedThread === t.id ? "bg-accent" : ""}`}
                >
                  <div className="text-sm font-medium truncate">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(t.last_message_at), "PP p")} · {t.language}</div>
                </button>
              ))}
            {selectedUser && !(threads.data ?? []).length && !threads.isLoading && (
              <p className="p-3 text-sm text-muted-foreground">No threads.</p>
            )}
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader><CardTitle className="text-base">Conversation</CardTitle></CardHeader>
          <CardContent className="max-h-[70vh] overflow-y-auto space-y-3">
            {!selectedThread ? <p className="text-sm text-muted-foreground">Select a thread.</p> :
              (detail.data?.messages ?? []).map((m: any) => (
                <div key={m.id} className={`rounded p-2 text-sm ${m.role === "user" ? "bg-muted" : "bg-card border"}`}>
                  <div className="text-[10px] uppercase text-muted-foreground mb-1">{m.role} · {m.intent ?? ""}</div>
                  <div className="whitespace-pre-wrap">{m.text}</div>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
