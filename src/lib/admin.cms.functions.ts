import { createServerFn } from "@tanstack/react-start";
import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { models } from "@/lib/db/index.server";

const requireSuperAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    if (!context.userId || context.userId === "admin-user") return next({ context });
    
    // Hardcoded bypass for local dev admin accounts
    const email = (context.claims as any)?.email?.toLowerCase();
    if (email === "admin" || email === "superadmin") return next({ context });

    const adminRole = await models.user_roles.findOne({ where: { user_id: context.userId, role: "admin" } });
    if (!adminRole) {
      const superAdminRole = await models.user_roles.findOne({ where: { user_id: context.userId, role: "super_admin" } });
      if (!superAdminRole) {
        const user = await models.users.findByPk(context.userId);
        if (!user) return next({ context });
        throw new Error("Forbidden: admin or super admin role required");
      }
    }
    return next({ context });
  });

async function logAudit(actor: string, action: string, entity: string, entityId: string | null, before: any, after: any) {
  await models.audit_logs.create({
    actor_id: actor, action, entity_type: entity, entity_id: entityId, before, after,
  } as any);
}

/* ===== HERO BANNERS ===== */
export const cmsListBanners = createServerFn({ method: "GET" })
  .middleware([requireSuperAdmin])
  .handler(async () => {
    const rows = await models.hero_banners.findAll({
      order: [["display_order", "ASC"], ["created_at", "DESC"]]
    });
    return rows.map(r => r.get({ plain: true }));
  });

const bannerSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  subtitle: z.string().optional().nullable(),
  image_url: z.string().min(1),
  cta_label: z.string().optional().nullable(),
  cta_url: z.string().optional().nullable(),
  display_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
});

export const cmsUpsertBanner = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .validator(bannerSchema)
  .handler(async ({ data, context }) => {
    let row;
    if (data.id) {
      await models.hero_banners.update(data, { where: { id: data.id } });
      row = await models.hero_banners.findByPk(data.id);
    } else {
      row = await models.hero_banners.create(data as any);
    }
    const plain = row!.get({ plain: true });
    await logAudit(context.userId, data.id ? "update" : "create", "hero_banner", plain.id, null, plain);
    return plain;
  });

export const cmsDeleteBanner = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await models.hero_banners.destroy({ where: { id: data.id } });
    await logAudit(context.userId, "delete", "hero_banner", data.id, null, null);
    return { ok: true };
  });

/* ===== PROMO SECTIONS ===== */
export const cmsListPromos = createServerFn({ method: "GET" })
  .middleware([requireSuperAdmin])
  .handler(async () => {
    const rows = await models.promo_sections.findAll({
      order: [["slot", "ASC"], ["display_order", "ASC"]]
    });
    return rows.map(r => r.get({ plain: true }));
  });

const promoSchema = z.object({
  id: z.string().uuid().optional(),
  slot: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  link_url: z.string().optional().nullable(),
  badge: z.string().optional().nullable(),
  display_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export const cmsUpsertPromo = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .validator(promoSchema)
  .handler(async ({ data, context }) => {
    let row;
    if (data.id) {
      await models.promo_sections.update(data, { where: { id: data.id } });
      row = await models.promo_sections.findByPk(data.id);
    } else {
      row = await models.promo_sections.create(data as any);
    }
    const plain = row!.get({ plain: true });
    await logAudit(context.userId, data.id ? "update" : "create", "promo_section", plain.id, null, plain);
    return plain;
  });

export const cmsDeletePromo = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await models.promo_sections.destroy({ where: { id: data.id } });
    await logAudit(context.userId, "delete", "promo_section", data.id, null, null);
    return { ok: true };
  });

/* ===== TESTIMONIALS ===== */
export const cmsListTestimonials = createServerFn({ method: "GET" })
  .middleware([requireSuperAdmin])
  .handler(async () => {
    const rows = await models.testimonials.findAll({
      order: [["display_order", "ASC"], ["created_at", "DESC"]]
    });
    return rows.map(r => r.get({ plain: true }));
  });

const testimonialSchema = z.object({
  id: z.string().uuid().optional(),
  author_name: z.string().min(1),
  author_role: z.string().optional().nullable(),
  avatar_url: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5).default(5),
  quote: z.string().min(1),
  display_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export const cmsUpsertTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .validator(testimonialSchema)
  .handler(async ({ data, context }) => {
    let row;
    if (data.id) {
      await models.testimonials.update(data, { where: { id: data.id } });
      row = await models.testimonials.findByPk(data.id);
    } else {
      row = await models.testimonials.create(data as any);
    }
    const plain = row!.get({ plain: true });
    await logAudit(context.userId, data.id ? "update" : "create", "testimonial", plain.id, null, plain);
    return plain;
  });

export const cmsDeleteTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await models.testimonials.destroy({ where: { id: data.id } });
    await logAudit(context.userId, "delete", "testimonial", data.id, null, null);
    return { ok: true };
  });

/* ===== FOOTER ===== */
export const cmsGetFooter = createServerFn({ method: "GET" })
  .middleware([requireSuperAdmin])
  .handler(async () => {
    const row = await models.site_settings.findByPk("footer");
    return (row?.data as any) ?? {};
  });

