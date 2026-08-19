import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

async function getUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

export const requireAdmin = (_h?: any) => _h;
export const requireAdminOrSalesman = (_h?: any) => _h;

/* ===== Admin overview ===== */

export const adminStats = createServerFn({ method: "GET" }).handler(async () => {
  const [
    { count: partsCount },
    { data: ordersRows },
    { count: usersCount },
  ] = await Promise.all([
    supabase.from("parts").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("status, total"),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
  ]);

  const orders = ordersRows || [];
  const revenue = orders.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const byStatus: Record<string, number> = {};
  orders.forEach((o) => {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
  });

  return {
    parts: partsCount ?? 0,
    orders: orders.length,
    users: usersCount ?? 0,
    revenue,
    byStatus,
  };
});

export const adminListOrders = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, status, total, currency, payment_method, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return [];
  return data || [];
});

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .validator((d: { id: string; status: string; note?: string }) => d)
  .handler(async ({ data }) => {
    const allowed = ["placed", "confirmed", "packed", "shipped", "delivered", "cancelled"];
    if (!allowed.includes(data.status)) throw new Error("Invalid status");
    await supabase.from("orders").update({ status: data.status }).eq("id", data.id);
    await supabase.from("order_events").insert({ order_id: data.id, status: data.status, note: data.note ?? null });
    return { ok: true };
  });

/* ===== Parts CRUD ===== */

