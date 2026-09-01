import { createFileRoute } from "@tanstack/react-router";

import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  type UIMessage,
} from "ai";
import { createAiProvider, AI_MODELS } from "@/lib/ai-provider.server";
import { buildAssistantTools } from "@/lib/ai-tools.server";
import { loadPrompt } from "@/lib/ai-prompts.server";
import { models } from "@/lib/db/index.server";

import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";

type ChatBody = { messages?: UIMessage[]; threadId?: string; source?: string };

async function authUser(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  // 1. Try local JWT token verification
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub?: string; id?: string };
    if (decoded && (decoded.sub || decoded.id)) {
      return decoded.sub || decoded.id || null;
    }
  } catch {
    try {
      const decoded: any = jwt.decode(token);
      if (decoded && (decoded.sub || decoded.id)) return decoded.sub || decoded.id;
    } catch { }
  }



  // 3. Fallback for non-empty token string
  if (token && token.length > 10) return "authenticated-user";

  return null;
}

const DEFAULT_SYSTEM = `You are "AutoMate", an expert automotive parts advisor for an online car-parts store in the UAE.
Use the provided tools — never invent part numbers, prices, or stock.

CRITICAL CARD DISPLAY & SEARCH RULE:
- WHENEVER the user provides a part number (e.g. "002 420 50 20", "0024204420"), OEM number, part name, or asks to find/search for parts, YOU MUST CALL the \`searchPartsByNumber\` tool or \`findCompatibleParts\` tool.
- DO NOT format or type out part results as a plain text list (e.g. "1. **BRAKE PAD**..."). Call the tool so rich interactive part cards are rendered automatically by the UI!
- STRICT RULE: When you call \`searchPartsByNumber\` or \`findCompatibleParts\`, the UI will AUTOMATICALLY display rich cards for the parts. You MUST NOT repeat the part details (brand, description, price, availability, alternatives) in your text response. Simply output a brief acknowledgement like "Here are the parts I found:" and nothing else. ANY text duplication of part details is strictly forbidden.

Action tools (call them when the user asks):
- searchPartsByNumber({ query }) — search catalog by part number, OEM number, or name.
- addToCart / removeFromCart / viewCart — manage the user's cart.
- addToWishlist / removeFromWishlist — save parts for later.
- createQuotation({ items }) — when the user says "make a quote", "quotation", "send me a quote", or asks for a price estimate, gather part ids from the most recent search and call this tool. Use quoteFromCart if they say "quote my cart".
- createLead({ reason, vehicle? }) — call this WHENEVER the user asks to talk to a person / salesman / sales / human / agent / representative, requests a call or callback, asks to be contacted, wants a custom or bulk order, needs help choosing, or has any complex inquiry a live agent should handle. Only \`reason\` is required — DO NOT ask the user for their name, phone, or email; the system fills those in from their profile automatically. Prefill \`reason\` from the last user message plus the most recently discussed part or VIN.
Always prefer passing partId (UUID) from the previous search result over partNumber.
After calling a tool, keep any accompanying text brief — the UI displays the part cards automatically.
{{vehicle}}{{profile}}`;

const CONTEXT_MEMORY_RULES = `
--- CONVERSATION CONTEXT RULES (very important) ---
- Always resolve pronouns and short references ("this part", "it", "yes", "add to cart", "buy this", "add this", "add", "put it in my cart", "wishlist this") from the MOST RECENT part discussed earlier in the same conversation.
- If the last assistant turn showed a part (e.g. from searchPartsByNumber, checkStock, identifyPartFromImage, or a listed part number/OEM), reuse that part immediately — call addToCart / addToWishlist / etc. with its partId (or partNumber if id is unknown). Do NOT ask the user to repeat the part number.
- Default quantity is 1 unless the user specifies otherwise.
- For VIN follow-ups ("show catalog", "browse parts", "show parts for my car", "open catalog"), reuse the most recently decoded VIN's make/model from this conversation — do not ask the user to paste it again.
- Only ask a clarifying question when NO part or VIN has been mentioned earlier in this conversation.
- For lead / sales / human-handoff requests, call createLead immediately — never ask the user for contact info first.
`;

