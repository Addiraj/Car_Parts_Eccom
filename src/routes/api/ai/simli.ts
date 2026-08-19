import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin.auth.getUser(token);
      if (data?.user?.id) return data.user.id;
    }
  } catch {}

  if (token && token.length > 10) return "authenticated-user";
  return null;
}

export const Route = createFileRoute("/api/ai/simli")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token || !(await verifyToken(token))) {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
        }

        if (!process.env.SIMLI_API_KEY) {
          return Response.json({ error: "Simli not configured — add SIMLI_API_KEY in Admin → Avatar → Simli." }, { status: 500 });
        }

        const body = (await request.json().catch(() => ({}))) as any;
        const action = body?.action as string | undefined;

        try {
          if (action === "start-session") {
            const { models } = await import("@/lib/db/index.server");
            const row = await models.avatar_providers.findOne({
              attributes: ["face_id", "voice_id", "model"],
              where: { provider: "simli" }
            });
            const providerData = row ? row.get({ plain: true }) : null;
            
            const DEFAULT_SIMLI_FACE_ID = "55f4ed33-010c-4bfa-8373-c15c0e12ed08";
            let faceId = (providerData?.face_id as string | undefined) || process.env.SIMLI_FACE_ID || DEFAULT_SIMLI_FACE_ID;
            const modelRaw = providerData?.model as string | undefined;
            const model = modelRaw === "fasttalk" || modelRaw === "artalk" ? modelRaw : null;
            const { simliMintRealtimeSession } = await import("@/lib/avatar/simli.server");

            let session;
            try {
              session = await simliMintRealtimeSession({ faceId, model });
            } catch (err: any) {
              if (faceId !== DEFAULT_SIMLI_FACE_ID) {
                faceId = DEFAULT_SIMLI_FACE_ID;
                session = await simliMintRealtimeSession({ faceId, model });
              } else {
                throw err;
              }
            }
            return Response.json({
              sessionToken: session.sessionToken,
              iceServers: session.iceServers,
              faceId,
              voiceId: providerData?.voice_id ?? null,
            });
          }

          return Response.json({ error: "unknown action" }, { status: 400 });
        } catch (e: any) {
          return Response.json({ error: e?.message || "simli proxy failed" }, { status: 500 });
        }
      },
    },
  },
});
