import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./auth.middleware";
import { runSreAudit } from "./sre/sre-engine.server";
import { sendSreAlertEmail } from "./sre/sre-emailer.server";

/**
 * Server Function: Get current SRE System Overview.
 */
export const getSreOverview = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { report } = await runSreAudit();
    return report;
  });

/**
 * Server Function: Execute manual SRE audit and send alert email if failing.
 */
export const triggerSreAudit = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(
    z.object({
      forceAlert: z.boolean().optional(),
      recipientOverride: z.string().email().optional(),
    })
  )
  .handler(async ({ data }) => {
    const res = await runSreAudit({
      forceAlert: data.forceAlert,
      recipientOverride: data.recipientOverride,
    });
    return res;
  });

/**
 * Server Function: Send a Test Alert Email via Free Gmail SMTP.
 */
export const sendSreTestAlert = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(
    z.object({
      recipientEmail: z.string().email(),
    })
  )
  .handler(async ({ data }) => {
    const testServices = [
      {
        id: "openai",
        name: "OpenAI API (Chatbot)",
        category: "ai" as const,
        status: "LOW_CREDITS" as const,
        responseTimeMs: 240,
        statusCode: 429,
        message: "TEST ALERT: OpenAI credits are running low ($1.50 remaining). Add credits at platform.openai.com",
        lastChecked: new Date().toISOString(),
      },
      {
        id: "simli",
        name: "Simli API (3D Avatar Engine)",
        category: "avatar" as const,
        status: "DOWN" as const,
        responseTimeMs: 0,
        statusCode: 503,
        message: "TEST ALERT: Simli avatar engine is unresponsive or SIMLI_API_KEY invalid.",
        lastChecked: new Date().toISOString(),
      },
    ];

    const result = await sendSreAlertEmail(testServices, data.recipientEmail);
    return result;
  });
