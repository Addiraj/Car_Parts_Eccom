import type { ServiceHealthResult } from "../types";

/**
 * SRE Monitor for NHTSA Federal VIN Decoder Service.
 */
export async function checkNhtsaHealth(): Promise<ServiceHealthResult> {
  const start = Date.now();
  try {
    const res = await fetch(
      "https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/1HGCR2F83HA000000?format=json",
      { method: "GET", signal: AbortSignal.timeout(6000) }
    );
    const elapsed = Date.now() - start;

    if (res.ok) {
      return {
        id: "nhtsa",
        name: "NHTSA VIN Decoder API",
        category: "external",
        status: elapsed > 3000 ? "DEGRADED" : "HEALTHY",
        responseTimeMs: elapsed,
        statusCode: 200,
        message: "NHTSA VIN API is active and returning vehicle data",
        lastChecked: new Date().toISOString(),
      };
    }

    return {
      id: "nhtsa",
      name: "NHTSA VIN Decoder API",
      category: "external",
      status: "DEGRADED",
      responseTimeMs: elapsed,
      statusCode: res.status,
      message: `NHTSA VIN API returned status ${res.status}`,
      lastChecked: new Date().toISOString(),
    };
  } catch (err: any) {
    const elapsed = Date.now() - start;
    return {
      id: "nhtsa",
      name: "NHTSA VIN Decoder API",
      category: "external",
      status: "DOWN",
      responseTimeMs: elapsed,
      statusCode: 503,
      message: `NHTSA API unreachable: ${err?.message || "Timeout"}`,
      lastChecked: new Date().toISOString(),
    };
  }
}
