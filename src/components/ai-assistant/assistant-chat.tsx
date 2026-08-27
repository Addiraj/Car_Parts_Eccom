import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit, PromptInputTools, PromptInputButton,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Tool, ToolHeader, ToolContent, ToolInput, ToolOutput,
} from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import { Mic, ImagePlus, Loader2, MessageSquarePlus, Trash2, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QUICK_ACTIONS } from "./quick-actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Thread = { id: string; title: string };

export function AssistantChat({
  threadId,
  threads,
  onSelectThread,
  onNewThread,
  onDeleteThread,
  onThreadIdResolved,
}: {
  threadId: string | null;
  threads: Thread[];
  onSelectThread: (id: string) => void;
  onNewThread: () => Promise<string | null>;
  onDeleteThread: (id: string) => Promise<void>;
  onThreadIdResolved?: (id: string) => void;
}) {
  const [token, setToken] = React.useState<string | null>(null);
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setToken(s?.access_token ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/chat",
        body: () => ({ threadId }),
        headers: async () => {
          const { data } = await supabase.auth.getSession();
          const t = data.session?.access_token || (typeof window !== "undefined" ? localStorage.getItem("jwt_token") : null);
          return t ? ({ Authorization: `Bearer ${t}` } as Record<string, string>) : ({} as Record<string, string>);
        },
        fetch: (async (url: any, init: any) => {
          const res = await fetch(url, init);
          const hdr = res.headers.get("X-Thread-Id");
          if (hdr && hdr !== threadId) onThreadIdResolved?.(hdr);
          return res;
        }) as typeof fetch,
      }),
    [threadId, onThreadIdResolved],
  );


  const { messages, sendMessage, status, setMessages } = useChat({
    id: threadId ?? "new",
    transport,
    onError: (e) => toast.error(e.message || "AI request failed"),
  });

  // Load existing thread messages
  React.useEffect(() => {
    if (!threadId) { setMessages([]); return; }
    (async () => {
      const { data } = await supabase
        .from("ai_chat_messages")
        .select("id, role, text, parts, created_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      const ui = (data ?? []).map((m: any) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        parts: Array.isArray(m.parts) && m.parts.length ? m.parts : [{ type: "text", text: m.text ?? "" }],
      }));
      setMessages(ui as any);
    })();
  }, [threadId, setMessages]);

  const [input, setInput] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const isLoading = status === "submitted" || status === "streaming";

  const ensureThread = async (): Promise<string | null> => {
    if (threadId) return threadId;
    return await onNewThread();
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    const { data } = await supabase.auth.getSession();
    const t = data.session?.access_token || (typeof window !== "undefined" ? localStorage.getItem("jwt_token") : null);
    if (!t) { toast.error("Please sign in to chat"); return; }
    await ensureThread();
    setInput("");
    sendMessage({ text });
  };


  const handleUpload = async (file: File) => {
    const currentToken = token || (typeof window !== "undefined" ? localStorage.getItem("jwt_token") : null);
    if (!currentToken) { toast.error("Sign in to upload images"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/ai/upload", {
        method: "POST",
        body: fd,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      if (!url) throw new Error("No URL returned");
      await ensureThread();
      sendMessage({ text: `I'm sharing an image. URL: ${url}\n\nPlease analyze it using the appropriate tool (identifyPartFromImage / identifyWarningLight / ocrVin).` });
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleVoice = async () => {
    if (!navigator.mediaDevices) { toast.error("Voice not supported"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
      if (!mime) { stream.getTracks().forEach((t) => t.stop()); toast.error("Browser can't record supported audio"); return; }
      const rec = new MediaRecorder(stream, { mimeType: mime });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType });
        if (blob.size < 1024) { toast.error("Recording too short"); return; }
        const fd = new FormData();
        fd.append("file", blob);
        const res = await fetch("/api/ai/transcribe", { method: "POST", body: fd });
        if (!res.ok) { toast.error("Transcription failed"); return; }
        // parse SSE
        const reader = res.body!.getReader();
        const dec = new TextDecoder();
        let full = "";
        let buffer = "";
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += dec.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            try {
              const ev = JSON.parse(line.slice(5).trim());
              if (ev.type === "transcript.text.delta") full += ev.delta ?? "";
              if (ev.type === "transcript.text.done" && ev.text) full = ev.text;
            } catch {/* ignore */ }
          }
        }
        if (full) setInput((s) => (s ? s + " " : "") + full);
      };
      rec.start();
      toast.message("Recording… click mic again to stop");
      // store recorder on window so we can stop
      (window as any).__assistantRecorder = rec;
    } catch {
      const rec = (window as any).__assistantRecorder as MediaRecorder | undefined;
      if (rec && rec.state === "recording") rec.stop();
    }
  };

  const stopVoice = () => {
    const rec = (window as any).__assistantRecorder as MediaRecorder | undefined;
    if (rec && rec.state === "recording") { rec.stop(); (window as any).__assistantRecorder = null; }
  };

  const [historyOpen, setHistoryOpen] = React.useState<boolean>(false);
  React.useEffect(() => {
    try {
      const v = localStorage.getItem("automate-history-open");
      if (v === "1") setHistoryOpen(true);
    } catch {/* ignore */ }
  }, []);
  const toggleHistory = () => {
    setHistoryOpen((o) => {
      const next = !o;
      try { localStorage.setItem("automate-history-open", next ? "1" : "0"); } catch {/* ignore */ }
      return next;
    });
  };

  return (
    <div className="relative flex h-full min-h-0 w-full bg-background">
      {/* Sidebar (collapsible) */}
      {historyOpen && (
        <aside className="absolute md:relative z-20 inset-y-0 left-0 flex w-56 shrink-0 flex-col border-r border-border/60 bg-card md:bg-card/40">
          <div className="p-3">
            <Button
              size="sm"
              className="w-full gap-2"
              onClick={async () => {
                await onNewThread();
              }}
            >
              <MessageSquarePlus className="h-4 w-4" /> New chat
            </Button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-3">
            {threads.length === 0 ? (
              <p className="px-2 py-4 text-xs text-muted-foreground">No conversations yet.</p>
            ) : threads.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "group flex items-center gap-1 rounded-md px-2 py-1.5 text-xs",
                  t.id === threadId ? "bg-accent" : "hover:bg-accent/50",
                )}
              >
                <button
                  className="flex-1 truncate text-left"
                  onClick={() => {
                    onSelectThread(t.id);
                    if (window.matchMedia("(max-width: 767px)").matches) setHistoryOpen(false);
                  }}
                >
                  {t.title}
                </button>
                <button
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDeleteThread(t.id); }}
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* Main column */}
      <div className="flex flex-1 min-w-0 flex-col">
        <div className="flex items-center gap-1 border-b border-border/40 px-2 py-1.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={toggleHistory}
            aria-label={historyOpen ? "Hide history" : "Show history"}
            title={historyOpen ? "Hide history" : "Show history"}
          >
            {historyOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </Button>
          {!historyOpen && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={onNewThread}
              aria-label="New chat"
              title="New chat"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Conversation className="flex-1 min-h-0">
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState
                title="How can I help with your vehicle today?"
                description="Ask about a part, share a VIN, upload a warning light or part photo, or check stock and offers."
              />
            ) : null}
            {messages.map((m: any) => (
              <Message from={m.role} key={m.id}>
                <MessageContent>
                  {(m.parts ?? []).map((part: any, i: number) => {
                    if (part.type === "text") {
                      return m.role === "assistant"
                        ? <MessageResponse key={i}>{part.text}</MessageResponse>
                        : <span key={i} className="whitespace-pre-wrap">{part.text}</span>;
                    }
                    if (part.type?.startsWith?.("tool-")) {
                      return (
                        <Tool key={i} className="my-2">
                          <ToolHeader type={part.type} state={part.state} />
                          <ToolContent>
                            {part.input ? <ToolInput input={part.input} /> : null}
                            <ToolOutput output={part.output ? <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(part.output, null, 2)}</pre> : null} errorText={part.errorText} />
                          </ToolContent>
                        </Tool>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))}
            {status === "submitted" ? <Shimmer>Thinking…</Shimmer> : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Quick actions */}
        {messages.length === 0 ? (
          <div className="border-t border-border/40 px-3 pt-2 pb-1">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setInput(a.prompt)}
                  className="rounded-full border border-border/60 bg-card/50 px-3 py-1 text-[11px] hover:bg-accent transition"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = "";
          }}
        />

        <PromptInput
          onSubmit={() => { handleSend(); }}
          className="border-t border-border/40"
        >
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a part, VIN, warning light, order…"
            disabled={isLoading}
          />
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputButton type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                <span className="sr-only">Upload image</span>
              </PromptInputButton>
              <PromptInputButton
                type="button"
                onClick={() => {
                  const rec = (window as any).__assistantRecorder as MediaRecorder | undefined;
                  if (rec && rec.state === "recording") stopVoice();
                  else handleVoice();
                }}
              >
                <Mic className="h-4 w-4" />
                <span className="sr-only">Voice input</span>
              </PromptInputButton>
            </PromptInputTools>
            <PromptInputSubmit status={status} disabled={!input.trim() || isLoading} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
