import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import {
  Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit, PromptInputTools, PromptInputButton,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { X, Mic, Square, Volume2, VolumeX, Sparkles, User2, MessageSquarePlus, Trash2, History, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar3D } from "./avatar-3d";
import { AvatarRealistic, type AvatarRealisticHandle } from "./avatar-realistic";
import { AvatarSimli, type AvatarSimliHandle } from "./avatar-simli";
import { useVoice } from "./use-voice";
import { ToolPartView, AvatarActionContext } from "./tool-cards";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getActiveAvatarProvider, getSimliConfig, listEnabledAvatarProviders } from "@/lib/avatar/avatar-providers.functions";

type Style = "3d" | "did" | "simli";
type Lang = "en" | "hi" | "ar" | "gu";
type Thread = { id: string; title: string };

const LANG_LABEL: Record<Lang, string> = { en: "English", hi: "हिंदी", ar: "العربية", gu: "ગુજરાતી" };
const LANG_INSTRUCTION: Record<Lang, string> = {
  en: "Reply in English.",
  hi: "Reply in Hindi (Devanagari script).",
  ar: "Reply in Arabic.",
  gu: "Reply in Gujarati.",
};

export function AvatarPanel({ onClose }: { onClose: () => void }) {
  const [style, setStyle] = React.useState<Style>("3d");
  const [lang, setLang] = React.useState<Lang>("en");
  const [threadId, setThreadId] = React.useState<string | null>(null);
  // Stable chat session id — only changes when the user explicitly starts a
  // new conversation or loads history. Decoupled from threadId so the server
  // assigning a fresh threadId mid-stream doesn't remount useChat and wipe
  // the in-flight assistant message.
  const [chatSessionId, setChatSessionId] = React.useState<string>(() => `avatar-${Date.now()}`);
  const [threads, setThreads] = React.useState<Thread[]>([]);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [voiceOn, setVoiceOn] = React.useState(true);
  const [showHistory, setShowHistory] = React.useState(false);
  const [didStatus, setDidStatus] = React.useState<"idle" | "connecting" | "live" | "error">("idle");
  const [simliStatus, setSimliStatus] = React.useState<"idle" | "connecting" | "live" | "error">("idle");
  const lastSpokenId = React.useRef<string | null>(null);
  const spokenOffsetRef = React.useRef<{ id: string | null; offset: number }>({ id: null, offset: 0 });
  const skipNextSpeakRef = React.useRef(false);
  const userRequestedSpeechRef = React.useRef(false);
  const historyLoadRequestedRef = React.useRef(false);
  const realisticRef = React.useRef<AvatarRealisticHandle | null>(null);
  const simliRef = React.useRef<AvatarSimliHandle | null>(null);

  const getActiveProvider = useServerFn(getActiveAvatarProvider);
  const { data: activeProvider } = useQuery({
    queryKey: ["active-avatar-provider"],
    queryFn: () => getActiveProvider(),
    staleTime: 60_000,
  });
  const getSimli = useServerFn(getSimliConfig);
  const { data: simliConfig } = useQuery({
    queryKey: ["simli-config"],
    queryFn: () => getSimli(),
    staleTime: 60_000,
  });
  const getEnabled = useServerFn(listEnabledAvatarProviders);
  const { data: enabled } = useQuery({
    queryKey: ["enabled-avatar-providers"],
    queryFn: () => getEnabled(),
    staleTime: 60_000,
  });
  const enabledList = React.useMemo<Style[]>(() => {
    const order: Style[] = ["3d", "did", "simli"];
    if (!enabled) return order;
    return order.filter((id) => (enabled as any)[id]);
  }, [enabled]);

  // Auto-switch if the currently selected style becomes disabled.
  React.useEffect(() => {
    if (enabledList.length === 0) return;
    if (!enabledList.includes(style)) setStyle(enabledList[0]);
  }, [enabledList, style]);

  const voice = useVoice();

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  // Panel lifecycle: connect BOTH providers as soon as the popup mounts so the
  // session is alive for the whole time the user has the avatar open. Tear
  // both down on unmount so closing the popup releases the Simli slot and
  // D-ID stream immediately.
  React.useEffect(() => {
    realisticRef.current?.connect().catch(() => { /* surfaced via toast */ });
    return () => {
      void realisticRef.current?.close().catch(() => { /* noop */ });
      void simliRef.current?.close().catch(() => { /* noop */ });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simli self-connects on mount inside AvatarSimli (mirrors AvatarRealistic).





  const refreshThreads = React.useCallback(async () => {
    if (!userId) { setThreads([]); return; }
    const { data } = await supabase
      .from("ai_chat_threads")
      .select("id, title, vehicle_context")
      .order("last_message_at", { ascending: false })
      .limit(80);
    const avatarOnly = (data ?? []).filter((t: any) => (t.vehicle_context as any)?.source === "avatar");
    setThreads(avatarOnly.map((t: any) => ({ id: t.id, title: t.title })) as Thread[]);
  }, [userId]);

  React.useEffect(() => { refreshThreads(); }, [refreshThreads, threadId]);

  // Do not auto-resume previous avatar conversations. History is visible only
  // when the user explicitly selects a saved thread, and old messages must not
  // be spoken by the avatar.

  const transport = React.useMemo(
    () => new DefaultChatTransport({
      api: "/api/ai/chat",
      body: () => ({ threadId, languageHint: LANG_INSTRUCTION[lang], source: "avatar" }),
      headers: async () => {
        const { data } = await supabase.auth.getSession();
        const t = data.session?.access_token;
        return t ? ({ Authorization: `Bearer ${t}` } as Record<string, string>) : ({} as Record<string, string>);
      },
      fetch: (async (url: RequestInfo | URL, init?: RequestInit) => {
        const res = await fetch(url, init);
        const hdr = res.headers.get("X-Thread-Id");
        if (hdr && hdr !== threadId) setThreadId(hdr);
        return res;
      }) as typeof fetch,
    }),
    [threadId, lang],
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    id: chatSessionId,
    transport,
    onError: (e) => toast.error(e.message || "AI request failed"),
  });


  // Load existing thread history on switch
  React.useEffect(() => {
    if (!threadId) {
      setMessages([]);
      lastSpokenId.current = null;
      spokenOffsetRef.current = { id: null, offset: 0 };
      skipNextSpeakRef.current = false;
      userRequestedSpeechRef.current = false;
      historyLoadRequestedRef.current = false;
      return;
    }
    if (!historyLoadRequestedRef.current) return;
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
      skipNextSpeakRef.current = true;
      userRequestedSpeechRef.current = false;
      setMessages(ui as any);
      // Mark last assistant as already-spoken so TTS doesn't replay history
      const lastAssistant = [...ui].reverse().find((m) => m.role === "assistant");
      if (lastAssistant) {
        const spokenText = (lastAssistant.parts ?? [])
          .map((p: any) => (p.type === "text" ? p.text : ""))
          .join(" ")
          .trim();
        lastSpokenId.current = lastAssistant.id;
        spokenOffsetRef.current = { id: lastAssistant.id, offset: spokenText.length };
      } else {
        spokenOffsetRef.current = { id: null, offset: 0 };
      }
      historyLoadRequestedRef.current = false;
    })();
  }, [threadId, setMessages]);

  const isLoading = status === "submitted" || status === "streaming";

  React.useEffect(() => {
    if (!voiceOn) return;
    if (status !== "ready" && status !== "streaming") return;
    const last = messages[messages.length - 1] as UIMessage | undefined;
    if (!last || last.role !== "assistant") return;
    const fullText = (last.parts ?? [])
      .map((p: any) => (p.type === "text" ? p.text : ""))
      .join(" ")
      .trim();
    if (!fullText) return;

    if (!userRequestedSpeechRef.current) {
      lastSpokenId.current = last.id;
      spokenOffsetRef.current = { id: last.id, offset: fullText.length };
      if (skipNextSpeakRef.current && status === "ready") skipNextSpeakRef.current = false;
      return;
    }

    // Simli: stream sentence-by-sentence as the LLM streams to cut speak latency.
    if (style === "simli" && simliRef.current) {
      if (skipNextSpeakRef.current) {
        if (status === "ready") {
          skipNextSpeakRef.current = false;
          lastSpokenId.current = last.id;
          spokenOffsetRef.current = { id: last.id, offset: fullText.length };
        }
        return;
      }
      if (spokenOffsetRef.current.id !== last.id) {
        spokenOffsetRef.current = { id: last.id, offset: 0 };
      }
      const pending = fullText.slice(spokenOffsetRef.current.offset);
      let chunk = "";
      if (status === "streaming") {
        const m = pending.match(/^[\s\S]*[.!?…\n]/);
        if (m) {
          chunk = m[0].trim();
          spokenOffsetRef.current.offset += m[0].length;
        }
      } else {
        chunk = pending.trim();
        spokenOffsetRef.current.offset = fullText.length;
        lastSpokenId.current = last.id;
        userRequestedSpeechRef.current = false;
      }
      if (chunk) {
        voice.cancel();
        simliRef.current.speak(chunk).catch(() => { /* surfaced via toast */ });
      }
      return;
    }

    if (status !== "ready") return;
    if (skipNextSpeakRef.current) { skipNextSpeakRef.current = false; return; }
    if (last.id === lastSpokenId.current) return;
    lastSpokenId.current = last.id;
    userRequestedSpeechRef.current = false;
    if (style === "did" && realisticRef.current) {
      voice.cancel();
      realisticRef.current.speak(fullText).catch(() => { /* surfaced via toast */ });
    } else {
      voice.speak(fullText);
    }
  }, [status, messages, voiceOn, voice, style]);

  const [input, setInput] = React.useState("");

  const ensureSignedIn = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) { toast.error("Please sign in again to chat"); return false; }
    return true;
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    if (!(await ensureSignedIn())) return;
    setInput("");
    voice.cancel();
    try { simliRef.current?.stopSpeaking(); } catch { /* noop */ }
    // Simli is already connected on panel open — no lazy connect needed here.
    userRequestedSpeechRef.current = true;
    skipNextSpeakRef.current = false;
    sendMessage({ text: `${text}\n\n(${LANG_INSTRUCTION[lang]})` });

  };

  const handleMic = async () => {
    if (voice.isRecording) {
      const transcript = await voice.stopRecording();
      if (transcript) {
        if (!(await ensureSignedIn())) return;
        voice.cancel();
        try { simliRef.current?.stopSpeaking(); } catch { /* noop */ }
        // Simli already connected on panel open.
        userRequestedSpeechRef.current = true;
        skipNextSpeakRef.current = false;
        sendMessage({ text: `${transcript}\n\n(${LANG_INSTRUCTION[lang]})` });

      }
    } else {
      voice.cancel();
      await voice.startRecording();
    }
  };

  const newConversation = () => {
    voice.cancel();
    try { simliRef.current?.stopSpeaking(); } catch { /* noop */ }
    setThreadId(null);
    setMessages([]);
    setChatSessionId(`avatar-${Date.now()}`);
    lastSpokenId.current = null;
    spokenOffsetRef.current = { id: null, offset: 0 };
    skipNextSpeakRef.current = false;
    userRequestedSpeechRef.current = false;
    historyLoadRequestedRef.current = false;
    setShowHistory(false);
  };

  const deleteThread = async (id: string) => {
    await supabase.from("ai_chat_threads").delete().eq("id", id);
    if (threadId === id) { setThreadId(null); setMessages([]); }
    refreshThreads();
  };

  return (
    <div className="fixed inset-2 z-[80] flex flex-col overflow-hidden rounded-2xl border border-blue-500/20 bg-[#05070d] text-white shadow-2xl md:inset-auto md:bottom-4 md:right-4 md:h-[660px] md:w-[900px] md:max-w-[94vw] md:flex-row">
      {/* Avatar stage */}
      <div className="relative flex h-48 min-h-[12rem] shrink-0 flex-col bg-[#05070d] md:h-auto md:min-h-[360px] md:w-[32%] md:min-w-[260px] md:max-w-[300px]">
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          {/* Keep every provider mounted so connections persist across tab switches.
              Only the active provider is visible; the others stay hidden but live. */}
          <div className={cn("absolute inset-0", style === "3d" ? "" : "invisible pointer-events-none")}>
            <Avatar3D amplitude={voice.amplitude} speaking={voice.isSpeaking} />
          </div>
          <div className={cn("absolute inset-0", style === "did" ? "" : "invisible pointer-events-none")}>
            <AvatarRealistic
              ref={realisticRef}
              lang={lang}
              amplitude={voice.amplitude}
              speaking={voice.isSpeaking}
              onStatusChange={setDidStatus}
            />
          </div>
          <div className={cn("absolute inset-0", style === "simli" ? "" : "invisible pointer-events-none")}>
            <AvatarSimli
              ref={simliRef}
              imageUrl={simliConfig?.imageUrl ?? activeProvider?.imageUrl ?? null}
              faceId={simliConfig?.faceId ?? null}
              active={style === "simli"}
              onStatusChange={setSimliStatus}
            />
          </div>

        </div>


        {/* Bottom-right floating provider switcher with live status dots */}
        {enabledList.length > 0 ? (
          <div className="pointer-events-none absolute bottom-14 right-2 z-20 flex justify-end md:bottom-16 md:right-3">
            <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-black/70 p-1 shadow-lg backdrop-blur">
              {([
                { id: "3d" as const, label: "3D", icon: Sparkles, status: "live" as const },
                { id: "did" as const, label: "D-ID", icon: User2, status: style === "did" ? didStatus : "idle" },
                { id: "simli" as const, label: "Salone", icon: Video, status: style === "simli" ? simliStatus : "idle" },
              ])
                .filter((p) => enabledList.includes(p.id))
                .map((p) => {
                const Icon = p.icon;
                const dot =
                  p.status === "live" ? "bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]"
                  : p.status === "connecting" ? "bg-amber-400 animate-pulse"
                  : p.status === "error" ? "bg-red-400"
                  : "bg-white/30";
                const active = style === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setStyle(p.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                      active ? "bg-blue-500 text-white" : "text-white/75 hover:bg-white/10 hover:text-white",
                    )}
                    aria-label={`Switch to ${p.label} avatar (${p.status})`}
                    title={`${p.label} · ${p.status}`}
                  >
                    <span className={cn("inline-block h-1.5 w-1.5 rounded-full", dot)} />
                    <Icon className="h-3 w-3" />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <div className="rounded-md bg-black/70 px-3 py-2 text-xs text-white/70">Avatar unavailable</div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between border-t border-white/10 bg-black/60 px-3 py-2 backdrop-blur">
          <div>
            <div className="text-sm font-semibold tracking-wide">AutoMate</div>
            <div className="text-[10px] uppercase tracking-wider text-blue-400/80">
              {voice.isSpeaking ? "Speaking…" : voice.isRecording ? "Listening…" : "AI advisor"}
            </div>
          </div>
          <Button
            size="sm"
            variant={voice.isSpeaking ? "destructive" : "secondary"}
            className="h-7 gap-1 text-[11px]"
            onClick={() => {
              if (voice.isSpeaking || style === "simli") {
                voice.cancel();
                try { simliRef.current?.stopSpeaking(); } catch { /* noop */ }
                return;
              }
              setVoiceOn((v) => !v);
            }}
          >
            {voice.isSpeaking ? <><Square className="h-3 w-3" /> Stop</>
              : voiceOn ? <><Volume2 className="h-3 w-3" /> Voice on</>
              : <><VolumeX className="h-3 w-3" /> Voice off</>}
          </Button>
        </div>
      </div>

      {/* Chat column */}
      <div className="flex flex-1 min-w-0 flex-col bg-[#0a0e1a]">
        <header className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_10px_2px_rgba(96,165,250,0.6)]" />
            <span className="truncate text-sm font-semibold">AutoMate Avatar</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px] text-white/70 hover:text-white hover:bg-white/10" onClick={() => setShowHistory((v) => !v)}>
              <History className="h-3.5 w-3.5" /> History
            </Button>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px] text-white/70 hover:text-white hover:bg-white/10" onClick={newConversation}>
              <MessageSquarePlus className="h-3.5 w-3.5" /> New
            </Button>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="h-7 rounded-md border border-white/10 bg-white/5 px-2 text-[11px] focus:outline-none"
              aria-label="Language"
            >
              {(Object.keys(LANG_LABEL) as Lang[]).map((k) => (
                <option key={k} value={k} className="bg-[#0a0e1a]">{LANG_LABEL[k]}</option>
              ))}
            </select>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* History dropdown */}
        {showHistory ? (
          <div data-lenis-prevent className="max-h-56 overflow-y-auto overscroll-contain border-b border-white/10 bg-black/40 px-2 py-1.5">
            {threads.length === 0 ? (
              <p className="px-2 py-3 text-[11px] text-white/50">No saved avatar conversations yet.</p>
            ) : threads.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "group flex items-center gap-1 rounded-md px-2 py-1.5 text-[12px]",
                  t.id === threadId ? "bg-blue-500/15 text-white" : "text-white/70 hover:bg-white/5",
                )}
              >
                <button className="flex-1 truncate text-left" onClick={() => { historyLoadRequestedRef.current = true; userRequestedSpeechRef.current = false; skipNextSpeakRef.current = true; setChatSessionId(`avatar-${t.id}`); setThreadId(t.id); setShowHistory(false); }}>
                  {t.title || "Conversation"}
                </button>
                <button
                  className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-300"
                  onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }}
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <AvatarActionContext.Provider value={(text: string) => {
          if (isLoading) return;
          voice.cancel();
          try { simliRef.current?.stopSpeaking(); } catch { /* noop */ }
          userRequestedSpeechRef.current = true;
          skipNextSpeakRef.current = false;
          sendMessage({ text: `${text}\n\n(${LANG_INSTRUCTION[lang]})` });
        }}>
        <Conversation data-lenis-prevent className="flex-1 min-h-0 overscroll-contain">
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState
                title="Hello — I'm AutoMate."
                description="Ask about a part number, paste a VIN, describe a warning light, or talk to me with the mic."
              />
            ) : null}
            {messages.map((m) => (
              <Message from={m.role} key={m.id}>
                <MessageContent>
                  {(m.parts ?? []).map((part: any, i: number) => {
                    if (part.type === "text") {
                      return m.role === "assistant"
                        ? <MessageResponse key={i}>{part.text}</MessageResponse>
                        : <span key={i} className="whitespace-pre-wrap">{part.text}</span>;
                    }
                    if (typeof part.type === "string" && part.type.startsWith("tool-")) {
                      return <ToolPartView key={i} part={part} />;
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
        </AvatarActionContext.Provider>

        <PromptInput onSubmit={handleSend} className="border-t border-white/10 bg-[#0a0e1a]">
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about parts, VIN, warning lights…"
            disabled={isLoading}
          />
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputButton
                type="button"
                onClick={handleMic}
                className={cn(voice.isRecording && "bg-red-500/20 text-red-300")}
              >
                {voice.isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                <span className="sr-only">{voice.isRecording ? "Stop" : "Talk"}</span>
              </PromptInputButton>
            </PromptInputTools>
            <PromptInputSubmit status={status} disabled={!input.trim() || isLoading} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
