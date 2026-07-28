import { createFileRoute } from "@tanstack/react-router";
import { verifyChatbotKey } from "@/lib/chatbot-auth.server";
import { models } from "@/lib/db/index.server";

// Map friendly intent keys (used by the chatbot) to internal ai_prompts.key values.
const INTENT_ALIAS: Record<string, string> = {
  super_intent: "system",
  system: "system",
};

export const Route = createFileRoute("/api/public/prompts/$intentKey")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const unauthorized = verifyChatbotKey(request);
        if (unauthorized) return unauthorized;

        const requested = String(params.intentKey ?? "").trim();
        const internalKey = INTENT_ALIAS[requested] ?? requested;

        try {
          const prompt = await models.ai_prompts.findOne({
            attributes: [
              "key", "name", "content", "aliases_text", "clarification_rules_text", "reference_text"
            ],
            where: { key: internalKey }
          });

          if (!prompt) {
            return Response.json({ success: false, error: "Prompt not found" }, { status: 404 });
          }

          const vips = await models.ai_vip_numbers.findAll({
            attributes: ["phone"]
          });
          const vipList = vips
            .map((r) => r.phone)
            .filter(Boolean)
            .join(",");

          return Response.json({
            success: true,
            data: {
              intent_key: requested,
              display_name: prompt.name ?? requested,
              prompt_text: prompt.content ?? "",
              parts_alias_text: prompt.aliases_text ?? "",
              clarification_rules: prompt.clarification_rules_text ?? "",
              reference_text: prompt.reference_text ?? "",
              vip_numbers: vipList,
            },
          });
        } catch (error: any) {
          return Response.json({ success: false, error: error.message }, { status: 500 });
        }
      },
    },
  },
});
