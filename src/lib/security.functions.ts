import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { parseUA } from "@/lib/ua-parse";
import { models } from "@/lib/db/index.server";
import bcrypt from "bcryptjs";

export async function verifyRecaptchaToken(token: string) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.warn("RECAPTCHA_SECRET_KEY not set. Skipping verification (unsafe).");
    return true; // Bypass if not configured
  }
  try {
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);

    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = await res.json();
    return data.success === true;
  } catch (error) {
    console.error("reCAPTCHA verification failed:", error);
    return false;
  }
}

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

    await models.user_login_history.create({
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
    const latestSession = await models.user_login_history.findOne({
      where: { user_id: context.userId, logout_time: null },
      order: [["login_time", "DESC"]],
      attributes: ["id"],
    });

    if (latestSession?.id) {
      await models.user_login_history.update(
        { logout_time: new Date() },
        { where: { id: latestSession.id } }
      );
    }
    
    return { ok: true };
  });

export const listMyLogins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const data = await models.user_login_history.findAll({
      where: { user_id: context.userId },
      order: [["login_time", "DESC"]],
      limit: 50,
      raw: true,
    });
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
      password: z.string().min(8),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {
      full_name: data.full_name,
      customer_type: data.customer_type,
    };
    if (data.phone !== undefined) patch.phone = data.phone || null;
    if (data.company_name !== undefined) patch.company_name = data.company_name || null;
    
    // Hash password
    const password_hash = await bcrypt.hash(data.password, 10);

    // Update user profile
    await models.users.update(patch, { where: { id: context.userId } });
    
    // Update password
    await models.users.update({ encrypted_password: password_hash }, { where: { id: context.userId } });

    return { ok: true };
  });

export const needsOnboarding = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const data = await models.users.findOne({
      where: { id: context.userId },
      attributes: ["full_name", "customer_type"],
      raw: true,
    });
    const name = (data?.full_name ?? "").trim();
    const ct = (data?.customer_type ?? "").toString().trim();
    return { needs: !name || !ct };
  });
