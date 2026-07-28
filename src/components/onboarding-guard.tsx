import { useEffect, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { checkProfileComplete } from "@/lib/onboarding";

export function OnboardingGuard() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const completeFor = useRef<string | null>(null);
  const checkingFor = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async (userId: string) => {
      // Don't run guard on auth pages
      if (pathname.startsWith("/auth")) return;
      if (completeFor.current === userId && pathname !== "/onboarding") return;
      if (checkingFor.current === userId) return;
      checkingFor.current = userId;
      const complete = await checkProfileComplete(userId);
      checkingFor.current = null;
      if (cancelled) return;
      if (!complete) {
        completeFor.current = null;
        if (pathname !== "/onboarding") navigate({ to: "/onboarding", replace: true });
      } else {
        completeFor.current = userId;
        if (pathname === "/onboarding") navigate({ to: "/", replace: true });
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) check(data.session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) { completeFor.current = null; return; }
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        if (event === "SIGNED_IN" || event === "USER_UPDATED") completeFor.current = null;
        check(session.user.id);
      }
    });

    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [pathname, navigate]);

  return null;
}
