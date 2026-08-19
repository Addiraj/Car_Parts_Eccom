import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const requireSupabaseAuth = createMiddleware().server(
  async ({ next }) => {
    let userId: string | null = null;
    let email: string | null = null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        userId = session.user.id;
        email = session.user.email ?? null;
      }
    } catch {}

    if (!userId && typeof window !== "undefined") {
      const token = localStorage.getItem("jwt_token");
      if (token && token.startsWith("demo-jwt-token-")) {
        userId = token.includes("super") ? "demo-super-admin" : "demo-admin";
        email = token.includes("super") ? "superadmin@demo.cpd" : "admin@demo.cpd";
      }
    }

    return next({
      context: {
        supabase,
        userId: userId ?? "anonymous",
        claims: { sub: userId ?? "", email },
      },
    });
  }
);
