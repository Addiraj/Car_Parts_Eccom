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
import { X, Mic, Square, Volume2, VolumeX, History, Video, MessageSquarePlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AvatarSimli, type AvatarSimliHandle } from "./avatar-simli";
import { useVoice } from "./use-voice";
import { ToolPartView, AvatarActionContext } from "./tool-cards";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getActiveAvatarProvider, getSimliConfig } from "@/lib/avatar/avatar-providers.functions";
import { useAuth } from "@/hooks/use-auth";
import { listThreads, deleteThread as deleteThreadFn, getThreadMessages } from "@/lib/ai-chat.functions";

type Lang = "en" | "hi" | "ar" | "gu";
type Thread = { id: string; title: string; last_message_at: string };

const LANG_LABEL: Record<Lang, string> = { en: "English", hi: "हिंदी", ar: "العربية", gu: "ગુજરાતી" };
const LANG_INSTRUCTION: Record<Lang, string> = {
  en: "Reply in English.",
  hi: "Reply in Hindi (Devanagari script).",
  ar: "Reply in Arabic.",
  gu: "Reply in Gujarati.",
};

export function AvatarPanel({ onClose }: { onClose: () => void }) {
  const [lang, setLang] = React.useState<Lang>("en");
  const [threadId, setThreadId] = React.useState<string | null>(null);
  // Stable chat session id — only changes when the user explicitly starts a
  // new conversation or loads history. Decoupled from threadId so the server
  // assigning a fresh threadId mid-stream doesn't remount useChat and wipe
  // the in-flight assistant message.
  const [chatSessionId, setChatSessionId] = React.useState<string>(() => `avatar-${Date.now()}`);
  const [threads, setThreads] = React.useState<Thread[]>([]);
  const [selectedDayOffset, setSelectedDayOffset] = React.useState<number>(0);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [voiceOn, setVoiceOn] = React.useState(true);
  const [showHistory, setShowHistory] = React.useState(false);
  const [simliStatus, setSimliStatus] = React.useState<"idle" | "connecting" | "live" | "error">("idle");
  const lastSpokenId = React.useRef<string | null>(null);
  const spokenOffsetRef = React.useRef<{ id: string | null; offset: number }>({ id: null, offset: 0 });
  const skipNextSpeakRef = React.useRef(false);
  const userRequestedSpeechRef = React.useRef(false);
  const historyLoadRequestedRef = React.useRef(false);
  const autoResumedRef = React.useRef(false);
  const simliRef = React.useRef<AvatarSimliHandle | null>(null);

  const fetchListThreads = useServerFn(listThreads);
  const fetchDeleteThread = useServerFn(deleteThreadFn);
  const fetchGetThreadMessages = useServerFn(getThreadMessages);

  const getActiveProvider = useServerFn(getActiveAvatarProvider);
  const { data: activeProvider } = useQuery({
    queryKey: ["active-avatar-provider"],
    queryFn: () => getActiveProvider(),
    staleTime: 60_000,
  });
  const { data: simliConfig } = useQuery({
    queryKey: ["simli-config"],
    queryFn: () => getSimli(),
    staleTime: 60_000,
  });

  const voice = useVoice();
  const auth = useAuth();

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || auth?.user?.id || (typeof window !== "undefined" && localStorage.getItem("jwt_token") ? "jwt-user" : null));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || auth?.user?.id || (typeof window !== "undefined" && localStorage.getItem("jwt_token") ? "jwt-user" : null));
    });
    return () => { sub.subscription.unsubscribe(); };
  }, [auth?.user?.id]);

  // Simli self-connects on mount inside AvatarSimli.





  const refreshThreads = React.useCallback(async () => {
    if (!userId) { setThreads([]); return; }
    try {
      const data = await fetchListThreads();
      console.log("[AvatarPanel] fetchListThreads raw count:", data?.length);
      const avatarOnly = (data ?? []).filter((t: any) => {
        let ctx = t.vehicle_context;
        if (typeof ctx === "string") {
          try { ctx = JSON.parse(ctx); } catch { }
        }
        return ctx?.source === "avatar";
      });
      console.log("[AvatarPanel] avatarOnly count:", avatarOnly.length);
      setThreads(avatarOnly.map((t: any) => ({
        id: t.id,
        title: t.title,
        last_message_at: t.last_message_at
      })) as Thread[]);
    } catch (e) {
      console.error("[AvatarPanel] refreshThreads error:", e);
      setThreads([]);
    }
  }, [userId, fetchListThreads]);

  React.useEffect(() => { refreshThreads(); }, [refreshThreads, threadId]);

  React.useEffect(() => {
    if (showHistory) {
      setSelectedDayOffset(0);
      const today = new Date();
      const todayThread = threads.find((t) => {
        if (!t.last_message_at) return false;
        const d = new Date(t.last_message_at);
        return d.toDateString() === today.toDateString();
      });
      if (todayThread && todayThread.id !== threadId) {
        historyLoadRequestedRef.current = true;
        userRequestedSpeechRef.current = false;
        skipNextSpeakRef.current = true;
        setChatSessionId(`avatar-${todayThread.id}`);
        setThreadId(todayThread.id);
      }
    }
  }, [showHistory, threads, threadId]);

  // Auto-resume Today's chat thread automatically when the user comes to Avatar
  React.useEffect(() => {
    if (threads.length > 0 && !threadId && !autoResumedRef.current) {
      const today = new Date();
      const todayThread = threads.find((t) => {
        if (!t.last_message_at) return false;
        const d = new Date(t.last_message_at);
        return d.toDateString() === today.toDateString();
      });
      if (todayThread) {
        autoResumedRef.current = true;
        historyLoadRequestedRef.current = true;
        userRequestedSpeechRef.current = false;
        skipNextSpeakRef.current = true;
        setChatSessionId(`avatar-${todayThread.id}`);
        setThreadId(todayThread.id);
      }
    }
  }, [threads, threadId]);

  const transport = React.useMemo(
    () => new DefaultChatTransport({
      api: "/api/ai/chat",
      body: () => ({ threadId, languageHint: LANG_INSTRUCTION[lang], source: "avatar" }),
      headers: async () => {
        const { data } = await supabase.auth.getSession();
        const t = data.session?.access_token || (typeof window !== "undefined" ? localStorage.getItem("jwt_token") : null);
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
    if (!historyLoadRequestedRef.current && messages.length > 0) return;
    (async () => {
      try {
        const data = await fetchGetThreadMessages({ data: { id: threadId } });
        const ui = (data ?? []).map((m: any) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          parts: Array.isArray(m.parts) && m.parts.length ? m.parts : [{ type: "text", text: m.text ?? "" }],
          createdAt: new Date(m.created_at),
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
      } catch (err) {
        console.error("[AvatarPanel] Failed to load messages:", err);
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
    if (simliRef.current) {
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
    voice.speak(fullText);
  }, [status, messages, voiceOn, voice]);

  const [input, setInput] = React.useState("");

  const ensureSignedIn = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token || (typeof window !== "undefined" ? localStorage.getItem("jwt_token") : null);
    if (!token) { toast.error("Please sign in again to chat"); return false; }
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
    try {
      await fetchDeleteThread({ data: { id } });
      if (threadId === id) { setThreadId(null); setMessages([]); }
      refreshThreads();
    } catch (error) {
      toast.error("Failed to delete thread");
    }
  };

  const getDayLabel = (offset: number) => {
    if (offset === 0) return "Today";
    if (offset === 1) return "Yesterday";
    const date = new Date();
    date.setDate(date.getDate() - offset);
    return date.toLocaleDateString("en-US", { weekday: "short" });
  };

  const filteredThreads = React.useMemo(() => {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() - selectedDayOffset);
    const targetDateStr = targetDate.toDateString();

    return threads.filter((t) => {
      if (!t.last_message_at) return false;
      const d = new Date(t.last_message_at);
      return d.toDateString() === targetDateStr;
    });
  }, [threads, selectedDayOffset]);

  return (
    <div className="fixed inset-2 z-[80] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl md:inset-auto md:bottom-4 md:right-4 md:h-[660px] md:w-[900px] md:max-w-[94vw] md:flex-row">
      <div className="relative flex h-48 min-h-[12rem] shrink-0 flex-col bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 md:h-auto md:min-h-[360px] md:w-[32%] md:min-w-[260px] md:max-w-[300px]">
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <AvatarSimli
              ref={simliRef}
              imageUrl={simliConfig?.imageUrl ?? activeProvider?.imageUrl ?? null}
              faceId={simliConfig?.faceId ?? null}
              active={true}
              onStatusChange={setSimliStatus}
            />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between border-t border-slate-200 bg-white/90 px-3 py-2 backdrop-blur shadow-xs">
          <div>
            <div className="text-sm font-semibold tracking-wide text-slate-900">AutoMate</div>
            <div className="text-[10px] uppercase tracking-wider text-blue-600 font-medium">
              {voice.isSpeaking ? "Speaking…" : voice.isRecording ? "Listening…" : "AI advisor"}
            </div>
          </div>
          <Button
            size="sm"
            variant={voice.isSpeaking ? "destructive" : "secondary"}
            className="h-7 gap-1 text-[11px]"
            onClick={() => {
              if (voice.isSpeaking || simliStatus === "live") {
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
      <div className="flex flex-1 min-w-0 flex-col bg-white">
        <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 bg-slate-50">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex h-2 w-2 rounded-full bg-blue-600 shadow-[0_0_8px_1px_rgba(37,99,235,0.4)]" />
            <span className="truncate text-sm font-semibold text-slate-800">AutoMate Avatar</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px] text-slate-600 hover:text-slate-900 hover:bg-slate-200/50" onClick={() => setShowHistory((v) => !v)}>
              <History className="h-3.5 w-3.5" /> History
            </Button>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px] text-slate-600 hover:text-slate-900 hover:bg-slate-200/50" onClick={newConversation}>
              <MessageSquarePlus className="h-3.5 w-3.5" /> New
            </Button>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[11px] focus:outline-none text-slate-700 shadow-xs"
              aria-label="Language"
            >
              {(Object.keys(LANG_LABEL) as Lang[]).map((k) => (
                <option key={k} value={k} className="bg-white text-slate-900">{LANG_LABEL[k]}</option>
              ))}
            </select>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* History dropdown */}
        {showHistory ? (
          <div className="border-b border-slate-200 bg-slate-50 flex flex-col shadow-inner">
            {/* Day navigation tabs */}
            <div className="flex gap-1.5 border-b border-slate-200 px-3 py-2 overflow-x-auto scrollbar-none">
              {[0, 1, 2, 3, 4, 5, 6].map((offset) => (
                <button
                  key={offset}
                  onClick={() => {
                    setSelectedDayOffset(offset);
                    const targetDate = new Date();
                    targetDate.setDate(targetDate.getDate() - offset);
                    const targetDateStr = targetDate.toDateString();

                    const threadForDay = threads.find((t) => {
                      if (!t.last_message_at) return false;
                      const d = new Date(t.last_message_at);
                      return d.toDateString() === targetDateStr;
                    });

                    if (threadForDay) {
                      historyLoadRequestedRef.current = true;
                      userRequestedSpeechRef.current = false;
                      skipNextSpeakRef.current = true;
                      setChatSessionId(`avatar-${threadForDay.id}`);
                      setThreadId(threadForDay.id);
                    } else {
                      setThreadId(null);
                      setMessages([]);
                    }
                  }}
                  className={cn(
                    "px-2.5 py-1 text-[11px] rounded-md transition-colors whitespace-nowrap",
                    selectedDayOffset === offset
                      ? "bg-blue-50 border border-blue-200 text-blue-700 font-medium shadow-xs"
                      : "text-slate-500 border border-transparent hover:text-slate-900 hover:bg-slate-200/50"
                  )}
                >
                  {getDayLabel(offset)}
                </button>
              ))}
            </div>

            {/* Filtered thread list */}
            <div data-lenis-prevent className="max-h-56 overflow-y-auto overscroll-contain px-2 py-1.5">
              {filteredThreads.length === 0 ? (
                <p className="px-2 py-4 text-center text-[11px] text-slate-400">No conversations on this day.</p>
              ) : filteredThreads.map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-md px-2 py-1.5 text-[12px] my-0.5 transition-colors",
                    t.id === threadId ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900",
                  )}
                >
                  <button className="flex-1 truncate text-left" onClick={() => { historyLoadRequestedRef.current = true; userRequestedSpeechRef.current = false; skipNextSpeakRef.current = true; setChatSessionId(`avatar-${t.id}`); setThreadId(t.id); setShowHistory(false); }}>
                    {t.title || "Conversation"}
                  </button>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500"
                    onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
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
              {(() => {
                let lastDateStr = "";
                return messages.map((m) => {
                  const date = m.createdAt ? new Date(m.createdAt) : new Date();
                  const dateStr = date.toDateString();
                  const showDivider = dateStr !== lastDateStr;
                  lastDateStr = dateStr;

                  const formattedDay = (() => {
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);

                    if (dateStr === today.toDateString()) return "Today";
                    if (dateStr === yesterday.toDateString()) return "Yesterday";
                    return date.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short" });
                  })();

                  return (
                    <React.Fragment key={m.id}>
                      {showDivider ? (
                        <div className="flex items-center my-3.5 px-4">
                          <div className="flex-1 border-t border-slate-200" />
                          <span className="mx-3 text-[10px] uppercase tracking-wider font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full select-none shadow-xs">
                            {formattedDay}
                          </span>
                          <div className="flex-1 border-t border-slate-200" />
                        </div>
                      ) : null}
                      <Message from={m.role}>
                        <MessageContent>
                          {(m.parts ?? []).map((part: any, i: number) => {
                            if (part.type === "text") {
                              return m.role === "assistant"
                                ? <MessageResponse key={i}>{part.text}</MessageResponse>
                                : <span key={i} className="whitespace-pre-wrap">{part.text}</span>;
                            }
                            if (typeof part.type === "string" && part.type.startsWith("tool-")) {
                              return <ToolPartView key={`part-${i}`} part={part} />;
                            }
                            return null;
                          })}
                          {(!m.parts || m.parts.length === 0) && m.content ? (
                            m.role === "assistant"
                              ? <MessageResponse key="content">{m.content}</MessageResponse>
                              : <span key="content" className="whitespace-pre-wrap">{m.content}</span>
                          ) : null}
                          {(m.toolInvocations ?? []).map((toolInv: any, i: number) => (
                            <ToolPartView key={`tool-${i}`} part={{ type: "tool-invocation", toolInvocation: toolInv }} />
                          ))}
                        </MessageContent>
                      </Message>
                    </React.Fragment>
                  );
                });
              })()}
              {status === "submitted" ? <Shimmer>Thinking…</Shimmer> : null}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        </AvatarActionContext.Provider>

        <PromptInput onSubmit={handleSend} className="border-t border-slate-200 bg-white">
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
