import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const listActiveBanners = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data, error } = await supabase
      .from("hero_banners")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .limit(10);
    if (error) {
      console.warn("Error fetching active banners from Supabase:", error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error("Error fetching active banners:", e);
    return [];
  }
});

export const listActivePromos = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data, error } = await supabase
      .from("promo_sections")
      .select("*")
      .eq("is_active", true)
      .order("slot", { ascending: true });
    if (error) {
      console.warn("Error fetching active promos from Supabase:", error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error("Error fetching active promos:", e);
    return [];
  }
});

export const listActiveTestimonials = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data, error } = await supabase
      .from("testimonials")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .limit(12);
    if (error) {
      console.warn("Error fetching active testimonials from Supabase:", error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error("Error fetching active testimonials:", e);
    return [];
  }
});

export const getFooterSettings = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("data")
      .eq("id", "footer")
      .maybeSingle();
    if (error) {
      console.warn("Error fetching footer settings from Supabase:", error.message);
      return null;
    }
    return data?.data ?? null;
  } catch (e) {
    console.error("Error fetching footer settings:", e);
    return null;
  }
});
