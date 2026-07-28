/**
 * Simli HTTP client (server-only). Wraps the Simli REST API used for face
 * creation and for minting short-lived realtime session tokens.
 *
 * NOTE: All calls are server-side; SIMLI_API_KEY never leaves the worker.
 */

const SIMLI_BASE = "https://api.simli.ai";

function requireKey() {
  const key = process.env.SIMLI_API_KEY;
  if (!key) throw new Error("SIMLI_API_KEY missing — add it from Admin → Avatar (Simli tab).");
  return key;
}

async function jsonOrText(res: Response) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch { return text; }
}

/**
 * Upload an image to Simli and get a face_id back.
 * Uses POST /faces/legacy (immediate face_id). Trinity (POST /faces/trinity)
 * is async and takes hours, so it's not used for the admin upload UX.
 */
export async function simliAutoFaceGen(
  imageBytes: Uint8Array,
  contentType: string,
  filename: string,
  opts?: { variant?: "legacy" | "trinity"; faceName?: string },
) {
  const key = requireKey();
  const variant = opts?.variant ?? "legacy";
  const faceName = (opts?.faceName ?? filename.replace(/\.[^.]+$/, "") ?? "untitled_avatar").slice(0, 80);

  const fd = new FormData();
  const ab = imageBytes.buffer.slice(imageBytes.byteOffset, imageBytes.byteOffset + imageBytes.byteLength) as ArrayBuffer;
  fd.append("image", new Blob([ab], { type: contentType }), filename);

  const path = variant === "trinity" ? "/faces/trinity" : "/faces/legacy";
  const url = `${SIMLI_BASE}${path}?face_name=${encodeURIComponent(faceName)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "x-simli-api-key": key },
    body: fd,
  });
  const body = await jsonOrText(res);
  if (!res.ok) {
    const msg = typeof body === "string" ? body : (body as any)?.detail || (body as any)?.error || `Simli ${res.status}`;
    throw new Error(`Simli face upload failed (${res.status}): ${msg}`);
  }
  const data = body as any;
  return {
    faceId: (data?.face_id || data?.faceId || data?.character_uid || data?.uid || data?.id) as string | undefined,
    raw: data,
  };
}

/**
 * Mint a short-lived realtime session token + ICE servers for the browser
 * to open a WebRTC peer connection with Simli. Mirrors the simli-client
 * helpers `generateSimliSessionToken` / `generateIceServers`, but keeps the
 * API key on the server.
 */
export async function simliMintRealtimeSession(opts: {
  faceId: string;
  model?: "fasttalk" | "artalk" | null;
  maxSessionLength?: number;
  maxIdleTime?: number;
}) {
  const key = requireKey();
  const config = {
    faceId: opts.faceId,
    handleSilence: true,
    maxSessionLength: opts.maxSessionLength ?? 3600,
    maxIdleTime: opts.maxIdleTime ?? 300,
    ...(opts.model ? { model: opts.model } : {}),
  };

  const tokenRes = await fetch(`${SIMLI_BASE}/compose/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-simli-api-key": key },
    body: JSON.stringify(config),
  });
  const tokenBody = await jsonOrText(tokenRes);
  if (!tokenRes.ok) {
    const msg = typeof tokenBody === "string" ? tokenBody : (tokenBody as any)?.detail || `Simli ${tokenRes.status}`;
    throw new Error(`Simli token mint failed: ${msg}`);
  }
  const sessionToken = (tokenBody as any)?.session_token as string | undefined;
  if (!sessionToken) throw new Error("Simli token response missing session_token");

  const iceRes = await fetch(`${SIMLI_BASE}/compose/ice`, {
    method: "GET",
    headers: { "Content-Type": "application/json", "x-simli-api-key": key },
  });
  const iceBody = await jsonOrText(iceRes);
  if (!iceRes.ok) {
    const msg = typeof iceBody === "string" ? iceBody : (iceBody as any)?.detail || `Simli ${iceRes.status}`;
    throw new Error(`Simli ICE fetch failed: ${msg}`);
  }
  const iceServers = Array.isArray(iceBody) ? iceBody : (iceBody as any)?.iceServers ?? [];

  return { sessionToken, iceServers };
}

/** Best-effort delete; ignores 404. */
export async function simliDeleteFace(faceId: string) {
  const key = requireKey();
  const res = await fetch(`${SIMLI_BASE}/faces/${encodeURIComponent(faceId)}`, {
    method: "DELETE",
    headers: { "x-simli-api-key": key },
  });
  if (!res.ok && res.status !== 404) {
    const body = await jsonOrText(res);
    const msg = typeof body === "string" ? body : (body as any)?.detail || (body as any)?.error || `Simli ${res.status}`;
    throw new Error(`Simli face delete failed: ${msg}`);
  }
  return { ok: true as const };
}

export function hasSimliKey(): boolean {
  return Boolean(process.env.SIMLI_API_KEY);
}
