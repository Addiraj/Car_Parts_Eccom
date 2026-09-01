import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { models } from "@/lib/db/index.server";
import { verifyChatbotKey } from "@/lib/chatbot-auth.server";

const PayloadSchema = z.object({
  whatsapp_user_id: z.string().min(1).max(64),
  user_locale: z.string().max(16).nullable().optional(),
  user_message: z.string().min(1).max(8000),
  bot_response: z.string().min(1).max(16000),
  intent: z.string().max(120).nullable().optional(),
  timestamp: z.string().datetime().optional(),
});

export const Route = createFileRoute("/api/public/chat-logs")({
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
          await models.wa_chat_logs.create({
            whatsapp_user_id: p.whatsapp_user_id,
            user_locale: p.user_locale ?? null,
            user_message: p.user_message,
            bot_response: p.bot_response,
            intent: p.intent ?? null,
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
