import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { projectPart, type CustomerType } from "@/lib/pricing";

async function viewerTier(): Promise<CustomerType> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return "IND";
    const { data: profile } = await supabase
      .from("profiles")
      .select("customer_type")
      .eq("id", session.user.id)
      .maybeSingle();
    const t = (profile?.customer_type ?? "IND") as CustomerType;
    return t === "GAR" || t === "EXP" ? t : "IND";
  } catch {
    return "IND";
  }
}

/* ============= CATALOG ============= */

export const getBrands = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data, error } = await supabase
      .from("brands")
      .select("id, slug, name, logo_url, country, display_order")
      .order("display_order", { ascending: true });
    if (error) {
      console.warn("getBrands Supabase error:", error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error("getBrands error:", e);
    return [];
  }
});

export const getBrandWithModels = createServerFn({ method: "GET" })
  .validator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    try {
      const { data: brand, error: bErr } = await supabase
        .from("brands")
        .select("id, slug, name, logo_url, country")
        .eq("slug", data.slug)
        .maybeSingle();

      if (bErr || !brand) return null;

      const { data: models } = await supabase
        .from("models")
        .select("id, slug, name, image_url")
        .eq("brand_id", brand.id);

      return {
        ...brand,
        models: models || [],
      };
    } catch (e) {
      console.error("getBrandWithModels error:", e);
      return null;
    }
  });

export const getModelWithYears = createServerFn({ method: "GET" })
  .validator((d: { brandSlug: string; modelSlug: string }) => d)
  .handler(async ({ data }) => {
    try {
      const { data: brand } = await supabase
        .from("brands")
        .select("id, name, slug")
        .eq("slug", data.brandSlug)
        .maybeSingle();
      if (!brand) return null;

      const { data: model } = await supabase
        .from("models")
        .select("id, slug, name, brand_id")
        .eq("brand_id", brand.id)
        .eq("slug", data.modelSlug)
        .maybeSingle();
      if (!model) return null;

      const { data: modelYears } = await supabase
        .from("model_years")
        .select("id, year")
        .eq("model_id", model.id);

      const yearsWithEngines = await Promise.all(
        (modelYears || []).map(async (my) => {
          const { data: engines } = await supabase
            .from("engines")
            .select("id, code, name, fuel_type, displacement")
            .eq("model_year_id", my.id);
          return {
            ...my,
            engines: engines || [],
          };
        })
      );

      return {
        brand,
        model: {
          ...model,
          model_years: yearsWithEngines,
        },
      };
    } catch (e) {
      console.error("getModelWithYears error:", e);
      return null;
    }
  });

export const getCategories = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("id, parent_id, slug, name, icon, display_order")
      .order("display_order", { ascending: true });
    if (error) return [];
    return data || [];
  } catch (e) {
    console.error("getCategories error:", e);
    return [];
  }
});

export const getCategoryParts = createServerFn({ method: "GET" })
  .validator((d: { categorySlug: string; engineId?: string | null }) => d)
  .handler(async ({ data }) => {
    try {
      const tier = await viewerTier();
      const { data: cat } = await supabase
        .from("categories")
        .select("id, name, slug, parent_id")
        .eq("slug", data.categorySlug)
        .maybeSingle();

      if (!cat) return null;

      const { data: parts } = await supabase
        .from("parts")
        .select("id, part_number, oem_number, name, price, ind_price, gar_price, export_price, stock, images, manufacturer, is_oem, brand_id")
        .eq("category_id", cat.id)
        .limit(200);

      let diagramQuery = supabase
        .from("diagrams")
        .select("id, title, image_url, width, height, engine_id")
        .eq("category_id", cat.id);

      if (data.engineId) {
        diagramQuery = diagramQuery.eq("engine_id", data.engineId);
      }

      const { data: diagrams } = await diagramQuery;

      return {
        category: cat,
        parts: (parts || []).map((p) => projectPart(p as any, tier)),
        diagrams: diagrams || [],
        viewerTier: tier,
      };
    } catch (e) {
      console.error("getCategoryParts error:", e);
      return null;
    }
  });

export const getPart = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      const tier = await viewerTier();
      let isAdmin = false;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();
        isAdmin = !!roleRow;
      }

      const { data: part } = await supabase
        .from("parts")
        .select("*, category:categories(id, name, slug, parent_id)")
        .eq("id", data.id)
        .maybeSingle();

      if (!part) return null;

      const { data: alts } = await supabase
        .from("alternative_parts")
        .select("*, alternative_part:parts(id, part_number, name, price, ind_price, gar_price, export_price, images)")
        .eq("part_id", data.id);

      let specs = part.specs;
      if (!isAdmin && specs && typeof specs === "object") {
        const HIDDEN = /price|rate|unique\s*value/i;
        specs = Object.fromEntries(Object.entries(specs as Record<string, any>).filter(([k]) => !HIDDEN.test(k)));
      }

      const projected: any = projectPart({ ...part, specs } as any, tier);
      if (isAdmin) {
        projected.ind_price = part.ind_price;
        projected.gar_price = part.gar_price;
        projected.export_price = part.export_price;
      }

      return {
        part: projected,
        alternatives: (alts || []).map((a: any) => ({
          ...a,
          part: a.alternative_part ? projectPart(a.alternative_part, tier) : null,
        })),
        viewerTier: tier,
        isAdmin,
      };
    } catch (e) {
      console.error("getPart error:", e);
      return null;
    }
  });

