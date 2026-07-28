import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { verifyChatbotKey } from "@/lib/chatbot-auth.server";

const PayloadSchema = z.object({
  whatsapp_user_id: z.string().min(1).max(64),
  event_type: z.enum(["vin_search", "part_search"]),
  event_data: z.record(z.string(), z.unknown()).default({}),
  timestamp: z.string().datetime().optional(),
});

export const Route = createFileRoute("/api/public/analytics/events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = verifyChatbotKey(request);
        if (denied) return denied;

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ success: false, error: "Invalid JSON" }, { status: 400 });
        }
        const parsed = PayloadSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { success: false, error: "Invalid payload", issues: parsed.error.issues },
            { status: 400 },
          );
        }
        const p = parsed.data;

        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        const { error } = await supabase.from("wa_analytics_events").insert({
          whatsapp_user_id: p.whatsapp_user_id,
          event_type: p.event_type,
          event_data: p.event_data as never,
          occurred_at: p.timestamp ?? new Date().toISOString(),
        } as never);

        if (error) {
          return Response.json({ success: false, error: error.message }, { status: 500 });
        }
        return Response.json({ success: true }, { status: 201 });
      },
    },
  },
});