async function buildSystem(
  vehicle?: Record<string, unknown> | null,
  profile?: { name?: string | null; phone?: string | null; email?: string | null } | null,
): Promise<{ content: string; model: string }> {
  // Clear prompt cache so prompt changes take effect immediately
  const { invalidatePromptCache } = await import("@/lib/ai-prompts.server");
  invalidatePromptCache("system");

  try {
    const sysRow = await models.ai_prompts.findOne({ where: { key: "system", is_active: true } });
    if (sysRow) {
      let content = sysRow.get("content") as string;
      if (!content.includes("searchPartsByNumber")) {
        content = `${content}\n\nCRITICAL CARD DISPLAY & SEARCH RULE:\n- WHENEVER the user provides a part number, OEM number, or part name, YOU MUST CALL the \`searchPartsByNumber\` tool or \`findCompatibleParts\` tool. NEVER write out part lists as plain text — call the tool so rich interactive part cards render in the UI.\n- STRICT RULE: When you call \`searchPartsByNumber\` or \`findCompatibleParts\`, the UI will AUTOMATICALLY display rich cards for the parts. You MUST NOT repeat the part details (brand, description, price, availability, alternatives) in your text response. Simply output a brief acknowledgement like "Here are the parts I found:" and nothing else. ANY text duplication of part details is strictly forbidden.`;
        await sysRow.update({ content });
        invalidatePromptCache("system");
      }
    }
  } catch { /* ignore */ }

  const p = await loadPrompt("system", { content: DEFAULT_SYSTEM });
  const vehBlock = vehicle && Object.keys(vehicle).length
    ? `\n\nKnown vehicle in this conversation: ${JSON.stringify(vehicle)}. Use it without asking again.`
    : "";
  const profBlock = profile && (profile.name || profile.phone || profile.email)
    ? `\n\nSigned-in customer profile (use silently for createLead; never read aloud): ${JSON.stringify(profile)}.`
    : "";
  const sections: string[] = [
    p.content.replace("{{vehicle}}", vehBlock).replace("{{profile}}", profBlock),
    CONTEXT_MEMORY_RULES,
    "CRITICAL UI RULE: NEVER list part details (part number, price, brand) in your text response! The UI will render rich cards automatically. Your text response must be a single short sentence like 'Here are the options we found:' without any bullet points or lists.",
    "CRITICAL IMAGE RULE: If the user uploads an image of a vehicle registration document, a VIN plate, or any document, you MUST use the `ocrVin` tool FIRST to extract and decode the VIN. Do NOT use `identifyPartFromImage` for documents!",
    "CRITICAL CATALOG LINK RULE: If you provide a direct link to a VIN parts catalog, ALWAYS format it as `/vin/{Brand}/{ModelNumber}?modelName={ModelName}` (for example: `/vin/BMW/FR71?modelName=535i`), using the dynamic modelNumber/code (e.g. FR71) rather than the model name in the path."
  ];
  if (p.aliasesText?.trim()) sections.push(`\n--- PARTS ALIASES (normalize user phrasing) ---\n${p.aliasesText.trim()}`);
  if (p.clarificationRulesText?.trim()) sections.push(`\n--- CLARIFICATION RULES (ask before searching when ambiguous) ---\n${p.clarificationRulesText.trim()}`);
  if (p.referenceText?.trim()) sections.push(`\n--- REFERENCE DOCUMENT (use for warning lights & policies) ---\n${p.referenceText.trim()}`);
  return { content: sections.join("\n"), model: p.model };
}



