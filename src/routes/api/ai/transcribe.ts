import { createFileRoute } from "@tanstack/react-router";
import jwt from "jsonwebtoken";

export const Route = createFileRoute("/api/ai/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        // Use local JWT verification (same as all other endpoints)
        const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_dev_only_change_in_prod";
        let userId: string | null = null;
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { sub?: string; id?: string };
          userId = decoded.sub || decoded.id || null;
        } catch {
          return new Response("Unauthorized: Invalid token", { status: 401 });
        }
        if (!userId) return new Response("Unauthorized", { status: 401 });

        const key = process.env.OPENAI_API_KEY;
        if (!key) return new Response("AI not configured", { status: 500 });

        const form = await request.formData();
        const file = form.get("file");
        if (!file || !(file instanceof Blob)) return new Response("file required", { status: 400 });
        if (file.size < 1024) return new Response("Recording too short", { status: 400 });

        const mime = (file as Blob).type.split(";")[0];
        const ext = ({ "audio/webm": "webm", "audio/mp4": "mp4", "audio/mpeg": "mp3", "audio/wav": "wav", "audio/ogg": "ogg" } as Record<string, string>)[mime] ?? "webm";

        const upstream = new FormData();
        upstream.append("model", "gpt-4o-mini-transcribe");
        upstream.append("file", file, `recording.${ext}`);
        upstream.append("stream", "true");

        const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: upstream,
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          return new Response(`Transcription failed: ${res.status} ${t}`, { status: res.status });
        }

        // Fire-and-forget analytics log
        try {
          const { models } = await import("@/lib/db/index.server");
          await models.ai_chat_events.create({
            user_id: userId,
            event_type: "voice_transcribe",
            payload: { size: file.size, mime } as any,
          });
        } catch {/* ignore */}

        return new Response(res.body, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});
