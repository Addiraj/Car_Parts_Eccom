import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { parseUA } from "@/lib/ua-parse";

async function getUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

export const logLogin = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        method: z.string().max(30).optional().default("password"),
        session_id: z.string().max(120).optional().nullable(),
      })
      .parse(d ?? {})
  )
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) return { ok: true };

    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const { device, browser, os } = parseUA(ua);

    await supabase.from("user_login_history").insert({
      user_id: userId,
      method: data.method,
      session_id: data.session_id ?? null,
      ip_address: null,
      user_agent: ua,
      device,
      browser,
      os,
      location: null,
    });
    return { ok: true };
  });

export const listMyLogins = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from("user_login_history")
    .select("*")
    .eq("user_id", userId)
    .order("logged_in_at", { ascending: false })
    .limit(50);

  if (error) return [];
  return data ?? [];
});

export const completeOnboarding = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        full_name: z.string().trim().min(2).max(100),
        customer_type: z.enum(["IND", "GAR", "EXP"]),
        phone: z.string().trim().max(30).optional().nullable(),
        company_name: z.string().trim().max(150).optional().nullable(),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) throw new Error("Authentication required");

    const patch: Record<string, unknown> = {
      full_name: data.full_name,
      customer_type: data.customer_type as any,
    };
    if (data.phone !== undefined) patch.phone = data.phone || null;
    if (data.company_name !== undefined) patch.company_name = data.company_name || null;

    const { error } = await supabase.from("profiles").update(patch as any).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const needsOnboarding = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getUserId();
  if (!userId) return { needs: false };

  const { data } = await supabase
    .from("profiles")
    .select("full_name, customer_type")
    .eq("id", userId)
    .maybeSingle();

  const name = (data?.full_name ?? "").trim();
  const ct = (data?.customer_type ?? "").toString().trim();
  return { needs: !name || !ct };
});