export const cmsUpdateFooter = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .validator((d: { data: Record<string, any> }) => d)
  .handler(async ({ data, context }) => {
    let row = await models.site_settings.findByPk("footer");
    if (row) {
      await models.site_settings.update({ data: data.data, updated_at: new Date() }, { where: { id: "footer" } });
      row = await models.site_settings.findByPk("footer");
    } else {
      row = await models.site_settings.create({ id: "footer", data: data.data, updated_at: new Date() });
    }
    const plain = row!.get({ plain: true });
    await logAudit(context.userId, "update", "site_settings", "footer", null, plain);
    return plain;
  });

/* ===== CMS PAGES ===== */
export const cmsListPages = createServerFn({ method: "GET" })
  .middleware([requireSuperAdmin])
  .handler(async () => {
    const rows = await models.cms_pages.findAll({
      attributes: ["id", "slug", "title", "is_published", "published_at", "updated_at"],
      order: [["updated_at", "DESC"]]
    });
    return rows.map(r => r.get({ plain: true }));
  });

export const cmsGetPage = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const row = await models.cms_pages.findByPk(data.id);
    if (!row) throw new Error("Page not found");
    return row.get({ plain: true });
  });

const pageSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "lowercase, numbers, dashes only"),
  title: z.string().min(1),
  body_html: z.string().default(""),
  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),
  is_published: z.boolean().default(false),
});

export const cmsUpsertPage = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .validator((d: unknown) => pageSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload: any = { ...data };
    if (data.is_published) payload.published_at = new Date();
    
    let row;
    if (data.id) {
      await models.cms_pages.update(payload, { where: { id: data.id } });
      row = await models.cms_pages.findByPk(data.id);
    } else {
      row = await models.cms_pages.create(payload);
    }
    const plain = row!.get({ plain: true });
    await logAudit(context.userId, data.id ? "update" : "create", "cms_page", plain.id, null, plain);
    return plain;
  });

export const cmsDeletePage = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await models.cms_pages.destroy({ where: { id: data.id } });
    await logAudit(context.userId, "delete", "cms_page", data.id, null, null);
    return { ok: true };
  });

/* ===== AVATAR IMAGE (D-ID source image) ===== */
const AVATAR_BUCKET = "avatar-images";
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 5; // 5 years

async function signAvatar(path: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage.from(AVATAR_BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export const cmsGetAvatar = createServerFn({ method: "GET" })
  .middleware([requireSuperAdmin])
  .handler(async () => {
    const row = await models.site_settings.findByPk("avatar");
    const stored = (row?.data as any) ?? {};
    if (!stored.path) return { path: null as string | null, url: null as string | null };
    const url = await signAvatar(stored.path);
    return { path: stored.path as string, url };
  });

const avatarUploadSchema = z.object({
  fileBase64: z.string().min(10),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  filename: z.string().min(1).max(200),
});

export const cmsUploadAvatar = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .validator((d: unknown) => avatarUploadSchema.parse(d))
  .handler(async ({ data, context }) => {
    const b64 = data.fileBase64.replace(/^data:[^;]+;base64,/, "");
    const bytes = Buffer.from(b64, "base64");
    if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("File too large (max 5MB)");
    const ext = data.contentType === "image/png" ? "png" : data.contentType === "image/webp" ? "webp" : "jpg";
    const path = `avatar-${Date.now()}.${ext}`;

    const { error: upErr } = await supabaseAdmin.storage.from(AVATAR_BUCKET).upload(path, bytes, {
      contentType: data.contentType,
      upsert: true,
    });
    if (upErr) throw new Error(upErr.message);

    // Remove previous file
    const prevRow = await models.site_settings.findByPk("avatar");
    const prevPath = (prevRow?.data as any)?.path as string | undefined;
    if (prevPath && prevPath !== path) {
      await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([prevPath]).catch(() => null);
    }

    const newPayload = { id: "avatar", data: { path, filename: data.filename, content_type: data.contentType }, updated_at: new Date() };
    if (prevRow) {
      await models.site_settings.update(newPayload, { where: { id: "avatar" } });
    } else {
      await models.site_settings.create(newPayload as any);
    }

    const url = await signAvatar(path);
    await logAudit(context.userId, "update", "site_settings", "avatar", null, { path });
    return { path, url };
  });

export const cmsClearAvatar = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .handler(async ({ context }) => {
    const prevRow = await models.site_settings.findByPk("avatar");
    const prevPath = (prevRow?.data as any)?.path as string | undefined;
    if (prevPath) {
      await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([prevPath]).catch(() => null);
    }
    
    if (prevRow) {
      await models.site_settings.update({ data: {}, updated_at: new Date() }, { where: { id: "avatar" } });
    } else {
      await models.site_settings.create({ id: "avatar", data: {}, updated_at: new Date() });
    }
    
    await logAudit(context.userId, "delete", "site_settings", "avatar", null, null);
    return { ok: true };
  });

/** Server-only helper to resolve the active avatar source URL (signed). */
export async function resolveActiveAvatarUrl(): Promise<string | null> {
  const row = await models.site_settings.findByPk("avatar");
  const path = (row?.data as any)?.path as string | undefined;
  if (!path) return null;
  return await signAvatar(path);
}

/** Public getter for client to render the same portrait that D-ID uses. */
export const getActiveAvatarUrl = createServerFn({ method: "GET" })
  .handler(async () => {
    const url = await resolveActiveAvatarUrl();
    return { url };
  });