const PartSchema = z.object({
  id: z.string().uuid().optional(),
  part_number: z.string().min(1).max(80),
  oem_number: z.string().max(80).optional().nullable(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  price: z.number().min(0),
  ind_price: z.number().min(0).optional().nullable(),
  gar_price: z.number().min(0).optional().nullable(),
  export_price: z.number().min(0).optional().nullable(),
  stock: z.number().int().min(0),
  manufacturer: z.string().max(120).optional().nullable(),
  is_oem: z.boolean().default(true),
  category_id: z.string().uuid().optional().nullable(),
  brand_id: z.string().uuid().optional().nullable(),
  images: z.array(z.string().url()).max(8).default([]),
});

export const adminListParts = createServerFn({ method: "GET" })
  .validator((d: { page?: number; pageSize?: number; q?: string; brand?: string } = {}) => d)
  .handler(async ({ data }) => {
    const page = Math.max(1, data.page ?? 1);
    const pageSize = Math.min(200, data.pageSize ?? 50);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("parts")
      .select("id, part_number, oem_number, name, price, ind_price, gar_price, export_price, stock, manufacturer, is_oem, category_tag, category_id, images", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (data.q?.trim()) {
      const s = data.q.trim();
      query = query.or(`part_number.ilike.%${s}%,oem_number.ilike.%${s}%,name.ilike.%${s}%,manufacturer.ilike.%${s}%`);
    }

    if (data.brand?.trim()) {
      query = query.eq("manufacturer", data.brand.trim());
    }

    const { data: rows, count, error } = await query;
    if (error) return { items: [], total: 0, page, pageSize };

    const items = (rows || []).map((p: any) => ({
      ...p,
      category: p.category_tag ?? null,
    }));

    return { items, total: count ?? 0, page, pageSize };
  });

export const adminListPartBrands = createServerFn({ method: "GET" }).handler(async () => {
  const { data: parts } = await supabase.from("parts").select("manufacturer").not("manufacturer", "is", null);
  const brandCounts = new Map<string, number>();
  for (const p of parts || []) {
    if (p.manufacturer) {
      brandCounts.set(p.manufacturer, (brandCounts.get(p.manufacturer) ?? 0) + 1);
    }
  }
  const items = Array.from(brandCounts.entries())
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count);

  const total = items.reduce((s, i) => s + i.count, 0);
  return { items, total };
});

export const adminUpsertPart = createServerFn({ method: "POST" })
  .validator((d: unknown) => PartSchema.parse(d))
  .handler(async ({ data }) => {
    if (data.id) {
      const { error } = await supabase.from("parts").update(data as any).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabase.from("parts").insert(data as any).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDeletePart = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabase.from("parts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ===== CSV import ===== */

const ImportRowSchema = z.object({
  rowIndex: z.number().int().optional(),
  category_tag: z.string().nullable().optional(),
  part_number: z.string().min(1),
  manufacturer: z.string().nullable().optional(),
  oem_number: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  unique_value: z.string().nullable().optional(),
  stock: z.number().int().min(0).default(0),
  rate_price: z.number().min(0).nullable().optional(),
  price: z.number().min(0).default(0),
  ind_price: z.number().min(0).nullable().optional(),
  gar_price: z.number().min(0).nullable().optional(),
  garage_price: z.number().min(0).nullable().optional(),
  export_price: z.number().min(0).nullable().optional(),
});

export const adminCreateImport = createServerFn({ method: "POST" })
  .validator((d: { filename: string; totalRows: number }) => d)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    const { data: row, error } = await supabase
      .from("csv_imports")
      .insert({
        filename: data.filename,
        storage_path: `client://${data.filename}`,
        status: "processing",
        total_rows: data.totalRows,
        created_by: userId,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export type ImportRowError = {
  rowIndex: number | null;
  part_number: string | null;
  manufacturer: string | null;
  reason: string;
};

export const adminImportPartsBatch = createServerFn({ method: "POST" })
  .validator((d: { importId: string; rows: unknown[] }) => d)
  .handler(async ({ data }) => {
    const errors: ImportRowError[] = [];
    const valid: any[] = [];

    for (const raw of data.rows) {
      const parsed = ImportRowSchema.safeParse(raw);
      if (!parsed.success) {
        const r = raw as any;
        errors.push({
          rowIndex: typeof r?.rowIndex === "number" ? r.rowIndex : null,
          part_number: r?.part_number ? String(r.part_number) : null,
          manufacturer: r?.manufacturer ? String(r.manufacturer) : null,
          reason: `validation: ${parsed.error.issues[0]?.message ?? "invalid"}`,
        });
        continue;
      }
      const r = parsed.data;
      valid.push({
        part_number: r.part_number,
        manufacturer: r.manufacturer || null,
        oem_number: r.oem_number || null,
        name: (r.description?.trim() || r.part_number).slice(0, 200),
        description: r.description || null,
        category_tag: r.category_tag || null,
        price: r.ind_price ?? r.price ?? 0,
        ind_price: r.ind_price ?? null,
        gar_price: r.gar_price ?? r.garage_price ?? null,
        export_price: r.export_price ?? null,
        stock: r.stock,
        is_oem: true,
        images: [],
      });
    }

    let inserted = 0;
    let failed = errors.length;

    if (valid.length) {
      const { error } = await supabase.from("parts").upsert(valid, { onConflict: "part_number" });
      if (error) {
        failed += valid.length;
      } else {
        inserted = valid.length;
      }
    }

    return { inserted, updated: 0, failed, errors: errors.slice(0, 100) };
  });

export const adminFinishImport = createServerFn({ method: "POST" })
  .validator((d: { importId: string; status: "completed" | "failed" }) => d)
  .handler(async ({ data }) => {
    await supabase.from("csv_imports").update({ status: data.status }).eq("id", data.importId);
    return { ok: true };
  });

export const adminListImports = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabase
    .from("csv_imports")
    .select("id, filename, status, total_rows, processed_rows, inserted_rows, updated_rows, failed_rows, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  return data || [];
});

export const adminGetImportErrors = createServerFn({ method: "POST" })
  .validator((d: { importId: string }) => d)
  .handler(async ({ data }) => {
    const { data: row } = await supabase.from("csv_imports").select("filename, error_log").eq("id", data.importId).maybeSingle();
    return { filename: row?.filename ?? "import", errors: (Array.isArray(row?.error_log) ? row.error_log : []) as ImportRowError[] };
  });

export const checkIsAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getUserId();
  if (!userId) return { isAdmin: false, isSuperAdmin: false };

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roleList = (roles || []).map((r) => r.role);
  const isSuperAdmin = roleList.includes("super_admin");
  const isAdmin = isSuperAdmin || roleList.includes("admin");
  return { isAdmin, isSuperAdmin };
});

/* ===== Super Admin Dashboard Metrics ===== */

export const adminDashboardMetrics = createServerFn({ method: "GET" }).handler(async () => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { data: ordersAll },
    { data: ordersToday },
    { data: ordersMonth },
    { count: totalParts },
    { count: outOfStock },
    { data: profilesAll },
    { data: recentOrders },
    { data: recentUsers },
  ] = await Promise.all([
    supabase.from("orders").select("status, total, created_at"),
    supabase.from("orders").select("total").gte("created_at", startOfToday),
    supabase.from("orders").select("total").gte("created_at", startOfMonth),
    supabase.from("parts").select("*", { count: "exact", head: true }),
    supabase.from("parts").select("*", { count: "exact", head: true }).eq("stock", 0),
    supabase.from("profiles").select("id, full_name, customer_type, created_at"),
    supabase.from("orders").select("id, order_number, status, total, currency, created_at, user_id, customer_type").order("created_at", { ascending: false }).limit(10),
    supabase.from("profiles").select("id, full_name, customer_type, created_at").order("created_at", { ascending: false }).limit(10),
  ]);

  const all = ordersAll || [];
  const totalRevenue = all.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const todayRevenue = (ordersToday || []).reduce((s, o) => s + Number(o.total ?? 0), 0);
  const monthRevenue = (ordersMonth || []).reduce((s, o) => s + Number(o.total ?? 0), 0);

  const byStatus: Record<string, number> = {};
  all.forEach((o) => {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
  });

  const profiles = profilesAll || [];
  const ct: Record<string, number> = { IND: 0, GAR: 0, EXP: 0 };
  profiles.forEach((p) => {
    const t = p.customer_type || "IND";
    ct[t] = (ct[t] ?? 0) + 1;
  });

  return {
    kpis: {
      totalRevenue,
      todayRevenue,
      monthRevenue,
      totalOrders: all.length,
      pending: byStatus["placed"] ?? 0,
      processing: (byStatus["confirmed"] ?? 0) + (byStatus["packed"] ?? 0),
      shipped: byStatus["shipped"] ?? 0,
      completed: byStatus["delivered"] ?? 0,
      cancelled: byStatus["cancelled"] ?? 0,
      totalCustomers: profiles.length,
      customersIND: ct.IND ?? 0,
      customersGAR: ct.GAR ?? 0,
      customersEXP: ct.EXP ?? 0,
      totalProducts: totalParts ?? 0,
      outOfStock: outOfStock ?? 0,
      lowStock: 0,
    },
    byStatus,
    dailySales: [],
    monthlySales: [],
    topProducts: [],
    recentOrders: recentOrders || [],
    recentUsers: recentUsers || [],
  };
});

/* ===== Users (admin) ===== */

const CustomerTypeEnum = z.enum(["IND", "GAR", "EXP"]);

export const adminListUsers = createServerFn({ method: "GET" })
  .validator((d: { search?: string; customerType?: "IND" | "GAR" | "EXP" | "ALL"; status?: "pending" | "active" | "suspended" | "ALL"; page?: number; pageSize?: number } = {}) => d)
  .handler(async ({ data }) => {
    const page = Math.max(1, data.page ?? 1);
    const pageSize = Math.min(100, data.pageSize ?? 25);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from("profiles").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);

    if (data.customerType && data.customerType !== "ALL") {
      query = query.eq("customer_type", data.customerType);
    }
    if (data.status && data.status !== "ALL") {
      query = query.eq("status", data.status);
    }
    if (data.search?.trim()) {
      query = query.or(`full_name.ilike.%${data.search.trim()}%,phone.ilike.%${data.search.trim()}%`);
    }

    const { data: profiles, count, error } = await query;
    if (error) return { items: [], total: 0, page, pageSize };

    const items = (profiles || []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      phone: p.phone,
      customer_type: p.customer_type,
      status: p.status,
      company_name: p.company_name,
      created_at: p.created_at,
      email: p.email ?? null,
      total_orders: 0,
      total_spend: 0,
    }));

    return { items, total: count ?? 0, page, pageSize };
  });

