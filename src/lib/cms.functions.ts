import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const listActiveBanners = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("hero_banners")
    .select("id, title, subtitle, image_url, cta_label, cta_url, display_order, starts_at, ends_at")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .limit(10);
  if (error) return [];
  return (data ?? []).filter((b: any) =>
    (!b.starts_at || b.starts_at <= nowIso) && (!b.ends_at || b.ends_at >= nowIso),
  );
});

export const listActivePromos = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("promo_sections")
    .select("id, slot, title, description, image_url, link_url, badge, display_order")
    .eq("is_active", true)
    .order("slot")
    .order("display_order");
  if (error) return [];
  return data ?? [];
});

export const listActiveTestimonials = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("testimonials")
    .select("id, author_name, author_role, avatar_url, rating, quote, display_order")
    .eq("is_active", true)
    .order("display_order")
    .limit(12);
  if (error) return [];
  return data ?? [];
});

export const getFooterSettings = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("data")
    .eq("id", "footer")
    .maybeSingle();
  if (error) return null;
  return (data?.data as any) ?? null;
});
