import { timingSafeEqual } from "crypto";

export function verifyChatbotKey(request: Request): Response | null {
  const provided = request.headers.get("x-chatbot-api-key") ?? "";
  const expected = process.env.CHATBOT_API_KEY ?? "";
  if (!expected) return new Response("Server misconfigured", { status: 500 });
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}
