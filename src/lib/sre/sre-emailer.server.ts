import nodemailer from "nodemailer";
import type { ServiceHealthResult } from "./types";

/**
 * Free Gmail SMTP & Standard SMTP Email Dispatcher for SRE System Alerts.
 * Uses 100% Free Gmail SMTP (smtp.gmail.com) via Google App Passwords.
 */
export async function sendSreAlertEmail(
  services: ServiceHealthResult[],
  recipientOverride?: string
): Promise<{ success: boolean; message: string; previewHtml?: string }> {
  const gmailUser = process.env.GMAIL_SMTP_USER || process.env.SMTP_USER;
  const gmailPass = process.env.GMAIL_SMTP_PASS || process.env.SMTP_PASS;
  const recipient = recipientOverride || process.env.SRE_ALERT_EMAIL || gmailUser;

  const htmlContent = buildSreEmailTemplate(services);

  if (!gmailUser || !gmailPass) {
    return {
      success: false,
      message:
        "Free Gmail SMTP credentials not configured in .env. Please set GMAIL_SMTP_USER and GMAIL_SMTP_PASS (Google App Password).",
      previewHtml: htmlContent,
    };
  }

  if (!recipient) {
    return {
      success: false,
      message: "No recipient email set. Please configure SRE_ALERT_EMAIL in .env.",
      previewHtml: htmlContent,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    const failingNames = services.map((s) => s.name).join(", ");
    const subject = `🚨 [SRE ALERT] Third-Party API Incident Detected: ${failingNames}`;

    await transporter.sendMail({
      from: `"SRE API Monitor" <${gmailUser}>`,
      to: recipient,
      subject,
      html: htmlContent,
    });

    return {
      success: true,
      message: `Free Gmail Alert Email dispatched successfully to ${recipient}`,
      previewHtml: htmlContent,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to send email via Gmail SMTP: ${err?.message || "SMTP Error"}`,
      previewHtml: htmlContent,
    };
  }
}

/**
 * Enterprise HTML Email Formatter for SRE Alerts.
 */
export function buildSreEmailTemplate(services: ServiceHealthResult[]): string {
  const rowsHtml = services
    .map((s) => {
      let badgeColor = "#ef4444"; // red
      let badgeText = "DOWN";

      if (s.status === "LOW_CREDITS") {
        badgeColor = "#f59e0b"; // amber
        badgeText = "LOW CREDITS / QUOTA";
      } else if (s.status === "DEGRADED") {
        badgeColor = "#eab308"; // yellow
        badgeText = "DEGRADED";
      } else if (s.status === "HEALTHY") {
        badgeColor = "#22c55e"; // green
        badgeText = "RECOVERED / HEALTHY";
      }

      return `
        <tr style="border-bottom: 1px solid #334155;">
          <td style="padding: 12px; font-weight: bold; color: #f8fafc;">${s.name}</td>
          <td style="padding: 12px;">
            <span style="background-color: ${badgeColor}; color: #ffffff; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">
              ${badgeText}
            </span>
          </td>
          <td style="padding: 12px; color: #94a3b8; font-family: monospace;">${s.responseTimeMs}ms</td>
          <td style="padding: 12px; color: #cbd5e1; font-size: 13px;">${s.message}</td>
        </tr>
      `;
    })
    .join("");

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>SRE API Health Alert</title>
  </head>
  <body style="background-color: #0f172a; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">
    <div style="max-width: 650px; margin: 0 auto; background-color: #1e293b; border-radius: 8px; border: 1px solid #334155; padding: 24px;">
      
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #ef4444; font-size: 20px;">🚨 SRE System Alert Notification</h2>
        <span style="font-size: 12px; color: #94a3b8;">${new Date().toLocaleString()}</span>
      </div>

      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">
        The SRE Monitor has detected an issue with one or more third-party API services integrated into the <strong>Car Parts E-Commerce System</strong> (e.g. OpenAI Chatbot, Simli 3D Avatar, Supabase, or NHTSA VIN Decoder).
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 20px; text-align: left;">
        <thead>
          <tr style="background-color: #0f172a; color: #94a3b8; font-size: 12px; text-transform: uppercase;">
            <th style="padding: 10px;">Service</th>
            <th style="padding: 10px;">Status</th>
            <th style="padding: 10px;">Latency</th>
            <th style="padding: 10px;">Details / Message</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div style="background-color: #0f172a; border-left: 4px solid #38bdf8; padding: 12px; border-radius: 4px; margin-top: 20px;">
        <h4 style="margin: 0 0 6px 0; color: #38bdf8; font-size: 13px;">🛠️ Action Required for Administrators:</h4>
        <ul style="margin: 0; padding-left: 20px; color: #94a3b8; font-size: 13px; line-height: 1.6;">
          <li><strong>OpenAI API (Low Credits / Quota)</strong>: Visit <a href="https://platform.openai.com/account/billing" style="color: #38bdf8;">platform.openai.com</a> to add usage credits.</li>
          <li><strong>Simli API (3D Avatar)</strong>: Visit <a href="https://simli.ai" style="color: #38bdf8;">simli.ai</a> dashboard to verify face configuration or renew subscription.</li>
          <li><strong>Check SRE Dashboard</strong>: Log in to Admin → SRE System Monitor to view live metrics.</li>
        </ul>
      </div>

      <div style="margin-top: 24px; text-align: center; border-top: 1px solid #334155; padding-top: 16px; color: #64748b; font-size: 11px;">
        Sent automatically by SRE API Health & Credit Monitor via Free Gmail SMTP | Car Parts E-Commerce System
      </div>

    </div>
  </body>
  </html>
  `;
}
