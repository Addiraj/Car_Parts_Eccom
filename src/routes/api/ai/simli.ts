import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/ai/simli")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
        }
        const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
        const { data: u } = await sb.auth.getUser(token);
        if (!u.user?.id) {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
        }

        if (!process.env.SIMLI_API_KEY) {
          return Response.json({ error: "Simli not configured — add SIMLI_API_KEY." }, { status: 500 });
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
            
            const faceId = providerData?.face_id as string | undefined;
            if (!faceId) {
              return Response.json({ error: "No Simli face configured. Upload a face image in Admin → Avatar → Simli." }, { status: 400 });
            }
            const modelRaw = providerData?.model as string | undefined;
            const model = modelRaw === "fasttalk" || modelRaw === "artalk" ? modelRaw : null;
            const { simliMintRealtimeSession } = await import("@/lib/avatar/simli.server");
            const session = await simliMintRealtimeSession({ faceId, model });
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
