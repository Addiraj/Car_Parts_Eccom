import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { models, sequelize } from "@/lib/db/index.server";
import { Op } from "@/lib/db/op.server";
import { projectPart, type CustomerType } from "@/lib/pricing";
import { QueryTypes } from "sequelize";

/**
 * Read the caller's customer tier and staff role from the request bearer token (if present).
 * Catalog endpoints are public, so unauthenticated callers default to IND and not staff.
 */
async function viewerContext(): Promise<{ tier: CustomerType; isStaff: boolean }> {
  try {
    const auth = getRequestHeader("authorization") || getRequestHeader("Authorization");
    if (!auth) return { tier: "IND", isStaff: false };
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token) return { tier: "IND", isStaff: false };

    // Use local JWT verification instead of Supabase
    const jwt = (await import("jsonwebtoken")).default;
    const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_dev_only_change_in_prod";

    let userId;
    let email;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { sub?: string; id?: string; email?: string };
      userId = decoded.sub || decoded.id;
      email = decoded.email;
    } catch {
      return { tier: "IND", isStaff: false };
    }

    if (!userId) return { tier: "IND", isStaff: false };

    const profile = await models.profiles.findOne({ where: { id: userId } });
    const t = (profile?.customer_type ?? "IND") as CustomerType;
    const tier = t === "GAR" || t === "EXP" ? t : "IND";

    const isHardcodedAdmin = email === "admin" || email === "superadmin";

    const roleRow = await models.user_roles.findOne({
      where: { user_id: userId, role: { [Op.in]: ['admin', 'super_admin', 'salesman'] } }
    });

    return { tier, isStaff: isHardcodedAdmin || !!roleRow };
  } catch {
    return { tier: "IND", isStaff: false };
  }
}

const PART_COLS = "id, part_number, oem_number, name, price, ind_price, gar_price, export_price, stock, images, manufacturer, is_oem, brand_id";
const PART_COLS_DETAIL = "id, part_number, oem_number, name, description, specs, price, ind_price, gar_price, export_price, currency, stock, brand_id, manufacturer, is_oem, category_id, images, created_at, category:categories(id, name, slug, parent_id)";

/* ============= CATALOG ============= */

export const getBrands = createServerFn({ method: "GET" }).handler(async () => {
  const brands = await models.brands.findAll({
    attributes: ["id", "slug", "name", "logo_url", "country"],
    order: [["display_order", "ASC"]]
  });
  return brands.map(b => b.get({ plain: true }));
});

export const getBrandWithModels = createServerFn({ method: "GET" })
  .validator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const brand = await models.brands.findOne({
      where: { slug: data.slug },
      attributes: ["id", "slug", "name", "logo_url", "country"],
      include: [{
        model: models.models,
        as: 'models',
        attributes: ["id", "slug", "name", "image_url"]
      }]
    });

    if (!brand) return null;
    return brand.get({ plain: true });
  });

export const getModelWithYears = createServerFn({ method: "GET" })
  .validator((d: { brandSlug: string; modelSlug: string }) => d)
  .handler(async ({ data }) => {
    const brand = await models.brands.findOne({
      where: { slug: data.brandSlug },
      attributes: ["id", "name", "slug"]
    });
    if (!brand) return null;
    const model = await models.models.findOne({
      where: { brand_id: brand.id, slug: data.modelSlug },
      attributes: ["id", "slug", "name", "brand_id"],
      include: [{
        model: models.model_years,
        as: 'model_years',
        attributes: ["id", "year"],
        include: [{
          model: models.engines,
          as: 'engines',
          attributes: ["id", "code", "name", "fuel_type", "displacement"]
        }]
      }]
    });
    return model ? { brand: brand.get({ plain: true }), model: model.get({ plain: true }) } : null;
  });

export const getCategories = createServerFn({ method: "GET" }).handler(async () => {
  const categories = await models.categories.findAll({
    attributes: ["id", "parent_id", "slug", "name", "icon", "display_order"],
    order: [["display_order", "ASC"]]
  });
  return categories.map(c => c.get({ plain: true }));
});