/* ===== Our Team ===== */

export const adminListTeam = createServerFn({ method: "GET" }).handler(async () => {
  const { data: rolesRows } = await supabase.from("user_roles").select("user_id, role").in("role", ["admin", "super_admin", "salesman"]);
  const userIds = Array.from(new Set((rolesRows || []).map((r) => r.user_id)));
  if (!userIds.length) return { items: [] };

  const { data: profiles } = await supabase.from("profiles").select("id, full_name, phone, status, email, created_at").in("id", userIds);

  const items = (profiles || []).map((p: any) => {
    const r = (rolesRows || []).filter((x) => x.user_id === p.id).map((x) => x.role);
    return {
      id: p.id,
      full_name: p.full_name ?? null,
      phone: p.phone ?? null,
      status: p.status ?? "active",
      created_at: p.created_at ?? null,
      email: p.email ?? null,
      roles: r,
    };
  });

  return { items };
});

export const adminUpdateUserCustomerType = createServerFn({ method: "POST" })
  .validator((d: { userId: string; customerType: "IND" | "GAR" | "EXP" }) =>
    z.object({ userId: z.string().uuid(), customerType: CustomerTypeEnum }).parse(d),
  )
  .handler(async ({ data }) => {
    await supabase.from("profiles").update({ customer_type: data.customerType }).eq("id", data.userId);
    return { ok: true };
  });

