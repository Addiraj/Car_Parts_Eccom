import { createOpenAI } from "@ai-sdk/openai";

/**
 * Direct OpenAI provider. Reads OPENAI_API_KEY at call time (server-only).
 */
export function createAiProvider(apiKey?: string) {
  const key = apiKey ?? process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return createOpenAI({ apiKey: key });
}

export const OPENAI_BASE_URL = "https://api.openai.com/v1";

/** Default model ids used across the app. */
export const AI_MODELS = {
  chat: "gpt-4o-mini",
  vision: "gpt-4o-mini",
  tts: "gpt-4o-mini-tts",
  transcribe: "gpt-4o-mini-transcribe",
} as const;
