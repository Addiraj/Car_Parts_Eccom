import type { ServiceHealthResult } from "../types";
import { models } from "../../db/index.server";

/**
 * SRE Monitor for Local PostgreSQL Database & Sequelize Connection Pool.
 * Verifies local DB connection responsiveness, query latency, and model availability.
 */
export async function checkDatabaseHealth(): Promise<ServiceHealthResult> {
  const start = Date.now();
  try {
    // Ping local PostgreSQL DB via Sequelize model count
    const count = await models.parts.count();
    const elapsed = Date.now() - start;

    return {
      id: "database",
      name: "PostgreSQL Local Database",
      category: "database",
      status: elapsed > 2000 ? "DEGRADED" : "HEALTHY",
      responseTimeMs: elapsed,
      statusCode: 200,
      message: elapsed > 2000 ? `High database query latency: ${elapsed}ms` : `PostgreSQL DB connected (${count} products indexed)`,
      lastChecked: new Date().toISOString(),
    };
  } catch (err: any) {
    const elapsed = Date.now() - start;
    return {
      id: "database",
      name: "PostgreSQL Local Database",
      category: "database",
      status: "DOWN",
      responseTimeMs: elapsed,
      statusCode: 500,
      message: `Local PostgreSQL connection failed: ${err?.message || "Failed to query local database"}`,
      lastChecked: new Date().toISOString(),
    };
  }
}
