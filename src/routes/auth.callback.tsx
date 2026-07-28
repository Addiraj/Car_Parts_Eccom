import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { logLogin } from "@/lib/security.functions";
import { checkProfileComplete } from "@/lib/onboarding";
import { getSafeRedirect } from "@/lib/redirect";
import { toast } from "sonner";

const searchSchema = z.object({
  redirect: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/auth/callback")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({ meta: [{ title: "Signing you in…" }, { name: "robots", content: "noindex" }] }),
  component: Callback,
});

function Callback() {
  const navigate = useNavigate();
  const { redirect: redirectRaw } = Route.useSearch();
  const redirectTo = getSafeRedirect(redirectRaw) ?? "";

  useEffect(() => {
    let done = false;
    const finish = async (userId: string) => {
      if (done) return;
      done = true;
      try { await logLogin({ data: { method: "email_link" } }); } catch { /* ignore */ }
      const isComplete = await checkProfileComplete(userId);
      if (!isComplete) {
        navigate({ to: "/onboarding", replace: true });
        return;
      }
      navigate({ to: (redirectTo || "/") as any });
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) finish(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED")) {
        finish(session.user.id);
      }
    });

    const timeout = setTimeout(() => {
      if (!done) {
        toast.error("Verification link expired or invalid. Please try again.");
        navigate({ to: "/auth/signup" });
      }
    }, 8000);

    return () => { sub.subscription.unsubscribe(); clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-sm text-muted-foreground">Signing you in…</div>
      </div>
    </div>
  );
}