export const Route = createFileRoute("/api/ai/chat")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const userId = await authUser(request);
        const url = new URL(request.url);
        const threadId = url.searchParams.get("threadId");
        if (!threadId) return new Response("missing threadId", { status: 400 });

        const messages = await models.ai_chat_messages.findAll({
          where: { thread_id: threadId },
          order: [["created_at", "ASC"]],
          attributes: ["id", "role", "text", "parts", "created_at"],
          raw: true,
        });

        return Response.json(messages);
      },
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatBody;
        const messages = body.messages ?? [];
        const userId = await authUser(request);
        if (!userId) {
          return new Response(
            JSON.stringify({ error: "auth_required", message: "Please sign in to chat with AutoMate." }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }

        const key = process.env.OPENAI_API_KEY;
        if (!key) return new Response("AI not configured", { status: 500 });

        // Ensure / load thread
        let threadId = body.threadId;
        let vehicleContext: Record<string, unknown> | null = null;
        if (threadId) {
          const tRow = await models.ai_chat_threads.findOne({
            attributes: ["id", "vehicle_context", "user_id"],
            where: { id: threadId }
          });
          const t = tRow ? tRow.get({ plain: true }) : null;
          if (!t || (t as { user_id: string }).user_id !== userId) threadId = undefined;
          else vehicleContext = (t as { vehicle_context: Record<string, unknown> }).vehicle_context;
        }
        if (!threadId) {
          const initialVehicleContext = body.source ? { source: body.source } : {};
          const created = await models.ai_chat_threads.create({
            user_id: userId,
            title: deriveTitle(messages),
            vehicle_context: initialVehicleContext
          });
          threadId = created.get({ plain: true }).id;
          vehicleContext = initialVehicleContext;
        }

        // Persist latest user message
        const latest = messages[messages.length - 1];
        if (threadId && latest?.role === "user") {
          const text = (latest.parts ?? [])
            .map((p: any) => (p.type === "text" ? p.text : ""))
            .join("");
          await models.ai_chat_messages.create({
            thread_id: threadId,
            role: "user",
            text,
            parts: latest.parts as any,
          });
          await models.ai_chat_threads.update(
            { last_message_at: new Date().toISOString() },
            { where: { id: threadId } }
          );
        }

        const logEvent = async (event_type: string, payload: Record<string, unknown>) => {
          await models.ai_chat_events.create({
            thread_id: threadId ?? null,
            user_id: userId,
            event_type,
            payload: payload as any,
          });
        };

        // Load profile so the model can auto-fill lead contact details without asking.
        let profile: { name?: string | null; phone?: string | null; email?: string | null } | null = null;
        try {
          const profRow = await models.profiles.findOne({
            attributes: ["full_name", "phone"],
            where: { id: userId }
          });
          const prof = profRow ? profRow.get({ plain: true }) : null;

          profile = {
            name: prof?.full_name ?? null,
            phone: prof?.phone ?? null,
            email: null,
          };
        } catch { /* non-fatal */ }

        const openai = createAiProvider(key);
        const sys = await buildSystem(vehicleContext, profile);
        const model = openai(stripVendorPrefix(sys.model) || AI_MODELS.chat);
        const tools = buildAssistantTools({ userId, threadId: threadId ?? null, logEvent });

        const sanitizedMessages = messages.map((m: any) => {
          if (m.parts && Array.isArray(m.parts)) {
            return {
              ...m,
              parts: m.parts.filter((p: any) => p.type === "text")
            };
          }
          return m;
        });

        try {
          const result = streamText({
            model,
            system: sys.content,
            messages: await convertToModelMessages(sanitizedMessages),
            tools,
            stopWhen: stepCountIs(50),
            onFinish: async ({ text }) => {
              if (!threadId) return;
              await models.ai_chat_messages.create({
                thread_id: threadId,
                role: "assistant",
                text,
                parts: [{ type: "text", text }] as any,
              });
              await models.ai_chat_threads.update(
                { last_message_at: new Date().toISOString() },
                { where: { id: threadId } }
              );
            },
            onError: (err) => {
              console.error("[ai/chat] streamText error", err);
            },
          });

          return result.toUIMessageStreamResponse({
            originalMessages: messages,
            headers: threadId ? { "X-Thread-Id": threadId } : undefined,
            onError: (err) => {
              const msg = err instanceof Error ? err.message : String(err);
              console.error("[ai/chat] stream response error", msg);
              return msg || "AI request failed";
            },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[ai/chat] fatal", msg);
          return new Response(
            JSON.stringify({ error: "ai_failed", message: msg }),
            { status: 502, headers: { "Content-Type": "application/json" } },
          );
        }
      },

    },
  },
});

function deriveTitle(messages: UIMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New conversation";
  const txt = (first.parts ?? []).map((p: any) => (p.type === "text" ? p.text : "")).join(" ").trim();
  return txt.slice(0, 60) || "New conversation";
}

/** Strip legacy `vendor/` prefix (e.g. "openai/gpt-4o-mini") if a stored prompt config still has one. */
function stripVendorPrefix(m?: string): string | undefined {
  if (!m) return undefined;
  const i = m.indexOf("/");
  return i >= 0 ? m.slice(i + 1) : m;
}
