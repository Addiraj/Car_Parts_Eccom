import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { models } from "@/lib/db/index.server";
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

        try {
          await models.wa_analytics_events.create({
            whatsapp_user_id: p.whatsapp_user_id,
            event_type: p.event_type,
            event_data: p.event_data as any,
            occurred_at: p.timestamp ? new Date(p.timestamp) : new Date(),
          });
          return Response.json({ success: true }, { status: 201 });
        } catch (error: any) {
          return Response.json({ success: false, error: error.message }, { status: 500 });
        }
      },
    },
  },
});