export const getCategoryParts = createServerFn({ method: "GET" })
  .validator((d: { categorySlug: string; engineId?: string | null }) => d)
  .handler(async ({ data }) => {
    const { tier, isStaff } = await viewerContext();
    const cat = await models.categories.findOne({
      where: { slug: data.categorySlug },
      attributes: ["id", "name", "slug", "parent_id"]
    });
    if (!cat) return null;
    const parts = await models.parts.findAll({
      where: { category_id: cat.id },
      attributes: PART_COLS.split(',').map(s => s.trim()),
      order: [["stock", "DESC"], ["manufacturer", "ASC"], ["name", "ASC"]],
      limit: 200
    });

    const whereDiagrams: any = { category_id: cat.id };
    if (data.engineId) whereDiagrams.engine_id = data.engineId;
    const diagrams = await models.diagrams.findAll({
      where: whereDiagrams,
      attributes: ["id", "title", "image_url", "width", "height", "engine_id"]
    });

    return {
      category: cat.get({ plain: true }),
      parts: parts.map(p => {
        const plain = p.get({ plain: true });
        const projected: any = projectPart(plain, tier);
        if (isStaff) {
          projected.rate_price = plain.price;
          projected.ind_price = plain.ind_price;
          projected.gar_price = plain.gar_price;
          projected.export_price = plain.export_price;
        }
        return projected;
      }),
      diagrams: diagrams.map(d => d.get({ plain: true })),
      viewerTier: tier,
    };
  });

export const getPart = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { tier, isStaff } = await viewerContext();
    const isAdmin = isStaff;

    const part = await models.parts.findOne({
      where: { id: data.id },
      include: [{
        model: models.categories,
        as: 'category',
        attributes: ["id", "name", "slug", "parent_id"]
      }]
    });

    if (!part) return null;

    let dbAlts: any[] = [];
    try {
      dbAlts = await models.alternative_parts.findAll({
        where: { part_id: data.id },
        include: [{
          model: models.parts,
          as: 'alternative_part',
          attributes: ["id", "part_number", "name", "price", "ind_price", "gar_price", "export_price", "images"]
        }]
      });
    } catch (e) {}

    let dynamicAlts: any[] = [];
    if (part.category_tag) {
      const altRows = await models.parts.findAll({
        where: { 
          category_tag: part.category_tag,
          id: { [Op.ne]: part.id }
        },
        attributes: ["id", "part_number", "name", "price", "ind_price", "gar_price", "export_price", "images"]
      });
      dynamicAlts = altRows.map(a => ({
        id: a.id,
        part_id: part.id,
        alternative_part_id: a.id,
        is_two_way: true,
        alternative_part: a.get({ plain: true })
      }));
    }

    // Merge and deduplicate by alternative part ID
    const mergedAltsMap = new Map();
    for (const a of [...dbAlts, ...dynamicAlts]) {
      if (a.alternative_part_id) mergedAltsMap.set(a.alternative_part_id, a);
    }
    const alts = Array.from(mergedAltsMap.values());

    const p = part.get({ plain: true });
    let specs = p.specs;
    if (!isAdmin && specs && typeof specs === "object") {
      const HIDDEN = /price|rate|unique\s*value/i;
      specs = Object.fromEntries(Object.entries(specs).filter(([k]) => !HIDDEN.test(k)));
    }

    const projected: any = projectPart({ ...p, specs }, tier);
    if (isAdmin) {
      projected.rate_price = p.price;
      projected.ind_price = p.ind_price;
      projected.gar_price = p.gar_price;
      projected.export_price = p.export_price;
    }

    return {
      part: projected,
      alternatives: alts.map(a => {
        const altData = a.get ? a.get({ plain: true }) : a;
        const altPart = altData.alternative_part;
        let pAlt: any = altPart ? projectPart(altPart as any, tier) : null;
        if (isAdmin && pAlt && altPart) {
          pAlt.rate_price = altPart.price;
          pAlt.ind_price = altPart.ind_price;
          pAlt.gar_price = altPart.gar_price;
          pAlt.export_price = altPart.export_price;
        }
        return {
          ...altData,
          part: pAlt
        };
      }),
      viewerTier: tier,
      isAdmin,
    };
  });

