import { createFileRoute } from "@tanstack/react-router";
import { runSreAudit } from "@/lib/sre/sre-engine.server";

/**
 * Webhook / Cron API Endpoint: /api/cron/sre-check
 * Protected by secret token query param: ?token=YOUR_CRON_SECRET
 */
export const Route = createFileRoute("/api/cron/sre-check")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token");
        const secret = process.env.CRON_SECRET || "cpd-sre-secret-key";

        if (token !== secret) {
          return Response.json({ error: "Unauthorized cron execution token" }, { status: 401 });
        }

        const res = await runSreAudit();
        return Response.json({
          success: true,
          timestamp: res.report.timestamp,
          overallStatus: res.report.overallStatus,
          activeAlerts: res.report.activeAlerts,
          emailDispatched: res.emailResult ? res.emailResult.message : "No alert triggered",
        });
      },
    },
  },
});
