import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { parseUA } from "@/lib/ua-parse";

export const logLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      method: z.string().max(30).optional().default("password"),
      session_id: z.string().max(120).optional().nullable(),
    }).parse(d ?? {})
  )
  .handler(async ({ data, context }) => {
    const req = getRequest();
    const ua = req?.headers.get("user-agent") ?? "";
    const ipRaw =
      req?.headers.get("cf-connecting-ip") ??
      req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req?.headers.get("x-real-ip") ?? null;
    const country = req?.headers.get("cf-ipcountry") ?? null;
    const { device, browser, os } = parseUA(ua);

    await (context.supabase as any).from("user_login_history").insert({
      user_id: context.userId,
      method: data.method,
      session_id: data.session_id ?? null,
      ip_address: ipRaw,
      user_agent: ua,
      device, browser, os,
      location: country,
    });
    return { ok: true };
  });

export const logLogout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Find the most recent active session and set logout_time
    const { data: latestSession } = await (context.supabase as any)
      .from("user_login_history")
      .select("id")
      .eq("user_id", context.userId)
      .is("logout_time", null)
      .order("login_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestSession?.id) {
      await (context.supabase as any)
        .from("user_login_history")
        .update({ logout_time: new Date().toISOString() })
        .eq("id", latestSession.id);
    }
    
    return { ok: true };
  });

export const listMyLogins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("user_login_history")
      .select("*")
      .eq("user_id", context.userId)
      .order("logged_in_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      full_name: z.string().trim().min(2).max(100),
      customer_type: z.enum(["IND", "GAR", "EXP"]),
      phone: z.string().trim().max(30).optional().nullable(),
      company_name: z.string().trim().max(150).optional().nullable(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {
      full_name: data.full_name,
      customer_type: data.customer_type as any,
    };
    if (data.phone !== undefined) patch.phone = data.phone || null;
    if (data.company_name !== undefined) patch.company_name = data.company_name || null;
    const { error } = await context.supabase
      .from("profiles")
      .update(patch as any)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const needsOnboarding = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("full_name, customer_type")
      .eq("id", context.userId)
      .maybeSingle();
    const name = (data?.full_name ?? "").trim();
    const ct = (data?.customer_type ?? "").toString().trim();
    return { needs: !name || !ct };
  });