export const getDiagram = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { tier } = await viewerContext();
    const diagramRow = await models.diagrams.findOne({
      where: { id: data.id },
      attributes: ["id", "title", "image_url", "width", "height", "category_id", "engine_id"]
    });

    if (!diagramRow) return null;
    const diagram = diagramRow.get({ plain: true });

    // Using raw query to fetch hotspots and associated parts efficiently
    const hotspots = await sequelize.query(`
      SELECT 
        h.id, h.callout_number, h.x, h.y, h.w, h.h,
        json_build_object(
          'id', p.id, 'part_number', p.part_number, 'oem_number', p.oem_number,
          'name', p.name, 'price', p.price, 'ind_price', p.ind_price,
          'gar_price', p.gar_price, 'export_price', p.export_price,
          'stock', p.stock, 'images', p.images, 'manufacturer', p.manufacturer,
          'is_oem', p.is_oem
        ) as part
      FROM diagram_hotspots h
      LEFT JOIN parts p ON h.part_id = p.id
      WHERE h.diagram_id = :diagramId
    `, {
      replacements: { diagramId: data.id },
      type: QueryTypes.SELECT
    });

    diagram.hotspots = hotspots.map((h: any) => ({
      ...h,
      part: h.part?.id ? projectPart(h.part, tier) : null
    }));

    return diagram;
  });

export const getFeaturedParts = createServerFn({ method: "GET" }).handler(async () => {
  const { tier, isStaff } = await viewerContext();
  const parts = await models.parts.findAll({
    attributes: ["id", "part_number", "name", "price", "ind_price", "gar_price", "export_price", "images", "manufacturer", "is_oem"],
    order: [["created_at", "DESC"]],
    limit: 8
  });
  return parts.map(p => {
    const plain = p.get({ plain: true });
    const projected: any = projectPart(plain, tier);
    if (isStaff) {
      projected.rate_price = plain.price;
      projected.ind_price = plain.ind_price;
      projected.gar_price = plain.gar_price;
      projected.export_price = plain.export_price;
    }
    return projected;
  });
});

export const getPartManufacturers = createServerFn({ method: "GET" }).handler(async () => {
  const list = await sequelize.query(
    "SELECT DISTINCT manufacturer FROM parts WHERE manufacturer IS NOT NULL ORDER BY manufacturer ASC",
    { type: QueryTypes.SELECT }
  );
  return list.map((r: any) => r.manufacturer as string);
});

