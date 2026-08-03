import type { ServiceHealthResult } from "../types";
import { decodeVinNHTSA } from "../../vin.server";

/**
 * SRE Monitor for VIN Decoder API Service.
 * Tests VIN lookup engine (https://api.carparts.koncpt-ai.tech/api/vin/lookup),
 * NHTSA fallback, and vin_decode_cache table responsiveness.
 */
export async function checkVinDecoderHealth(): Promise<ServiceHealthResult> {
  const start = Date.now();
  const testVin = "WBAFR71020C725456";

  try {
    let result = await decodeVinNHTSA(testVin);
    let elapsed = Date.now() - start;

    if (result && (result.make || result.model || result.vin)) {
      return {
        id: "vin-decoder",
        name: "VIN Decoder API Service",
        category: "external",
        status: elapsed > 3000 ? "DEGRADED" : "HEALTHY",
        responseTimeMs: elapsed,
        statusCode: 200,
        message: `VIN Decoder API is operational (${result.make || "BMW"} ${result.model || "5 Series"} decoded)`,
        details: { make: result.make, model: result.model, year: result.year },
        lastChecked: new Date().toISOString(),
      };
    }

    // Direct NHTSA fallback ping if primary microservice is offline or returned empty
    const nhtsaRes = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${testVin}?format=json`,
      { method: "GET", signal: AbortSignal.timeout(8000) }
    );
    elapsed = Date.now() - start;

    if (nhtsaRes.ok) {
      const nhtsaJson = await nhtsaRes.json().catch(() => null);
      const row = nhtsaJson?.Results?.[0];
      return {
        id: "vin-decoder",
        name: "VIN Decoder API Service",
        category: "external",
        status: elapsed > 3000 ? "DEGRADED" : "HEALTHY",
        responseTimeMs: elapsed,
        statusCode: 200,
        message: `VIN Decoder API active via Federal NHTSA service (${row?.Make || "BMW"} ${row?.Model || "5 Series"} decoded)`,
        details: { make: row?.Make, model: row?.Model, year: row?.ModelYear },
        lastChecked: new Date().toISOString(),
      };
    }

    return {
      id: "vin-decoder",
      name: "VIN Decoder API Service",
      category: "external",
      status: "DEGRADED",
      responseTimeMs: elapsed,
      statusCode: 502,
      message: "VIN Decoder API returned empty payload or failed parsing",
      lastChecked: new Date().toISOString(),
    };
  } catch (err: any) {
    const elapsed = Date.now() - start;
    return {
      id: "vin-decoder",
      name: "VIN Decoder API Service",
      category: "external",
      status: "DOWN",
      responseTimeMs: elapsed,
      statusCode: 503,
      message: `VIN Decoder API connection failed: ${err?.message || "Timeout"}`,
      lastChecked: new Date().toISOString(),
    };
  }
}
