import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkOpenAiHealth } from "@/lib/sre/monitors/openai.monitor";
import { checkSimliHealth } from "@/lib/sre/monitors/simli.monitor";
import { checkDatabaseHealth } from "@/lib/sre/monitors/database.monitor";
import { checkVinDecoderHealth } from "@/lib/sre/monitors/vin-decoder.monitor";
import { buildSreEmailTemplate, sendSreAlertEmail } from "@/lib/sre/sre-emailer.server";
import { runSreAudit } from "@/lib/sre/sre-engine.server";

describe("SRE API Monitors", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("checkOpenAiHealth", () => {
    it("returns DEGRADED when OPENAI_API_KEY is missing", async () => {
      const origKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      const res = await checkOpenAiHealth();
      expect(res.status).toBe("DEGRADED");
      expect(res.message).toContain("not configured");
      process.env.OPENAI_API_KEY = origKey;
    });

    it("returns HEALTHY when OpenAI responds 200 OK", async () => {
      process.env.OPENAI_API_KEY = "test-openai-key";
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          status: 200,
          text: async () => JSON.stringify({ data: [] }),
        })
      );
      const res = await checkOpenAiHealth();
      expect(res.status).toBe("HEALTHY");
      expect(res.statusCode).toBe(200);
    });

    it("returns LOW_CREDITS when OpenAI responds 429 Quota Exceeded", async () => {
      process.env.OPENAI_API_KEY = "test-openai-key";
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          status: 429,
          text: async () => "insufficient_quota: You exceeded your current quota",
        })
      );
      const res = await checkOpenAiHealth();
      expect(res.status).toBe("LOW_CREDITS");
      expect(res.message).toContain("insufficient quota");
    });
  });

  describe("checkSimliHealth", () => {
    it("returns DEGRADED when SIMLI_API_KEY is missing", async () => {
      const origKey = process.env.SIMLI_API_KEY;
      delete process.env.SIMLI_API_KEY;
      const res = await checkSimliHealth();
      expect(res.status).toBe("DEGRADED");
      process.env.SIMLI_API_KEY = origKey;
    });

    it("returns HEALTHY when Simli responds 200 OK", async () => {
      process.env.SIMLI_API_KEY = "test-simli-key";
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          status: 200,
          json: async () => [{ face_id: "face-1" }],
        })
      );
      const res = await checkSimliHealth();
      expect(res.status).toBe("HEALTHY");
    });

    it("returns LOW_CREDITS when Simli credit quota is reached", async () => {
      process.env.SIMLI_API_KEY = "test-simli-key";
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          status: 429,
          text: async () => "Simli session limit or credit threshold exceeded",
        })
      );
      const res = await checkSimliHealth();
      expect(res.status).toBe("LOW_CREDITS");
    });
  });

  describe("Free Gmail SRE Emailer", () => {
    it("formats HTML email template with dark mode and alert badges", () => {
      const sampleServices = [
        {
          id: "openai",
          name: "OpenAI API",
          category: "ai" as const,
          status: "LOW_CREDITS" as const,
          responseTimeMs: 120,
          statusCode: 429,
          message: "Account low credits",
          lastChecked: new Date().toISOString(),
        },
      ];

      const html = buildSreEmailTemplate(sampleServices);
      expect(html).toContain("SRE System Alert Notification");
      expect(html).toContain("OpenAI API");
      expect(html).toContain("LOW CREDITS");
    });

    it("returns message when GMAIL_SMTP_USER is not set", async () => {
      delete process.env.GMAIL_SMTP_USER;
      delete process.env.SMTP_USER;

      const res = await sendSreAlertEmail([]);
      expect(res.success).toBe(false);
      expect(res.message).toContain("Free Gmail SMTP credentials not configured");
    });
  });

  describe("SRE Audit Engine", () => {
    it("runs complete audit and compiles report", async () => {
      process.env.OPENAI_API_KEY = "test-key";
      process.env.SIMLI_API_KEY = "test-key";

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          status: 200,
          text: async () => "{}",
          json: async () => ({}),
        })
      );

      const { report } = await runSreAudit();
      expect(report.totalServices).toBe(4);
      expect(report.timestamp).toBeDefined();
    });
  });
});