export const listPartsPaged = createServerFn({ method: "GET" })
  .validator((d: { page?: number; pageSize?: number; brand?: string } = {}) => d)
  .handler(async ({ data }) => {
    const { tier, isStaff } = await viewerContext();
    const page = Math.max(1, Math.floor(data.page ?? 1));
    const pageSize = Math.min(60, Math.max(1, Math.floor(data.pageSize ?? 24)));
    const offset = (page - 1) * pageSize;

    const where: any = {};
    if (data.brand) {
      where.manufacturer = { [Op.iLike]: data.brand };
    }

    const { rows: items, count } = await models.parts.findAndCountAll({
      where,
      attributes: ["id", "part_number", "name", "price", "ind_price", "gar_price", "export_price", "images", "manufacturer", "is_oem", "stock", "category_tag"],
      include: [{
        model: models.alternative_parts,
        as: 'part_alternative_parts',
        include: [{
          model: models.parts,
          as: 'alternative_part',
          attributes: ["id", "part_number", "name", "price", "ind_price", "gar_price", "export_price", "images", "manufacturer", "stock", "is_oem"]
        }]
      }],
      order: [["stock", "DESC"], ["manufacturer", "ASC"], ["name", "ASC"]],
      limit: pageSize,
      offset: offset
    });

    return {
      items: items.map(p => {
        const plain = p.get({ plain: true });
        const projected: any = projectPart(plain, tier);
        if (isStaff) {
          projected.rate_price = plain.price;
          projected.ind_price = plain.ind_price;
          projected.gar_price = plain.gar_price;
          projected.export_price = plain.export_price;
        }

        // Process nested alternative parts
        if (projected.part_alternative_parts && Array.isArray(projected.part_alternative_parts)) {
          projected.part_alternative_parts = projected.part_alternative_parts.map((ap: any) => {
            if (ap.alternative_part) {
              ap.alternative_part = projectPart(ap.alternative_part, tier);
              if (isStaff) {
                ap.alternative_part.rate_price = plain.part_alternative_parts.find((x: any) => x.id === ap.id)?.alternative_part?.price;
                ap.alternative_part.ind_price = plain.part_alternative_parts.find((x: any) => x.id === ap.id)?.alternative_part?.ind_price;
                ap.alternative_part.gar_price = plain.part_alternative_parts.find((x: any) => x.id === ap.id)?.alternative_part?.gar_price;
                ap.alternative_part.export_price = plain.part_alternative_parts.find((x: any) => x.id === ap.id)?.alternative_part?.export_price;
              }
            }
            return ap;
          });
        }

        return projected;
      }),
      total: count,
      page,
      pageSize,
      viewerTier: tier,
    };
  });

/* ============= SEARCH ============= */

