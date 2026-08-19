import type { ServiceHealthResult } from "../types";
import { supabase } from "@/integrations/supabase/client";

export async function checkDatabaseHealth(): Promise<ServiceHealthResult> {
  const start = Date.now();
  try {
    const { count, error } = await supabase.from("parts").select("id", { count: "exact", head: true });
    const elapsed = Date.now() - start;

    if (error) {
      return {
        id: "database",
        name: "Supabase Database",
        category: "database",
        status: "DEGRADED",
        responseTimeMs: elapsed,
        statusCode: 400,
        message: `Database ping warning: ${error.message}`,
        lastChecked: new Date().toISOString(),
      };
    }

    return {
      id: "database",
      name: "Supabase Database",
      category: "database",
      status: elapsed > 2000 ? "DEGRADED" : "HEALTHY",
      responseTimeMs: elapsed,
      statusCode: 200,
      message: elapsed > 2000 ? `High latency: ${elapsed}ms` : `Supabase DB connected (${count ?? 0} parts indexed)`,
      lastChecked: new Date().toISOString(),
    };
  } catch (err: any) {
    const elapsed = Date.now() - start;
    return {
      id: "database",
      name: "Supabase Database",
      category: "database",
      status: "DOWN",
      responseTimeMs: elapsed,
      statusCode: 500,
      message: `Database connection failed: ${err?.message || "Failed to query database"}`,
      lastChecked: new Date().toISOString(),
    };
  }
}
