import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSreOverview, triggerSreAudit, sendSreTestAlert } from "@/lib/sre.functions";
import { useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Mail,
  ShieldAlert,
  Clock,
  Server,
  Key,
  Bot,
  Zap,
  Info,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/sre-monitor")({
  component: SreMonitorPage,
});

function SreMonitorPage() {
  const getOverviewFn = useServerFn(getSreOverview);
  const triggerAuditFn = useServerFn(triggerSreAudit);
  const sendTestAlertFn = useServerFn(sendSreTestAlert);

  const [testEmail, setTestEmail] = useState("");

  const { data: report, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["sre-overview"],
    queryFn: () => getOverviewFn(),
    refetchInterval: 30000, // Auto refresh every 30 seconds
  });

  const auditMutation = useMutation({
    mutationFn: () => triggerAuditFn({ data: { forceAlert: false } }),
    onSuccess: (res) => {
      toast.success("SRE Health Audit Completed!");
      if (res.emailResult?.message) {
        toast.info(res.emailResult.message);
      }
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to run SRE Audit");
    },
  });

  const testAlertMutation = useMutation({
    mutationFn: (email: string) => sendTestAlertFn({ data: { recipientEmail: email } }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to send test alert email");
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 p-6 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-3">
            <Activity className="h-7 w-7 text-cyan-400 animate-pulse" />
            <h1 className="text-2xl font-bold text-slate-100">SRE System & API Health Monitor</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time automated status monitoring, response latency tracking, and low-credit email alert dispatcher.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="border-slate-700 hover:bg-slate-800 text-slate-200"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh Status
          </Button>

          <Button
            size="sm"
            onClick={() => auditMutation.mutate()}
            disabled={auditMutation.isPending}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow"
          >
            <Zap className="h-4 w-4 mr-2" />
            {auditMutation.isPending ? "Auditing..." : "Run Audit Now"}
          </Button>
        </div>
      </div>

      {/* Status Overview Summary */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900/90 border-slate-800">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Status</p>
                <div className="mt-1 flex items-center gap-2">
                  {report.overallStatus === "HEALTHY" && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs px-2.5 py-1">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1 inline" /> Operational
                    </Badge>
                  )}
                  {report.overallStatus === "LOW_CREDITS" && (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs px-2.5 py-1">
                      <AlertTriangle className="h-3.5 w-3.5 mr-1 inline" /> Low Credits
                    </Badge>
                  )}
                  {report.overallStatus === "DOWN" && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs px-2.5 py-1">
                      <ShieldAlert className="h-3.5 w-3.5 mr-1 inline" /> Outage Detected
                    </Badge>
                  )}
                </div>
              </div>
              <Activity className="h-8 w-8 text-cyan-400/40" />
            </CardContent>
          </Card>

          <Card className="bg-slate-900/90 border-slate-800">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Services</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">
                  {report.healthyCount} / {report.totalServices}
                </p>
              </div>
              <Server className="h-8 w-8 text-emerald-400/40" />
            </CardContent>
          </Card>

          <Card className="bg-slate-900/90 border-slate-800">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Low Credit Alerts</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">{report.lowCreditsCount}</p>
              </div>
              <Key className="h-8 w-8 text-amber-400/40" />
            </CardContent>
          </Card>

          <Card className="bg-slate-900/90 border-slate-800">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Outages / Downtime</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{report.downCount}</p>
              </div>
              <ShieldAlert className="h-8 w-8 text-red-400/40" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Grid of Monitored Services */}
      <div>
        <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Server className="h-5 w-5 text-cyan-400" /> Monitored Third-Party API Services
        </h2>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading SRE health metrics...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report?.services.map((svc) => (
              <Card key={svc.id} className="bg-slate-900/80 border-slate-800 hover:border-slate-700 transition">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
                      {svc.category === "ai" && <Bot className="h-4 w-4 text-cyan-400" />}
                      {svc.category === "avatar" && <Zap className="h-4 w-4 text-purple-400" />}
                      {svc.category === "database" && <Server className="h-4 w-4 text-emerald-400" />}
                      {svc.category === "external" && <Activity className="h-4 w-4 text-indigo-400" />}
                      {svc.name}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">Category: {svc.category.toUpperCase()}</CardDescription>
                  </div>

                  <div>
                    {svc.status === "HEALTHY" && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Healthy</Badge>
                    )}
                    {svc.status === "LOW_CREDITS" && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Low Credits / Quota</Badge>
                    )}
                    {svc.status === "DEGRADED" && (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Degraded</Badge>
                    )}
                    {svc.status === "DOWN" && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Down / Outage</Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-500" /> Latency:
                      <strong className="text-slate-200 ml-1">{svc.responseTimeMs}ms</strong>
                    </span>
                    <span>
                      HTTP Status: <strong className="text-slate-200">{svc.statusCode || "N/A"}</strong>
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded border border-slate-800/60">
                    {svc.message}
                  </p>

                  {svc.id === "openai" && svc.status === "LOW_CREDITS" && (
                    <div className="text-xs text-amber-400 flex items-center justify-between pt-1">
                      <span>Action: Top up OpenAI account balance</span>
                      <a
                        href="https://platform.openai.com/account/billing"
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:text-amber-300 flex items-center gap-1"
                      >
                        OpenAI Billing <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {svc.id === "simli" && svc.status === "LOW_CREDITS" && (
                    <div className="text-xs text-amber-400 flex items-center justify-between pt-1">
                      <span>Action: Top up Simli avatar session credits</span>
                      <a
                        href="https://simli.ai"
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:text-amber-300 flex items-center gap-1"
                      >
                        Simli Dashboard <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Free Gmail SMTP Email Alert Testing & Configuration Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        {/* Test Alert Sender */}
        <Card className="bg-slate-900/90 border-slate-800 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Mail className="h-5 w-5 text-cyan-400" /> Free Gmail Alert Test
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Send a test SRE alert email to verify your Free Gmail SMTP setup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-slate-300">Recipient Email Address</Label>
              <Input
                type="email"
                placeholder="your-email@gmail.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-200 text-sm"
              />
            </div>

            <Button
              onClick={() => {
                if (!testEmail) {
                  toast.error("Please enter a recipient email address");
                  return;
                }
                testAlertMutation.mutate(testEmail);
              }}
              disabled={testAlertMutation.isPending}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              {testAlertMutation.isPending ? "Sending Email..." : "Send Test Gmail Alert"}
            </Button>
          </CardContent>
        </Card>

        {/* Free Gmail Setup Guide */}
        <Card className="bg-slate-900/90 border-slate-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Info className="h-5 w-5 text-cyan-400" /> Free Gmail SMTP Configuration (.env)
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Zero-cost email alert delivery using your existing Gmail account & Google App Password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-300">
            <p>Add these environment variables to your project's <code>.env</code> file:</p>

            <pre className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 font-mono text-cyan-300 text-xs overflow-x-auto">
{`# 100% Free Gmail SMTP Alert Configuration
GMAIL_SMTP_USER="your-email@gmail.com"
GMAIL_SMTP_PASS="xxxx xxxx xxxx xxxx"    # 16-character Google App Password
SRE_ALERT_EMAIL="your-email@gmail.com"   # Email to receive alerts

# Optional Secret Token for Automated Cron Check Endpoint
CRON_SECRET="cpd-sre-secret-key"`}
            </pre>

            <div className="bg-slate-950/60 p-3 rounded border border-slate-800 space-y-1 text-slate-400">
              <p className="font-semibold text-slate-200">How to get a Free Google App Password (1 minute):</p>
              <ol className="list-decimal pl-4 space-y-1 text-slate-400">
                <li>Go to <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-cyan-400 underline">myaccount.google.com/security</a> and enable 2-Step Verification.</li>
                <li>Search for <strong>"App Passwords"</strong> or visit <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-cyan-400 underline">myaccount.google.com/apppasswords</a>.</li>
                <li>Create an App Password named <code>"CPD SRE Alert"</code> and paste the 16-letter code into <code>GMAIL_SMTP_PASS</code>.</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
