export function verifyChatbotKey(request: Request): Response | null {
  const provided = request.headers.get("x-chatbot-api-key") ?? "";
  const expected = typeof process !== "undefined" ? process.env?.CHATBOT_API_KEY ?? "" : "";
  if (!expected) return null;
  if (provided !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}
