import type { ServiceHealthResult } from "../types";
import { models } from "../../db/index.server";

/**
 * SRE Monitor for Supabase Database & Auth Service.
 */
export async function checkSupabaseHealth(): Promise<ServiceHealthResult> {
  const start = Date.now();
  try {
    // Ping DB with a fast lightweight query
    await models.parts.count();
    const elapsed = Date.now() - start;

    return {
      id: "supabase",
      name: "Supabase Database & Auth",
      category: "database",
      status: elapsed > 2000 ? "DEGRADED" : "HEALTHY",
      responseTimeMs: elapsed,
      statusCode: 200,
      message: elapsed > 2000 ? `High latency detected: ${elapsed}ms` : "Database is responsive and healthy",
      lastChecked: new Date().toISOString(),
    };
  } catch (err: any) {
    const elapsed = Date.now() - start;
    return {
      id: "supabase",
      name: "Supabase Database & Auth",
      category: "database",
      status: "DOWN",
      responseTimeMs: elapsed,
      statusCode: 500,
      message: `Database connection error: ${err?.message || "Failed to query database"}`,
      lastChecked: new Date().toISOString(),
    };
  }
}
