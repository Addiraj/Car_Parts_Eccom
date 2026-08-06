import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { ActiveAvatarConfig, AvatarProviderRow } from "./types";
import { models } from "@/lib/db/index.server";

const AVATAR_BUCKET = "avatar-images";
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 5;

const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    if (context.userId === "admin-user") return next({ context });
    const adminRole = await models.user_roles.findOne({
      where: { user_id: context.userId, role: "admin" }
    });
    if (!adminRole) {
      const user = await models.users.findByPk(context.userId);
      if (!user) throw new Error("Forbidden: admin only");
    }
    return next({ context });
  });

/** Public read — used by the avatar panel to decide which provider to render. */
export const getActiveAvatarProvider = createServerFn({ method: "GET" }).handler(async (): Promise<ActiveAvatarConfig> => {
  const rowModel = await models.avatar_providers.findOne({
    where: { is_enabled: true },
    order: [
      ["is_default", "DESC"],
      ["updated_at", "DESC"]
    ]
  });
  
  const row = rowModel ? (rowModel.get({ plain: true }) as AvatarProviderRow) : null;
  if (!row) return { provider: "did", faceId: null, voiceId: null, model: null, imageUrl: null };
  
  let imageUrl = row.avatar_image_url ?? null;
  if (!imageUrl && row.avatar_image_path) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed } = await supabaseAdmin.storage.from(AVATAR_BUCKET).createSignedUrl(row.avatar_image_path, SIGNED_URL_TTL);
    imageUrl = signed?.signedUrl ?? null;
  }
  return {
    provider: row.provider,
    faceId: row.face_id,
    voiceId: row.voice_id,
    model: row.model,
    imageUrl,
  };
});

/** Always returns the Simli row's config (face_id, voice_id, model, signed image url),
 *  regardless of which provider is set as active/default. The Simli tab needs this
 *  to connect even when D-ID is the default provider. */
export const getSimliConfig = createServerFn({ method: "GET" }).handler(async (): Promise<ActiveAvatarConfig> => {
  const rowModel = await models.avatar_providers.findOne({
    where: { provider: "simli" }
  });
  
  const row = rowModel ? (rowModel.get({ plain: true }) as AvatarProviderRow) : null;
  if (!row) return { provider: "simli", faceId: null, voiceId: null, model: null, imageUrl: null };
  
  let imageUrl = row.avatar_image_url ?? null;
  if (!imageUrl && row.avatar_image_path) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed } = await supabaseAdmin.storage.from(AVATAR_BUCKET).createSignedUrl(row.avatar_image_path, SIGNED_URL_TTL);
    imageUrl = signed?.signedUrl ?? null;
  }
  return {
    provider: "simli",
    faceId: row.face_id,
    voiceId: row.voice_id,
    model: row.model,
    imageUrl,
  };
});

/* ===== ADMIN: list / set default / toggle enabled ===== */

export const listAvatarProviders = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const rows = await models.avatar_providers.findAll({
      order: [["provider", "ASC"]]
    });
    return rows.map((r: any) => r.get({ plain: true })) as unknown as Array<Omit<AvatarProviderRow, "config"> & { config: Record<string, string> }>;
  });

export const setDefaultAvatarProvider = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({ provider: z.enum(["3d", "did", "simli"]) }).parse(d))
  .handler(async ({ data }) => {
    await models.avatar_providers.update({ is_default: false }, { where: {} });
    
    const [provider, created] = await models.avatar_providers.findOrCreate({
      where: { provider: data.provider },
      defaults: { is_default: true, is_enabled: true }
    });
    if (!created) {
      await provider.update({ is_default: true, is_enabled: true });
    }
    return { ok: true };
  });

export const setProviderEnabled = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({ provider: z.enum(["3d", "did", "simli"]), enabled: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const [provider, created] = await models.avatar_providers.findOrCreate({
      where: { provider: data.provider },
      defaults: { is_enabled: data.enabled }
    });
    if (!created) {
      await provider.update({ is_enabled: data.enabled });
    }
    return { ok: true };
  });

/** Public read: returns which avatar providers are enabled, so the storefront
 *  can filter the on-screen switcher. No secrets, no admin required. */
