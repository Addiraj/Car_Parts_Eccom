export type ServiceHealthStatus = "HEALTHY" | "DEGRADED" | "DOWN" | "LOW_CREDITS";

export interface ServiceHealthResult {
  id: string;
  name: string;
  category: "ai" | "avatar" | "database" | "external";
  status: ServiceHealthStatus;
  responseTimeMs: number;
  remainingCredits?: number | string | null;
  creditThreshold?: number | null;
  unit?: string;
  statusCode?: number;
  message: string;
  details?: Record<string, any>;
  lastChecked: string;
}

export interface SreOverviewReport {
  timestamp: string;
  overallStatus: ServiceHealthStatus;
  totalServices: number;
  healthyCount: number;
  degradedCount: number;
  downCount: number;
  lowCreditsCount: number;
  services: ServiceHealthResult[];
  activeAlerts: string[];
}

export interface GmailSmtpConfig {
  user: string;
  pass: string;
  to: string;
  fromName?: string;
}