export const searchParts = createServerFn({ method: "GET" })
  .validator((d: { q: string; limit?: number }) => d)
  .handler(async ({ data }) => {
    const { tier, isStaff } = await viewerContext();
    const q = data.q.trim();
    if (!q) return { parts: [], categories: [], expanded: null, viewerTier: tier };
    const limit = Math.min(80, Math.max(1, data.limit ?? 40));

    // Try finding synonym
    let effective = q;
    try {
      const synRow = await sequelize.query(
        "SELECT canonical FROM synonyms WHERE term = :term LIMIT 1",
        { replacements: { term: q.toLowerCase() }, type: QueryTypes.SELECT }
      );
      if (synRow && synRow.length > 0) {
        effective = (synRow[0] as any).canonical;
      }
    } catch { /* ignore if synonyms table missing */ }

    const norm = effective.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const esc = (s: string) => s.replace(/[%,()]/g, "\\$&");
    const raw = esc(effective);

    const byId = new Map<string, any>();
    const push = (rows: any[] | null | undefined) => {
      for (const r of rows ?? []) if (!byId.has(r.id)) byId.set(r.id, r);
    };

    const cols = ["id", "part_number", "oem_number", "name", "price", "ind_price", "gar_price", "export_price", "images", "manufacturer", "stock", "category_tag"];

    // Pass 1: exact/substring matches
    const searchString = `%${raw}%`;
    const includeAlts = [{
      model: models.alternative_parts,
      as: 'part_alternative_parts',
      include: [{
        model: models.parts,
        as: 'alternative_part',
        attributes: cols
      }]
    }];

    const pass1 = await models.parts.findAll({
      attributes: cols,
      where: {
        [Op.or]: [
          { part_number: { [Op.iLike]: searchString } },
          { oem_number: { [Op.iLike]: searchString } },
          { name: { [Op.iLike]: searchString } },
          { manufacturer: { [Op.iLike]: searchString } },
          { category_tag: { [Op.iLike]: searchString } }
        ]
      },
      include: includeAlts,
      order: [["stock", "DESC"], ["manufacturer", "ASC"], ["name", "ASC"]],
      limit
    });
    push(pass1.map((p: any) => p.get({ plain: true })));

    // Pass 2: regex match for alphanumeric sequence
    if (norm.length >= 3 && byId.size < limit) {
      const regex = norm.split("").join("[^A-Za-z0-9]*");
      const pass2 = await models.parts.findAll({
        attributes: cols,
        where: {
          [Op.or]: [
            { part_number: { [Op.iRegexp]: regex } },
            { oem_number: { [Op.iRegexp]: regex } },
            { category_tag: { [Op.iRegexp]: regex } }
          ]
        },
        include: includeAlts,
        order: [["stock", "DESC"], ["manufacturer", "ASC"], ["name", "ASC"]],
        limit
      });
      push(pass2.map((p: any) => p.get({ plain: true })));
    }

    // Pass 3: Expansion by category_tag (Superseded/Alternative parts grouping)
    // If we found any parts, we extract their category_tag and find ALL other parts sharing the same tag.
    const tagsToExpand = new Set<string>();
    for (const p of byId.values()) {
      if (p.category_tag) tagsToExpand.add(p.category_tag);
    }

    if (tagsToExpand.size > 0 && byId.size < limit * 3) {
      const pass3 = await models.parts.findAll({
        attributes: cols,
        where: {
          category_tag: { [Op.in]: Array.from(tagsToExpand) }
        },
        include: includeAlts,
        order: [["stock", "DESC"], ["manufacturer", "ASC"], ["name", "ASC"]],
        limit: limit * 3 // Allow some expansion limit
      });
      push(pass3.map((p: any) => p.get({ plain: true })));
    }

    const categories = await models.categories.findAll({
      attributes: ["id", "name", "slug"],
      where: {
        name: { [Op.iLike]: searchString }
      },
      limit: 8
    });

    const sortedList = Array.from(byId.values()).sort((a, b) => {
      // 1. Stock Availability Priority: In-stock (stock > 0) comes BEFORE Out-of-stock (stock <= 0)
      const hasStockA = Number(a.stock ?? 0) > 0 ? 1 : 0;
      const hasStockB = Number(b.stock ?? 0) > 0 ? 1 : 0;
      if (hasStockB !== hasStockA) return hasStockB - hasStockA;

      // 2. Exact match on part number or OEM number
      const pnA = String(a.part_number || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const pnB = String(b.part_number || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const oemA = String(a.oem_number || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const oemB = String(b.oem_number || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

      const exactA = (norm && (pnA === norm || oemA === norm)) ? 1 : 0;
      const exactB = (norm && (pnB === norm || oemB === norm)) ? 1 : 0;
      if (exactB !== exactA) return exactB - exactA;

      // 3. Higher stock quantity among in-stock items
      const stockA = Number(a.stock ?? 0);
      const stockB = Number(b.stock ?? 0);
      if (stockB !== stockA) return stockB - stockA;

      // 4. Brand Name (A-Z)
      const brandA = String(a.manufacturer || "");
      const brandB = String(b.manufacturer || "");
      if (brandA !== brandB) return brandA.localeCompare(brandB);

      // 5. Part Name (A-Z)
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    return {
      parts: sortedList.slice(0, limit).map((p) => {
        const projected: any = projectPart(p as any, tier);
        if (isStaff) {
          projected.rate_price = (p as any).price;
          projected.ind_price = (p as any).ind_price;
          projected.gar_price = (p as any).gar_price;
          projected.export_price = (p as any).export_price;
        }

        // Process nested alternative parts
        if (projected.part_alternative_parts && Array.isArray(projected.part_alternative_parts)) {
          projected.part_alternative_parts = projected.part_alternative_parts.map((ap: any) => {
            if (ap.alternative_part) {
              ap.alternative_part = projectPart(ap.alternative_part, tier);
              if (isStaff) {
                ap.alternative_part.rate_price = (p as any).part_alternative_parts.find((x: any) => x.id === ap.id)?.alternative_part?.price;
                ap.alternative_part.ind_price = (p as any).part_alternative_parts.find((x: any) => x.id === ap.id)?.alternative_part?.ind_price;
                ap.alternative_part.gar_price = (p as any).part_alternative_parts.find((x: any) => x.id === ap.id)?.alternative_part?.gar_price;
                ap.alternative_part.export_price = (p as any).part_alternative_parts.find((x: any) => x.id === ap.id)?.alternative_part?.export_price;
              }
            }
            return ap;
          });
        }

        return projected;
      }),
      categories: categories.map((c: any) => c.get({ plain: true })),
      expanded: effective !== q ? effective : null,
      viewerTier: tier,
    };
  });

/* ============= VIN ============= */

const VinSchema = z.object({ vin: z.string().min(11).max(17) });

export const decodeVin = createServerFn({ method: "POST" })
  .validator((d: unknown) => VinSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const endpoint = process.env.VIN_DECODER_URL || 'https://api.carparts.koncpt-ai.tech/api/vin/lookup';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
    const base = process.env.VIN_CATALOG_URL || "https://api.carparts.koncpt-ai.tech/api/vin/catalog";
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
      const enriched = await appendServicePartsCategory(json);
      return { ok: true as const, data: enriched };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Failed to fetch catalog" };
    }
  });

/* ============= Service Parts synthesis ============= */

type ServiceGroup = {
  key: string;
  label: string;
  include: RegExp;
  ilike: string[];
  exclude?: RegExp;
};

const SERVICE_GROUPS: ServiceGroup[] = [
  {
    key: "oil_filter",
    label: "Oil Filter",
    include: /(OIL\s*FILTER|OIL\s*FILTER\s*ELEMENT|FILTER\s*ELEMENT.*OIL|TS\s*OIL\s*FILTER)/i,
    ilike: ["OIL FILTER", "OIL FILTER ELEMENT", "FILTER ELEMENT OIL", "TS OIL FILTER"],
    exclude: /PAN|COVER|HOUSING|CAP|SOCKET|PIPE|BRACKET|SEAL|LINE|TUBE|SCREW|BOLT|GASKET|GUIDE/i,
  },
  {
    key: "air_filter",
    label: "Air Filter",
    include: /(AIR\s*FILTER|AIR\s*FILTER\s*INSERT|AIR\s*CLEANER|FILTER\s*ELEMENT.*AIR|INTAKE\s*AIR\s*FILTER)/i,
    ilike: ["AIR FILTER", "AIR FILTER INSERT", "AIR CLEANER", "FILTER ELEMENT AIR", "INTAKE AIR FILTER"],
    exclude: /COVER|PIPE|CABIN|BRACKET|BOX|CLAMP|CHARGE\s*AIR|HOUSING|LINE|SENSOR/i,
  },
  {
    key: "cabin_air_filter",
    label: "Cabin Air Filter",
    include: /(CABIN(\s*AIR)?\s*FILTER|DUST\s*FILTER|POLLEN\s*FILTER|COMBINATION\s*FILTER)/i,
    ilike: ["CABIN FILTER", "CABIN AIR FILTER", "DUST FILTER", "POLLEN FILTER", "COMBINATION FILTER"],
    exclude: /BOOT|COVER|HOUSING|SCREW|BOLT/i,
  },
  { key: "hydraulic_filter", label: "Hydraulic Filter", include: /HYDRAULIC\s*FILTER/i, ilike: ["HYDRAULIC FILTER"], exclude: /COVER|HOUSING|PIPE|LINE|SEAL/i },
  { key: "fuel_filter", label: "Fuel Filter", include: /FUEL\s*FILTER/i, ilike: ["FUEL FILTER"], exclude: /SOCKET|BRACKET|COVER|HOUSING|PIPE|LINE|SEAL/i },
  { key: "spark_plug", label: "Spark Plug", include: /SPARK\s*PLUG/i, ilike: ["SPARK PLUG"], exclude: /WIRE|CABLE|BOOT|CONNECTOR/i },
  { key: "water_pump", label: "Water Pump", include: /(WATER\s*PUMP|COOLANT\s*PUMP)/i, ilike: ["WATER PUMP", "COOLANT PUMP"], exclude: /COVER|GASKET|SEAL|PULLEY|BRACKET|AUXILIARY|ELECTRIC|PIPE|LINE/i },
  { key: "thermostat", label: "Thermostat", include: /THERMOSTAT/i, ilike: ["THERMOSTAT"], exclude: /COVER|HOUSING|GASKET|O\s*RING|ADAPTER|BASE/i },
  {
    key: "brake_pad",
    label: "Brake Pad Set",
    include: /(BRAKE\s*PAD|BRAKEPAD|DISC\s*BRAKE\s*PAD|DISK\s*BRAKE\s*PAD|BRAKE\s*LINING|BRAKE\s*SHOE|LINING.*BRAKE|BRAKE.*LINING)/i,
    ilike: ["BRAKE PAD", "BRAKEPAD", "DISC BRAKE PAD", "DISK BRAKE PAD", "BRAKE LINING", "BRAKE SHOE"],
    exclude: /MULTIDISK|PARKING\s*BRAKE|BRAKE\s*DISC\s*(?!PAD)|BRAKE\s*DISK\s*(?!PAD)|BRAKE\s*CALIPER|SENSOR|CABLE|HOSE|LINE|PEDAL|SPRING|BOLT|SCREW|PIN|PLATE|RING|PASTE|LITERATURE|INFORMATION|WEAR|INDICATOR|GREASE/i,
  },
  { key: "wiper_blade", label: "Wiper Blade", include: /(WIPER\s*BLADE|WINDSHIELD\s*WIPER|WIPER\s*RUBBER)/i, ilike: ["WIPER BLADE", "WINDSHIELD WIPER", "WIPER RUBBER"], exclude: /MOTOR|ARM|LINKAGE|RELAY|SWITCH|TANK|NOZZLE/i },
];

const normalizeCatalogKey = (s: unknown) => String(s ?? "")
  .toUpperCase()
  .replace(/&/g, " AND ")
  .replace(/[_\-/.]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const catalogIlike = (haystack: unknown, term: string) => {
  const source = normalizeCatalogKey(haystack);
  const needle = normalizeCatalogKey(term);
  return !!source && !!needle && source.includes(needle);
};

const servicePartToken = /(FILTER|PAD|BRAKEPAD|BRAKE\s*SHOE|BRAKE\s*LINING|DISK\s*BRAKE|DISC\s*BRAKE|BLADE|WIPER\s*RUBBER|SPARK\s*PLUG|THERMOSTAT|COOLANT|WATER\s*PUMP|HYDRAULIC\s*FILTER|FUEL\s*FILTER|DUST\s*FILTER|POLLEN\s*FILTER)/i;

async function appendServicePartsCategory(catalog: any): Promise<any> {
  try {
    if (!catalog || !Array.isArray(catalog.categories)) return catalog;

    type MatchedCatalogPart = {
      part_name: string;
      callout_number?: string | number;
      description?: string;
      part_numbers: any[];
      source_diagram_name?: string;
      image_url?: string;
    };
    type ServiceBucket = { group: ServiceGroup; image: string; diagramName: string; parts: MatchedCatalogPart[]; seen: Set<string> };

    const matchesByGroup = new Map<string, ServiceBucket[]>();

    const matchGroup = (text: unknown, partSpecificText?: unknown) => {
      const normalized = normalizeCatalogKey(text);
      if (!normalized) return null;
      const partNormalized = normalizeCatalogKey(partSpecificText ?? text);
      for (const g of SERVICE_GROUPS) {
        const matched = g.include.test(normalized) || g.ilike.some((term) => catalogIlike(normalized, term));
        if (!matched) continue;
        if (g.exclude && g.exclude.test(partNormalized)) continue;
        return g;
      }
      return null;
    };

    const addMatch = (group: ServiceGroup, diagram: any, part: any) => {
      const partNumbers = Array.isArray(part?.part_numbers) ? part.part_numbers : [];
      if (partNumbers.length === 0) return;

      const img = typeof diagram?.image_url === "string"
        ? diagram.image_url
        : (typeof diagram?.thumbnail_url === "string" ? diagram.thumbnail_url : "");
      const diagramName = String(diagram?.diagram_name ?? group.label);
      const key = group.key;
      let buckets = matchesByGroup.get(key);
      if (!buckets) {
        buckets = [];
        matchesByGroup.set(key, buckets);
      }
      let bucket = buckets.find(b => b.diagramName === diagramName);
      if (!bucket) {
        bucket = { group, image: img, diagramName, parts: [], seen: new Set<string>() };
        buckets.push(bucket);
      }
      if (!bucket.image && img) bucket.image = img;

      const pnKey = partNumbers.map((pn: any) => String(pn?.part_number ?? "").trim()).filter(Boolean).join("|");
      const dedupeKey = [group.key, normalizeCatalogKey(part?.part_name), pnKey].join("::");
      if (bucket.seen.has(dedupeKey)) return;
      bucket.seen.add(dedupeKey);

      bucket.parts.push({
        part_name: String(part?.part_name || part?.name || group.label),
        callout_number: part?.callout_number,
        description: [part?.description, diagramName].filter(Boolean).join(" · ") || undefined,
        image_url: img,
        source_diagram_name: diagramName,
        part_numbers: partNumbers,
      });
    };

    const walkDiagrams = (diagrams: any[] | undefined, contextText = "") => {
      for (const d of diagrams ?? []) {
        const diagramContext = [contextText, d?.diagram_name, d?.diagram_code, d?.description, d?.title].filter(Boolean).join(" ");
        for (const p of d?.parts ?? []) {
          const partNumbers = (p?.part_numbers ?? []).map((pn: any) => pn?.part_number).filter(Boolean).join(" ");
          const partText = [p?.part_name, p?.description, p?.name, partNumbers].filter(Boolean).join(" ");
          if (!servicePartToken.test(partText)) continue;

          // ILIKE-style matching is applied to the part name first, then to the
          // full category/sub-category/diagram context for catalogues that use
          // terse names such as "FILTER ELEMENT" under an oil/air diagram.
          const group = matchGroup(partText, partText) || matchGroup([diagramContext, partText].join(" "), partText);
          if (group) addMatch(group, d, p);
        }
      }
    };

    for (const c of catalog.categories) {
      const categoryText = [c?.category_name, c?.category_code, c?.name, c?.title].filter(Boolean).join(" ");
      walkDiagrams(c?.diagrams, categoryText);
      for (const sc of [...(c?.subcategories ?? []), ...(c?.sub_categories ?? [])]) {
        const subcategoryText = [categoryText, sc?.category_name, sc?.subcategory_name, sc?.category_code, sc?.subcategory_code, sc?.name, sc?.title].filter(Boolean).join(" ");
        walkDiagrams(sc?.diagrams, subcategoryText);
      }
    }

    const diagrams: any[] = [];
    for (const g of SERVICE_GROUPS) {
      const buckets = matchesByGroup.get(g.key);
      if (!buckets) continue;
      for (const bucket of buckets) {
        if (bucket.parts.length === 0) continue;
        diagrams.push({
          diagram_name: buckets.length > 1 ? `${bucket.group.label} (${bucket.diagramName})` : bucket.group.label,
          diagram_code: `SERVICE_${bucket.group.key.toUpperCase()}`,
          image_url: bucket.image,
          parts: bucket.parts,
        });
      }
    }

    console.log("[service-parts]", {
      brand: catalog?.brand_name,
      model: catalog?.model_number,
      groups: diagrams.map((d) => ({ code: d.diagram_code, parts: d.parts.length })),
    });

    if (diagrams.length === 0) return catalog;

    const serviceCategory = {
      category_name: "Service Parts",
      category_code: "SERVICE",
      diagrams,
    };

    return { ...catalog, categories: [...catalog.categories, serviceCategory] };
  } catch (err) {
    console.warn("[service-parts] synthesis failed", err);
    return catalog;
  }
}
