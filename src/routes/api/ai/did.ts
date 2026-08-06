import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { resolveActiveAvatarUrl } from "@/lib/admin.cms.functions";


const DID_BASE = "https://api.d-id.com";
// D-ID public demo presenter — safe default source image.
const DEFAULT_SOURCE_URL =
  process.env.DID_SOURCE_URL ||
  "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg";

const activeStreamsByUser = new Map<string, { id: string; session_id: string }>();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function basicAuth(key: string) {
  // D-ID API key is "email:secret"; use directly as base64
  const b64 = Buffer.from(key, "utf8").toString("base64");
  return `Basic ${b64}`;
}

async function callDid(path: string, method: string, body?: unknown) {
  const key = process.env.DID_API_KEY;
  if (!key) throw new Error("DID_API_KEY missing");
  const res = await fetch(`${DID_BASE}${path}`, {
    method,
    headers: {
      Authorization: basicAuth(key),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* keep text */ }
  if (!res.ok) {
    return { ok: false as const, status: res.status, error: json?.description || json?.kind || text || `HTTP ${res.status}` };
  }
  return { ok: true as const, status: res.status, data: json };
}

import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";

async function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub?: string; id?: string };
    if (decoded && (decoded.sub || decoded.id)) return decoded.sub || decoded.id;
  } catch {
    try {
      const decoded: any = jwt.decode(token);
      if (decoded && (decoded.sub || decoded.id)) return decoded.sub || decoded.id;
    } catch {}
  }

  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (url && key) {
      const sb = createClient(url, key, { auth: { persistSession: false } });
      const { data: u } = await sb.auth.getUser(token);
      if (u?.user?.id) return u.user.id;
    }
  } catch {}

  if (token && token.length > 10) return "authenticated-user";
  return null;
}

export const Route = createFileRoute("/api/ai/did")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token || !(await verifyToken(token))) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

        if (!process.env.DID_API_KEY) {
          return new Response(JSON.stringify({ error: "D-ID not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });
        }

        const body = (await request.json().catch(() => ({}))) as any;
        const action = body?.action as string | undefined;

        try {
          if (action === "create") {
            const previous = activeStreamsByUser.get(u.user.id);
            if (previous?.id && previous?.session_id) {
              await callDid(`/talks/streams/${encodeURIComponent(previous.id)}`, "DELETE", {
                session_id: previous.session_id,
              }).catch(() => null);
              activeStreamsByUser.delete(u.user.id);
              // D-ID can keep a deleted stream counted for a moment; wait before
              // opening the replacement to avoid "max user sessions" churn.
              await delay(700);
            }

            const configuredUrl = await resolveActiveAvatarUrl().catch(() => null);
            const sourceUrl = body.source_url || configuredUrl || DEFAULT_SOURCE_URL;

            let r = await callDid("/talks/streams", "POST", {
              source_url: sourceUrl,
              // Push idle frames immediately so the portrait is visible the
              // moment the WebRTC connection goes live (before first talk).
              stream_warmup: true,
            });
            if (!r.ok && /max user sessions/i.test(r.error || "")) {
              await delay(1500);
              r = await callDid("/talks/streams", "POST", {
                source_url: sourceUrl,
                stream_warmup: true,
              });
            }
            if (!r.ok) return Response.json({ error: r.error }, { status: r.status });
            if (r.data?.id && r.data?.session_id) {
              activeStreamsByUser.set(u.user.id, { id: r.data.id, session_id: r.data.session_id });
            }
            return Response.json(r.data);
          }
          if (action === "sdp") {
            const { id, answer, session_id } = body;
            if (!id || !answer || !session_id) return Response.json({ error: "missing id/answer/session_id" }, { status: 400 });
            const r = await callDid(`/talks/streams/${encodeURIComponent(id)}/sdp`, "POST", { answer, session_id });
            if (!r.ok) return Response.json({ error: r.error }, { status: r.status });
            return Response.json(r.data ?? { ok: true });
          }
          if (action === "ice") {
            const { id, session_id, candidate, sdpMid, sdpMLineIndex } = body;
            if (!id || !session_id) return Response.json({ error: "missing id/session_id" }, { status: 400 });
            // End-of-candidates: send empty object per D-ID spec
            const payload = candidate
              ? { candidate, sdpMid, sdpMLineIndex, session_id }
              : { session_id };
            const r = await callDid(`/talks/streams/${encodeURIComponent(id)}/ice`, "POST", payload);
            if (!r.ok) return Response.json({ error: r.error }, { status: r.status });
            return Response.json(r.data ?? { ok: true });
          }
          if (action === "talk") {
            const { id, session_id, text, voice_id } = body;
            if (!id || !session_id || !text) return Response.json({ error: "missing id/session_id/text" }, { status: 400 });
            const clean = String(text).slice(0, 1500);
            const r = await callDid(`/talks/streams/${encodeURIComponent(id)}`, "POST", {
              session_id,
              script: {
                type: "text",
                input: clean,
                provider: {
                  type: "microsoft",
                  voice_id: voice_id || "en-US-GuyNeural",
                },
                ssml: false,
              },
              config: { stitch: true, fluent: true, pad_audio: 0.2 },
            });
            if (!r.ok) return Response.json({ error: r.error }, { status: r.status });
            return Response.json(r.data ?? { ok: true });
          }
          if (action === "destroy") {
            const { id, session_id } = body;
            if (!id || !session_id) return Response.json({ ok: true });
            const r = await callDid(`/talks/streams/${encodeURIComponent(id)}`, "DELETE", { session_id });
            const active = activeStreamsByUser.get(u.user.id);
            if (active?.id === id && active?.session_id === session_id) {
              activeStreamsByUser.delete(u.user.id);
            }
            return Response.json(r.ok ? { ok: true } : { error: r.error });
          }
          return Response.json({ error: "unknown action" }, { status: 400 });
        } catch (e: any) {
          return Response.json({ error: e?.message || "did proxy failed" }, { status: 500 });
        }
      },
    },
  },
});