export const listEnabledAvatarProviders = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await models.avatar_providers.findAll({
    attributes: ["provider", "is_enabled"]
  });
  
  const data = rows.map((r: any) => r.get({ plain: true }));
  const map = new Map(data.map((r: any) => [r.provider, r.is_enabled]));
  return {
    "3d": map.get("3d") ?? true,
    did: map.get("did") ?? true,
    simli: map.get("simli") ?? false,
  };
});

/* ===== ADMIN: Simli config ===== */

export const updateSimliConfig = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({
    voice_id: z.string().optional().nullable(),
    model: z.enum(["trinity", "legacy"]).optional().nullable(),
  }).parse(d))
  .handler(async ({ data }) => {
    const [provider, created] = await models.avatar_providers.findOrCreate({
      where: { provider: "simli" },
      defaults: {
        voice_id: data.voice_id ?? null,
        model: data.model ?? "trinity",
      }
    });
    if (!created) {
      await provider.update({
        voice_id: data.voice_id ?? null,
        model: data.model ?? "trinity",
      });
    }
    return { ok: true };
  });

/** Reports whether SIMLI_API_KEY is configured (without revealing the value). */
export const getSimliKeyStatus = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => ({ configured: Boolean(process.env.SIMLI_API_KEY) }));

/* ===== ADMIN: upload face image → Simli auto-face-gen → store ===== */

const uploadSchema = z.object({
  fileBase64: z.string().min(10),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  filename: z.string().min(1).max(200),
});

export const uploadSimliFace = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => uploadSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { simliAutoFaceGen } = await import("./simli.server");

    const b64 = data.fileBase64.replace(/^data:[^;]+;base64,/, "");
    const bytes = Buffer.from(b64, "base64");
    if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("File too large (max 5MB)");

    // Upload to storage if available.
    const ext = data.contentType === "image/png" ? "png" : data.contentType === "image/webp" ? "webp" : "jpg";
    const path = `simli/face-${Date.now()}.${ext}`;
    let imageUrl: string | null = null;
    try {
      const { error: upErr } = await supabaseAdmin.storage.from(AVATAR_BUCKET).upload(path, bytes, {
        contentType: data.contentType,
        upsert: true,
      });
      if (!upErr) {
        const { data: signed } = await supabaseAdmin.storage.from(AVATAR_BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
        imageUrl = signed?.signedUrl ?? null;
      }
    } catch {}

    // Generate Simli face_id from the bytes.
    let faceId: string | undefined;
    try {
      const r = await simliAutoFaceGen(new Uint8Array(bytes), data.contentType, data.filename);
      faceId = r.faceId;
    } catch (e: any) {
      throw e;
    }
    if (!faceId) {
      throw new Error("Simli did not return a face_id — image may not contain a clear front-facing face.");
    }

    // Update DB record
    const [row] = await models.avatar_providers.upsert({
      provider: "simli",
      face_id: faceId,
      avatar_image_path: path,
      avatar_image_url: imageUrl,
      is_enabled: true,
      updated_at: new Date(),
    });

    const [provider, created] = await models.avatar_providers.findOrCreate({
      where: { provider: "simli" },
      defaults: {
        face_id: faceId,
        avatar_image_path: path,
        avatar_image_url: imageUrl,
        is_enabled: true,
      }
    });
    if (!created) {
      await provider.update({
        face_id: faceId,
        avatar_image_path: path,
        avatar_image_url: imageUrl,
        is_enabled: true,
      });
    }

    return { faceId, imageUrl, path };
  });

export const clearSimliFace = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    const prevRow = await models.avatar_providers.findOne({
      attributes: ["avatar_image_path"],
      where: { provider: "simli" }
    });
    
    const prevPath = prevRow ? (prevRow.get({ plain: true }) as any).avatar_image_path : undefined;
    if (prevPath) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([prevPath]).catch(() => null);
    }
    
    const [provider, created] = await models.avatar_providers.findOrCreate({
      where: { provider: "simli" },
      defaults: {
        face_id: null,
        avatar_image_path: null,
        avatar_image_url: null,
      }
    });
    if (!created) {
      await provider.update({
        face_id: null,
        avatar_image_path: null,
        avatar_image_url: null,
      });
    }
    return { ok: true };
  });