/* ===== Analytics ===== */

export const adminAnalyticsOverview = createServerFn({ method: "GET" }).handler(async () => {
  const [
    { data: profiles },
    { data: orders },
  ] = await Promise.all([
    supabase.from("profiles").select("customer_type"),
    supabase.from("orders").select("customer_type, total, created_at"),
  ]);

  const usersByType: Record<string, number> = { IND: 0, GAR: 0, EXP: 0 };
  (profiles || []).forEach((p) => {
    const t = p.customer_type || "IND";
    usersByType[t] = (usersByType[t] ?? 0) + 1;
  });

  const ordersByType: Record<string, number> = { IND: 0, GAR: 0, EXP: 0 };
  const revenueByType: Record<string, number> = { IND: 0, GAR: 0, EXP: 0 };
  (orders || []).forEach((o) => {
    const t = o.customer_type || "IND";
    ordersByType[t] = (ordersByType[t] ?? 0) + 1;
    revenueByType[t] = (revenueByType[t] ?? 0) + Number(o.total ?? 0);
  });

  return {
    types: ["IND", "GAR", "EXP"] as const,
    usersByType,
    ordersByType,
    revenueByType,
    monthly: [],
  };
});

export const adminTopCustomersByType = createServerFn({ method: "GET" })
  .validator((d: { type: "IND" | "GAR" | "EXP"; limit?: number }) => d)
  .handler(async ({ data }) => {
    const limit = Math.min(20, data.limit ?? 10);
    const { data: orders } = await supabase.from("orders").select("user_id, total").eq("customer_type", data.type);
    const agg = new Map<string, { orders: number; spend: number }>();
    for (const o of orders || []) {
      const cur = agg.get(o.user_id) ?? { orders: 0, spend: 0 };
      cur.orders += 1;
      cur.spend += Number(o.total ?? 0);
      agg.set(o.user_id, cur);
    }
    const sorted = Array.from(agg.entries()).sort((a, b) => b[1].spend - a[1].spend).slice(0, limit);
    return sorted.map(([id, v]) => ({
      user_id: id,
      full_name: "Customer",
      email: null,
      orders: v.orders,
      spend: v.spend,
    }));
  });

export const adminTopPartsByType = createServerFn({ method: "GET" })
  .validator((d: { type: "IND" | "GAR" | "EXP"; limit?: number }) => d)
  .handler(async ({ data }) => {
    const limit = Math.min(20, data.limit ?? 10);
    const { data: items } = await supabase.from("order_items").select("part_id, part_number, name, quantity, line_total").eq("customer_type", data.type);
    const agg = new Map<string, { part_number: string; name: string; qty: number; revenue: number }>();
    for (const it of items || []) {
      const key = (it.part_id ?? it.part_number) as string;
      const cur = agg.get(key) ?? { part_number: it.part_number, name: it.name, qty: 0, revenue: 0 };
      cur.qty += Number(it.quantity ?? 0);
      cur.revenue += Number(it.line_total ?? 0);
      agg.set(key, cur);
    }
    return Array.from(agg.values()).sort((a, b) => b.qty - a.qty).slice(0, limit);
  });

export const adminExportAnalyticsCsv = createServerFn({ method: "POST" })
  .validator((d: { report: "overview" | "top-customers" | "top-parts" | "monthly"; type?: "IND" | "GAR" | "EXP" }) => d)
  .handler(async () => {
    return { filename: "analytics.csv", csv: "Report,Value\n" };
  });
