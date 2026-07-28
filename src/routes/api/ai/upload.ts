import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/ai/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const url = process.env.SUPABASE_URL!;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const sb = createClient(url, key, { auth: { persistSession: false } });
        const { data: u } = await sb.auth.getUser(token);
        const userId = u.user?.id;
        if (!userId) return new Response("Unauthorized", { status: 401 });

        const form = await request.formData();
        const file = form.get("file");
        if (!file || !(file instanceof Blob)) return new Response("file required", { status: 400 });
        if (file.size > 25 * 1024 * 1024) return new Response("File too large", { status: 413 });

        const ext = (file.type.split("/")[1] ?? "bin").replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const buf = new Uint8Array(await file.arrayBuffer());
        const { error } = await supabaseAdmin.storage.from("ai-chat-uploads").upload(path, buf, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
        if (error) return new Response(error.message, { status: 500 });

        const { data: signed } = await supabaseAdmin.storage
          .from("ai-chat-uploads")
          .createSignedUrl(path, 60 * 60 * 24);

        return Response.json({ path, url: signed?.signedUrl ?? null, contentType: file.type, size: file.size });
      },
    },
  },
});
