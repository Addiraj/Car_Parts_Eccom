import type { ServiceHealthResult } from "../types";

/**
 * SRE Monitor for Simli Avatar Realtime API.
 * Checks SIMLI_API_KEY presence, endpoint accessibility, face session quotas, and latency.
 */
export async function checkSimliHealth(): Promise<ServiceHealthResult> {
  const start = Date.now();
  const key = process.env.SIMLI_API_KEY;

  if (!key) {
    return {
      id: "simli",
      name: "Simli API (3D Avatar Engine)",
      category: "avatar",
      status: "DEGRADED",
      responseTimeMs: 0,
      statusCode: 400,
      message: "SIMLI_API_KEY is not configured in .env",
      lastChecked: new Date().toISOString(),
    };
  }

  try {
    const res = await fetch("https://api.simli.ai/getFace", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ apiKey: key }),
      signal: AbortSignal.timeout(8000),
    });

    const elapsed = Date.now() - start;

    if (res.status === 200) {
      const data = await res.json().catch(() => ({}));
      return {
        id: "simli",
        name: "Simli API (3D Avatar Engine)",
        category: "avatar",
        status: "HEALTHY",
        responseTimeMs: elapsed,
        statusCode: 200,
        message: "Simli API is active and avatar faces are configured",
        details: { facesFound: Array.isArray(data) ? data.length : "ok" },
        lastChecked: new Date().toISOString(),
      };
    }

    const bodyText = await res.text();
    const isQuota = res.status === 429 || bodyText.toLowerCase().includes("credit") || bodyText.toLowerCase().includes("quota") || bodyText.toLowerCase().includes("limit");

    if (isQuota) {
      return {
        id: "simli",
        name: "Simli API (3D Avatar Engine)",
        category: "avatar",
        status: "LOW_CREDITS",
        responseTimeMs: elapsed,
        statusCode: res.status,
        message: "Simli account has low credits or session quota limit reached! Top up at simli.ai",
        details: { rawError: bodyText.slice(0, 300) },
        lastChecked: new Date().toISOString(),
      };
    }

    if (res.status === 401 || res.status === 403) {
      return {
        id: "simli",
        name: "Simli API (3D Avatar Engine)",
        category: "avatar",
        status: "DOWN",
        responseTimeMs: elapsed,
        statusCode: res.status,
        message: "Simli API Key is invalid or rejected",
        details: { rawError: bodyText.slice(0, 300) },
        lastChecked: new Date().toISOString(),
      };
    }

    return {
      id: "simli",
      name: "Simli API (3D Avatar Engine)",
      category: "avatar",
      status: "DEGRADED",
      responseTimeMs: elapsed,
      statusCode: res.status,
      message: `Simli returned HTTP status ${res.status}`,
      details: { rawError: bodyText.slice(0, 300) },
      lastChecked: new Date().toISOString(),
    };
  } catch (err: any) {
    const elapsed = Date.now() - start;
    return {
      id: "simli",
      name: "Simli API (3D Avatar Engine)",
      category: "avatar",
      status: "DOWN",
      responseTimeMs: elapsed,
      statusCode: 503,
      message: `Simli API connection failed: ${err?.message || "Network Timeout"}`,
      lastChecked: new Date().toISOString(),
    };
  }
}
