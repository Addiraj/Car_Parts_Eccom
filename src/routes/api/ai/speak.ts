import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/ai/speak")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });
        const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
          auth: { persistSession: false },
        });
        const { data: u } = await sb.auth.getUser(token);
        if (!u.user?.id) return new Response("Unauthorized", { status: 401 });

        const key = process.env.OPENAI_API_KEY;
        if (!key) return new Response("AI not configured", { status: 500 });

        const { text, voice } = (await request.json()) as { text?: string; voice?: string };
        if (!text || typeof text !== "string") return new Response("text required", { status: 400 });
        const clean = text.slice(0, 4000);

        const upstream = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini-tts",
            input: clean,
            voice: voice || "alloy",
            stream_format: "sse",
            response_format: "pcm",
          }),
          signal: request.signal,
        }).catch((err) => {
          if (request.signal.aborted) return null;
          throw err;
        });

        if (!upstream) return new Response(null, { status: 499 });
        if (!upstream.ok) {
          const t = await upstream.text().catch(() => "");
          return new Response(`TTS failed: ${upstream.status} ${t}`, { status: upstream.status });
        }
        return new Response(upstream.body, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});
