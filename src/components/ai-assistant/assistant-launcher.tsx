import * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X, Maximize2, Minimize2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import logoUrl from "@/assets/automate-logo.png";
import { AssistantChat } from "./assistant-chat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { listThreads, createThread, deleteThread as deleteThreadFn } from "@/lib/ai-chat.functions";

type Thread = { id: string; title: string };

export function AssistantLauncher() {
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [full, setFull] = React.useState(false);
  const [threads, setThreads] = React.useState<Thread[]>([]);
  const [threadId, setThreadId] = React.useState<string | null>(null);
  const [supabaseUserId, setSupabaseUserId] = React.useState<string | null>(null);
  const [showAuthDialog, setShowAuthDialog] = React.useState(false);
  const auth = useAuth();
  const navigate = useNavigate();

  const fetchListThreads = useServerFn(listThreads);
  const fetchCreateThread = useServerFn(createThread);
  const fetchDeleteThread = useServerFn(deleteThreadFn);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSupabaseUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSupabaseUserId(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const hasJwtToken = typeof window !== "undefined" && !!localStorage.getItem("jwt_token");
  const currentUserId = auth?.user?.id || supabaseUserId || (hasJwtToken ? "jwt-user" : null);
  const isLoggedIn = !!currentUserId;

  const refresh = React.useCallback(async () => {
    if (!currentUserId) { setThreads([]); return; }
    try {
      const data = await fetchListThreads();
      const filtered = (data ?? []).filter((t: any) => {
        const src = (t.vehicle_context as any)?.source;
        return src !== "avatar";
      });
      setThreads(filtered.map((t: any) => ({ id: t.id, title: t.title })) as Thread[]);
    } catch (error) {
      console.error(error);
      setThreads([]);
    }
  }, [currentUserId, fetchListThreads]);

  React.useEffect(() => { if (open) refresh(); }, [open, refresh, threadId]);

  const newThread = async (): Promise<string | null> => {
    if (!isLoggedIn) { toast.error("Please sign in to start a conversation"); return null; }
    setThreadId(null);
    return null;
  };

  const deleteThread = async (id: string) => {
    try {
      await fetchDeleteThread({ data: { id } });
      if (threadId === id) setThreadId(null);
      refresh();
    } catch (error) {
      toast.error("Failed to delete thread");
    }
  };

  if (!mounted) return null;

  const handleLauncherClick = () => {
    if (!isLoggedIn) { setShowAuthDialog(true); return; }
    setOpen(true);
  };

  const launcher = (
    <button
      onClick={handleLauncherClick}
      className={cn(
        "fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full pl-3 pr-4 py-3",
        "bg-primary text-primary-foreground",
        "shadow-2xl ring-1 ring-black/10 hover:scale-105 transition-transform",
        open ? "opacity-0 pointer-events-none" : "opacity-100",
      )}
      aria-label="Open AI assistant"
    >
      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/15">
        {isLoggedIn ? <span className="absolute inset-0 rounded-full bg-primary-foreground/20 animate-ping" /> : null}
        <MessageCircle className="relative h-5 w-5" />
      </span>
      <span className="text-sm font-semibold">Chat with us</span>
    </button>
  );

  const panel = open && (
    <div
      className={cn(
        "fixed z-[70] flex flex-col overflow-hidden rounded-2xl border border-border/60",
        "bg-background/95 backdrop-blur-xl shadow-2xl",
        full
          ? "inset-2 md:inset-6"
          : "bottom-4 right-4 left-4 top-16 md:left-auto md:top-auto md:h-[660px] md:w-[620px] md:max-w-[95vw]",
      )}
      role="dialog"
      aria-label="AI assistant"
    >
      <header className="flex items-center justify-between border-b border-border/60 bg-card/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <img src={logoUrl} alt="" width={28} height={28} className="h-7 w-7 object-contain" loading="lazy" />
          <div>
            <div className="text-sm font-semibold leading-none">Chat with us</div>
            <div className="text-[10px] text-muted-foreground">AI parts advisor</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 hidden md:inline-flex" onClick={() => setFull((v) => !v)} aria-label="Toggle fullscreen">
            {full ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-hidden">
        <AssistantChat
          threadId={threadId}
          threads={threads}
          onSelectThread={setThreadId}
          onNewThread={newThread}
          onDeleteThread={deleteThread}
          onThreadIdResolved={(id) => { setThreadId(id); refresh(); }}
        />
      </div>
    </div>
  );

  const authDialog = (
    <AlertDialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sign in to chat with us</AlertDialogTitle>
          <AlertDialogDescription>
            Create an account or sign in to ask about parts, VINs, warning lights, and more.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not now</AlertDialogCancel>
          <Button variant="outline" onClick={() => { setShowAuthDialog(false); navigate({ to: "/auth/signup" }); }}>
            Create account
          </Button>
          <AlertDialogAction onClick={() => { setShowAuthDialog(false); navigate({ to: "/auth/login", search: { redirect: typeof window !== "undefined" ? window.location.pathname + window.location.search : "" } }); }}>
            Sign in
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return createPortal(<>{launcher}{panel}{authDialog}</>, document.body);
}
