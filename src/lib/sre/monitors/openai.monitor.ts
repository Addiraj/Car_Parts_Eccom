import type { ServiceHealthResult } from "../types";

/**
 * SRE Monitor for OpenAI API (Chatbot, Avatar Voice/Audio, Vision).
 * Checks key presence, HTTP status endpoint, 429 quota errors, and response latency.
 */
export async function checkOpenAiHealth(): Promise<ServiceHealthResult> {
  const start = Date.now();
  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    return {
      id: "openai",
      name: "OpenAI API (Chatbot & Voice)",
      category: "ai",
      status: "DEGRADED",
      responseTimeMs: 0,
      statusCode: 400,
      message: "OPENAI_API_KEY is not configured in .env",
      lastChecked: new Date().toISOString(),
    };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(8000),
    });

    const elapsed = Date.now() - start;

    if (res.status === 200) {
      return {
        id: "openai",
        name: "OpenAI API (Chatbot & Voice)",
        category: "ai",
        status: "HEALTHY",
        responseTimeMs: elapsed,
        statusCode: 200,
        message: "OpenAI API is active and responding quickly",
        lastChecked: new Date().toISOString(),
      };
    }

    const bodyText = await res.text();
    let isQuotaError = res.status === 429 || bodyText.toLowerCase().includes("quota") || bodyText.toLowerCase().includes("insufficient_quota");

    if (isQuotaError) {
      return {
        id: "openai",
        name: "OpenAI API (Chatbot & Voice)",
        category: "ai",
        status: "LOW_CREDITS",
        responseTimeMs: elapsed,
        statusCode: res.status,
        message: "OpenAI account has insufficient quota or low credits! Add credits at platform.openai.com",
        details: { rawError: bodyText.slice(0, 300) },
        lastChecked: new Date().toISOString(),
      };
    }

    if (res.status === 401 || res.status === 403) {
      return {
        id: "openai",
        name: "OpenAI API (Chatbot & Voice)",
        category: "ai",
        status: "DOWN",
        responseTimeMs: elapsed,
        statusCode: res.status,
        message: "OpenAI API Key is invalid or expired",
        details: { rawError: bodyText.slice(0, 300) },
        lastChecked: new Date().toISOString(),
      };
    }

    return {
      id: "openai",
      name: "OpenAI API (Chatbot & Voice)",
      category: "ai",
      status: "DEGRADED",
      responseTimeMs: elapsed,
      statusCode: res.status,
      message: `OpenAI returned unexpected status ${res.status}`,
      details: { rawError: bodyText.slice(0, 300) },
      lastChecked: new Date().toISOString(),
    };
  } catch (err: any) {
    const elapsed = Date.now() - start;
    return {
      id: "openai",
      name: "OpenAI API (Chatbot & Voice)",
      category: "ai",
      status: "DOWN",
      responseTimeMs: elapsed,
      statusCode: 503,
      message: `OpenAI API connection failed: ${err?.message || "Network Timeout"}`,
      lastChecked: new Date().toISOString(),
    };
  }
}