export const getDiagram = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      const tier = await viewerTier();
      const { data: diagram } = await supabase
        .from("diagrams")
        .select("id, title, image_url, width, height, category_id, engine_id")
        .eq("id", data.id)
        .maybeSingle();

      if (!diagram) return null;

      const { data: hotspots } = await supabase
        .from("diagram_hotspots")
        .select("id, callout_number, x, y, w, h, part_id, part:parts(id, part_number, oem_number, name, price, ind_price, gar_price, export_price, stock, images, manufacturer, is_oem)")
        .eq("diagram_id", data.id);

      return {
        ...diagram,
        hotspots: (hotspots || []).map((h: any) => ({
          ...h,
          part: h.part?.id ? projectPart(h.part, tier) : null,
        })),
      };
    } catch (e) {
      console.error("getDiagram error:", e);
      return null;
    }
  });

export const getFeaturedParts = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const tier = await viewerTier();
    const { data: parts, error } = await supabase
      .from("parts")
      .select("id, part_number, name, price, ind_price, gar_price, export_price, images, manufacturer, is_oem")
      .order("created_at", { ascending: false })
      .limit(8);
    if (error) return [];
    return (parts || []).map((p) => projectPart(p as any, tier));
  } catch (e) {
    console.error("getFeaturedParts error:", e);
    return [];
  }
});

export const listPartsPaged = createServerFn({ method: "GET" })
  .validator((d: { page?: number; pageSize?: number } = {}) => d)
  .handler(async ({ data }) => {
    try {
      const tier = await viewerTier();
      const page = Math.max(1, Math.floor(data.page ?? 1));
      const pageSize = Math.min(60, Math.max(1, Math.floor(data.pageSize ?? 24)));
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data: items, count, error } = await supabase
        .from("parts")
        .select("id, part_number, name, price, ind_price, gar_price, export_price, images, manufacturer, is_oem", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        return { items: [], total: 0, page, pageSize, viewerTier: tier };
      }

      return {
        items: (items || []).map((p) => projectPart(p as any, tier)),
        total: count ?? 0,
        page,
        pageSize,
        viewerTier: tier,
      };
    } catch (e) {
      console.error("listPartsPaged error:", e);
      return { items: [], total: 0, page: 1, pageSize: 24, viewerTier: "IND" as CustomerType };
    }
  });

/* ============= SEARCH ============= */

export const searchParts = createServerFn({ method: "GET" })
  .validator((d: { q: string; limit?: number }) => d)
  .handler(async ({ data }) => {
    try {
      const tier = await viewerTier();
      const q = data.q?.trim() ?? "";
      if (!q) return { parts: [], categories: [], expanded: null, viewerTier: tier };
      const limit = Math.min(80, Math.max(1, data.limit ?? 40));

      const { data: parts } = await supabase
        .from("parts")
        .select("id, part_number, oem_number, name, price, ind_price, gar_price, export_price, images, manufacturer")
        .or(`part_number.ilike.%${q}%,oem_number.ilike.%${q}%,name.ilike.%${q}%,manufacturer.ilike.%${q}%`)
        .limit(limit);

      const { data: categories } = await supabase
        .from("categories")
        .select("id, name, slug")
        .ilike("name", `%${q}%`)
        .limit(8);

      return {
        parts: (parts || []).map((p) => projectPart(p as any, tier)),
        categories: categories || [],
        expanded: null,
        viewerTier: tier,
      };
    } catch (e) {
      console.error("searchParts error:", e);
      return { parts: [], categories: [], expanded: null, viewerTier: "IND" as CustomerType };
    }
  });

/* ============= VIN ============= */

const VinSchema = z.object({ vin: z.string().min(11).max(17) });

export const decodeVin = createServerFn({ method: "POST" })
  .validator((d: unknown) => VinSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const endpoint = "https://api.carparts.koncpt-ai.tech/api/vin/lookup";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vin: data.vin }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return { ok: false as const, error: `Custom API error ${res.status}` };
      const json = await res.json();
      if (json.Error) return { ok: false as const, error: json.Error };

      return {
        ok: true as const,
        vin: data.vin,
        details: json,
        make: json["Brand NAME"] || "Unknown",
        model: json["Model Name"] || "Unknown",
        year: json["Manufacturer Year"] || "Unknown",
      };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "VIN decode failed" };
    }
  });

export const fetchVinCatalog = createServerFn({ method: "GET" })
  .validator((d: { brand: string; modelNumber: string; modelName?: string }) =>
    z.object({ brand: z.string().min(1), modelNumber: z.string().min(1), modelName: z.string().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const base = "https://api.carparts.koncpt-ai.tech/api/vin/catalog";
    const url = `${base}?model_number=${encodeURIComponent(data.modelNumber)}&brand=${encodeURIComponent(data.brand)}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
      if (res.status === 404) {
        return { ok: false as const, status: 404, error: "Catalog not yet scraped for this model." };
      }
      if (!res.ok) {
        return { ok: false as const, status: res.status, error: `Catalog API ${res.status}` };
      }
      const json = await res.json();
      return { ok: true as const, data: json };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Failed to fetch catalog" };
    }
  });
