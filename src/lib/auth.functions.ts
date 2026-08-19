import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const login = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email(), password: z.string().min(1) }))
  .handler(async ({ data: { email, password } }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Fallback for demo users
      if (email === "admin@demo.cpd" || email === "superadmin@demo.cpd") {
        return {
          token: "demo-jwt-token-" + Date.now(),
          user: { id: "demo-" + (email.startsWith("super") ? "super-admin" : "admin"), email },
        };
      }
      throw new Error(error.message || "Invalid credentials");
    }

    const token = data.session?.access_token || "";
    const user = data.user
      ? { id: data.user.id, email: data.user.email || email }
      : { id: "", email };

    return { token, user };
  });

export const register = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      password: z.string().min(6),
      full_name: z.string().min(1).optional(),
      phone: z.string().optional(),
    })
  )
  .handler(async ({ data: { email, password, full_name, phone } }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, phone },
      },
    });

    if (error) {
      throw new Error(error.message || "Failed to register user");
    }

    const user = data.user
      ? { id: data.user.id, email: data.user.email || email }
      : { id: "", email };
    const token = data.session?.access_token || "";

    if (user.id) {
      await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        full_name: full_name || null,
        phone: phone || null,
      });
    }

    return { token, user };
  });

export const getSession = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data: { token } }) => {
    try {
      if (token.startsWith("demo-jwt-token-")) {
        const isSuper = token.includes("super");
        return {
          user: {
            id: isSuper ? "demo-super-admin" : "demo-admin",
            email: isSuper ? "superadmin@demo.cpd" : "admin@demo.cpd",
          },
          profile: {
            id: isSuper ? "demo-super-admin" : "demo-admin",
            full_name: isSuper ? "Demo Super Admin" : "Demo Admin",
            customer_type: "IND",
          },
        };
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        return { user: null, profile: null };
      }

      const user = { id: session.user.id, email: session.user.email || "" };
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      return { user, profile: profile || null };
    } catch {
      return { user: null, profile: null };
    }
  });
