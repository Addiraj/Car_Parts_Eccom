/**
 * Server-only helper: load active prompts from DB with a short in-memory cache.
 * Falls back to provided defaults when the table is empty or the request fails.
 */
type CacheEntry = {
  content: string;
  model: string;
  temperature: number;
  aliasesText: string | null;
  clarificationRulesText: string | null;
  referenceText: string | null;
  expires: number;
};
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

const SAFE_DEFAULT_MODEL = "gpt-4o-mini";
const ALLOWED_MODELS = new Set([
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.1-mini",
  "gpt-4.1",
]);

function sanitizeModel(m?: string | null, fallback?: string): string {
  const raw = (m || fallback || SAFE_DEFAULT_MODEL).trim();
  // Strip legacy vendor prefix (e.g. "openai/gpt-4o-mini" or "google/gemini-...")
  const candidate = raw.includes("/") ? raw.slice(raw.indexOf("/") + 1) : raw;
  if (!ALLOWED_MODELS.has(candidate)) return SAFE_DEFAULT_MODEL;
  return candidate;
}

export async function loadPrompt(
  key: string,
  fallback: { content: string; model?: string; temperature?: number },
): Promise<Omit<CacheEntry, "expires">> {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expires > now) return cached;
  try {
    const { models } = await import("@/lib/db/index.server");
    const data = await models.ai_prompts.findOne({
      attributes: ["content", "model", "temperature", "aliases_text", "clarification_rules_text", "reference_text"],
      where: { key, is_active: true }
    });
    
    if (data) {
      const row = data.get({ plain: true });
      const entry: CacheEntry = {
        content: row.content,
        model: sanitizeModel(row.model, fallback.model),
        temperature: Number(row.temperature ?? fallback.temperature ?? 0.4),
        aliasesText: row.aliases_text,
        clarificationRulesText: row.clarification_rules_text,
        referenceText: row.reference_text,
        expires: now + TTL_MS,
      };
      cache.set(key, entry);
      return entry;
    }
  } catch (e) {
    console.error(`[loadPrompt] Failed to load prompt "${key}" from DB:`, e);
  }
  return {
    content: fallback.content,
    model: sanitizeModel(fallback.model),
    temperature: fallback.temperature ?? 0.4,
    aliasesText: null,
    clarificationRulesText: null,
    referenceText: null,
  };
}

export function invalidatePromptCache(key: string) {
  cache.delete(key);
}
