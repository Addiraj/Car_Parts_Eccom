import type { SreOverviewReport, ServiceHealthResult, ServiceHealthStatus } from "./types";
import { checkOpenAiHealth } from "./monitors/openai.monitor";
import { checkSimliHealth } from "./monitors/simli.monitor";
import { checkSupabaseHealth } from "./monitors/supabase.monitor";
import { checkNhtsaHealth } from "./monitors/nhtsa.monitor";
import { sendSreAlertEmail } from "./sre-emailer.server";
import { models } from "../db/index.server";

// In-memory cache tracking last alert timestamp per service to enforce 1-hour alert cooldown
const lastAlertSentAt: Record<string, { timestamp: number; lastStatus: ServiceHealthStatus }> = {};
const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Runs a complete SRE audit across all third-party APIs and dispatches Free Gmail SMTP emails when needed.
 */
export async function runSreAudit(options?: { forceAlert?: boolean; recipientOverride?: string }): Promise<{
  report: SreOverviewReport;
  emailResult?: { success: boolean; message: string; previewHtml?: string };
}> {
  const [openAiResult, simliResult, supabaseResult, nhtsaResult] = await Promise.allSettled([
    checkOpenAiHealth(),
    checkSimliHealth(),
    checkSupabaseHealth(),
    checkNhtsaHealth(),
  ]);

  const services: ServiceHealthResult[] = [
    openAiResult.status === "fulfilled"
      ? openAiResult.value
      : {
          id: "openai",
          name: "OpenAI API",
          category: "ai",
          status: "DOWN",
          responseTimeMs: 0,
          message: "Check failed unexpectedly",
          lastChecked: new Date().toISOString(),
        },
    simliResult.status === "fulfilled"
      ? simliResult.value
      : {
          id: "simli",
          name: "Simli API",
          category: "avatar",
          status: "DOWN",
          responseTimeMs: 0,
          message: "Check failed unexpectedly",
          lastChecked: new Date().toISOString(),
        },
    supabaseResult.status === "fulfilled"
      ? supabaseResult.value
      : {
          id: "supabase",
          name: "Supabase DB",
          category: "database",
          status: "DOWN",
          responseTimeMs: 0,
          message: "Check failed unexpectedly",
          lastChecked: new Date().toISOString(),
        },
    nhtsaResult.status === "fulfilled"
      ? nhtsaResult.value
      : {
          id: "nhtsa",
          name: "NHTSA VIN API",
          category: "external",
          status: "DOWN",
          responseTimeMs: 0,
          message: "Check failed unexpectedly",
          lastChecked: new Date().toISOString(),
        },
  ];

  let healthyCount = 0;
  let degradedCount = 0;
  let downCount = 0;
  let lowCreditsCount = 0;

  services.forEach((s) => {
    if (s.status === "HEALTHY") healthyCount++;
    else if (s.status === "DEGRADED") degradedCount++;
    else if (s.status === "DOWN") downCount++;
    else if (s.status === "LOW_CREDITS") lowCreditsCount++;
  });

  let overallStatus: ServiceHealthStatus = "HEALTHY";
  if (downCount > 0) overallStatus = "DOWN";
  else if (lowCreditsCount > 0) overallStatus = "LOW_CREDITS";
  else if (degradedCount > 0) overallStatus = "DEGRADED";

  const activeAlerts = services
    .filter((s) => s.status !== "HEALTHY")
    .map((s) => `[${s.status}] ${s.name}: ${s.message}`);

  const report: SreOverviewReport = {
    timestamp: new Date().toISOString(),
    overallStatus,
    totalServices: services.length,
    healthyCount,
    degradedCount,
    downCount,
    lowCreditsCount,
    services,
    activeAlerts,
  };

  // Determine if email alert should be triggered
  const failingServices = services.filter((s) => s.status !== "HEALTHY");
  let shouldSendEmail = options?.forceAlert || false;
  const now = Date.now();

  failingServices.forEach((s) => {
    const prev = lastAlertSentAt[s.id];
    // Send email if: 1) first time failing, 2) status changed (e.g. DEGRADED -> DOWN), or 3) cooldown expired (1 hour)
    if (!prev || prev.lastStatus !== s.status || now - prev.timestamp > ONE_HOUR_MS) {
      shouldSendEmail = true;
      lastAlertSentAt[s.id] = { timestamp: now, lastStatus: s.status };
    }
  });

  // Check for recovered services
  services.forEach((s) => {
    const prev = lastAlertSentAt[s.id];
    if (prev && s.status === "HEALTHY" && prev.lastStatus !== "HEALTHY") {
      shouldSendEmail = true; // Send recovery email
      lastAlertSentAt[s.id] = { timestamp: now, lastStatus: "HEALTHY" };
    }
  });

  let emailResult;
  if (shouldSendEmail && (failingServices.length > 0 || options?.forceAlert)) {
    emailResult = await sendSreAlertEmail(
      failingServices.length > 0 ? failingServices : services,
      options?.recipientOverride
    );

    // Log alert into audit log DB table if available
    try {
      await models.audit_logs.create({
        actor_email: "sre-monitor@system",
        entity_type: "sre_alert",
        entity_id: "sre_overview",
        before: null,
        after: {
          overallStatus,
          failingCount: failingServices.length,
          emailSent: emailResult.success,
          message: emailResult.message,
        },
        ip: "127.0.0.1",
        user_agent: "SRE Monitor Engine",
      });
    } catch {
      // ignore db audit log write if optional
    }
  }

  return { report, emailResult };
}
