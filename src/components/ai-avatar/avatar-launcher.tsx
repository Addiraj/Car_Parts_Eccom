import * as React from "react";
import { createPortal } from "react-dom";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useAuth } from "@/hooks/use-auth";

const AvatarPanel = React.lazy(() => import("./avatar-panel").then((m) => ({ default: m.AvatarPanel })));

export function AvatarLauncher() {
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [supabaseUserId, setSupabaseUserId] = React.useState<string | null>(null);
  const [showAuthDialog, setShowAuthDialog] = React.useState(false);
  const auth = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSupabaseUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSupabaseUserId(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!mounted) return null;

  const hasJwtToken = typeof window !== "undefined" && !!localStorage.getItem("jwt_token");
  const currentUserId = auth?.user?.id || supabaseUserId || (hasJwtToken ? "jwt-user" : null);
  const isLoggedIn = !!currentUserId;

  const handleClick = () => {
    if (!isLoggedIn) {
      setShowAuthDialog(true);
      return;
    }
    setOpen(true);
  };

  const launcher = (
    <button
      onClick={handleClick}
      className={cn(
        // "fixed bottom-5 right-[200px] z-[60] flex items-center gap-2 rounded-full pl-3 pr-4 py-3",
        "fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-[200px] z-[60] flex items-center gap-2 rounded-full pl-3 pr-4 py-3",
        "bg-gradient-to-br from-blue-600 to-indigo-700 text-white",
        "shadow-[0_10px_30px_-10px_rgba(59,130,246,0.7)] ring-1 ring-blue-400/30",
        "hover:scale-105 transition-transform",
        open ? "opacity-0 pointer-events-none" : "opacity-100",
      )}
      aria-label="Open AI avatar advisor"
    >
      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
        {isLoggedIn ? <span className="absolute inset-0 rounded-full bg-blue-300/40 animate-ping" /> : null}
        <Bot className="relative h-5 w-5" />
      </span>
      <span className="text-sm font-semibold">Avatar</span>
    </button>
  );

  const authDialog = (
    <AlertDialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sign in to talk with the Avatar</AlertDialogTitle>
          <AlertDialogDescription>
            Create an account or sign in to chat by voice with our AI automotive advisor.
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

  return createPortal(
    <>
      {launcher}
      {open ? (
        <React.Suspense fallback={null}>
          <AvatarPanel onClose={() => setOpen(false)} />
        </React.Suspense>
      ) : null}
      {authDialog}
    </>,
    document.body,
  );
}
