import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import * as React from "react";
import { Download, Users, Clock, ChevronRight, MessageSquare, ChevronDown, Search } from "lucide-react";
import {
  aiAnalyticsKpis, aiQueryVolume, aiUniqueUsers, aiAnalyticsExportCsv, webPartDemandStats,
  waKpis, waQueryVolume, waTopUsers, waRecentConversations, waEventStats, waExportCsv,
} from "@/lib/ai-analytics.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/ai-assistant/analytics")({
  component: AnalyticsPage,
});

type RangeKey = "30d" | "12w" | "custom";
type SourceKey = "all" | "web" | "whatsapp";

function AnalyticsPage() {
  const [range, setRange] = React.useState<RangeKey>("30d");
  const [from, setFrom] = React.useState<string>("");
  const [to, setTo] = React.useState<string>("");
  const [source, setSource] = React.useState<SourceKey>("all");
  const [tab, setTab] = React.useState<string>("usage");
  const [showUsers, setShowUsers] = React.useState(false);
  const [showHourly, setShowHourly] = React.useState(false);

  React.useEffect(() => {
    if (source === "web" && tab !== "usage") setTab("usage");
  }, [source, tab]);


  const payload = { range, from: from || undefined, to: to || undefined };

  const kpisFn = useServerFn(aiAnalyticsKpis);
  const volFn = useServerFn(aiQueryVolume);
  const usersFn = useServerFn(aiUniqueUsers);
  const exportFn = useServerFn(aiAnalyticsExportCsv);
  const webPartsFn = useServerFn(webPartDemandStats);

  const waKpisFn = useServerFn(waKpis);
  const waVolFn = useServerFn(waQueryVolume);
  const waTopFn = useServerFn(waTopUsers);
  const waConvoFn = useServerFn(waRecentConversations);
  const waEventsFn = useServerFn(waEventStats);
  const waExportFn = useServerFn(waExportCsv);

  const webKpis = useQuery({
    queryKey: ["ai-kpis", payload],
    queryFn: () => kpisFn({ data: payload }),
    enabled: source !== "whatsapp",
  });
  const webVol = useQuery({
    queryKey: ["ai-vol", payload],
    queryFn: () => volFn({ data: payload }),
    enabled: source !== "whatsapp",
  });
  const webUsers = useQuery({
    queryKey: ["ai-users", payload],
    queryFn: () => usersFn({ data: payload }),
    enabled: showUsers && source !== "whatsapp",
  });

  const waKpisQ = useQuery({
    queryKey: ["wa-kpis", payload],
    queryFn: () => waKpisFn({ data: payload }),
    enabled: source !== "web",
  });
  const waVolQ = useQuery({
    queryKey: ["wa-vol", payload],
    queryFn: () => waVolFn({ data: payload }),
    enabled: source !== "web",
  });
  const waTopQ = useQuery({
    queryKey: ["wa-top", payload],
    queryFn: () => waTopFn({ data: payload }),
    enabled: source !== "web",
  });

  // merge KPIs/volume based on source
  const k = mergeKpis(source, webKpis.data, waKpisQ.data);
  const volData = mergeVolume(source, webVol.data, waVolQ.data);
  const isLoading =
    (source !== "whatsapp" && (webKpis.isLoading || webVol.isLoading)) ||
    (source !== "web" && (waKpisQ.isLoading || waVolQ.isLoading));

  const peakTime = k.peakHour != null ? `${String(k.peakHour).padStart(2, "0")}:00` : "N/A";

  const onExport = async () => {
    try {
      if (source === "whatsapp") {
        const res = await waExportFn({ data: { ...payload, type: "chat_logs" } });
        downloadCsv(res.csv, res.filename);
      } else {
        const res = await exportFn({ data: payload });
        downloadCsv(res.csv, res.filename);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Export failed");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground">Analytics and customer interactions</p>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={source} onValueChange={(v) => v && setSource(v as SourceKey)} size="sm">
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="web">Web / Avatar</ToggleGroupItem>
            <ToggleGroupItem value="whatsapp">WhatsApp</ToggleGroupItem>
          </ToggleGroup>
          <Button onClick={onExport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="usage">Usage &amp; Adoption</TabsTrigger>
          {source !== "whatsapp" && <TabsTrigger value="web-parts">Part Demand (Web)</TabsTrigger>}
          {source !== "web" && <TabsTrigger value="vin">VIN Search</TabsTrigger>}
          {source !== "web" && <TabsTrigger value="parts">Part Demand</TabsTrigger>}
          {source !== "web" && <TabsTrigger value="whatsapp">WhatsApp Logs</TabsTrigger>}
        </TabsList>

        <TabsContent value="usage" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard
              icon={<MessageSquare className="h-5 w-5" />}
              label="Total Queries"
              value={isLoading ? "…" : String(k.totalQueries ?? 0)}
              footer={
                source !== "whatsapp" ? (
                  <button onClick={() => setShowUsers((s) => !s)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <Users className="h-3 w-3" /> View web/avatar users <ChevronRight className={`h-3 w-3 transition ${showUsers ? "rotate-90" : ""}`} />
                  </button>
                ) : null
              }
            >
              {showUsers && source !== "whatsapp" ? (
                <div className="mt-3 max-h-48 overflow-auto rounded-md border border-border/60 bg-muted/30">
                  {webUsers.isLoading ? (
                    <div className="p-3 text-xs text-muted-foreground">Loading…</div>
                  ) : (webUsers.data ?? []).length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground">No users in this range.</div>
                  ) : (
                    <ul className="divide-y divide-border/60 text-xs">
                      {(webUsers.data as any[]).map((u, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 p-2">
                          <span className="truncate">
                            {u.name ?? (u.user_id ? `User ${String(u.user_id).slice(0, 8)}` : `Guest ${String(u.guest_token ?? "").slice(0, 8)}`)}
                          </span>
                          <span className="font-mono text-muted-foreground">{u.threads} thr</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </KpiCard>

            <KpiCard
              icon={<Users className="h-5 w-5" />}
              label="Unique Users"
              value={isLoading ? "…" : String(k.uniqueUsers ?? 0)}
            />

            <KpiCard
              icon={<Clock className="h-5 w-5" />}
              label="Peak Hour (Today)"
              value={isLoading ? "…" : peakTime}
              footer={
                <button onClick={() => setShowHourly((s) => !s)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <ChevronDown className={`h-3 w-3 transition ${showHourly ? "rotate-180" : ""}`} /> Hourly breakdown
                </button>
              }
            >
              {showHourly ? (
                <div className="mt-3 h-32">
                  <ResponsiveContainer>
                    <BarChart data={(k.hourlyToday ?? []).map((v: number, h: number) => ({ hour: `${h}h`, value: v }))}>
                      <XAxis dataKey="hour" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} width={20} />
                      <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={tooltipStyle} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
            </KpiCard>
          </div>

          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 flex-wrap">
              <CardTitle className="text-base">Query Volume Trends</CardTitle>
              <RangePicker range={range} from={from} to={to} setRange={setRange} setFrom={setFrom} setTo={setTo} />
            </CardHeader>
            <CardContent style={{ height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={volData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {source !== "web" ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Top WhatsApp Users</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-80 overflow-auto rounded-md border border-border/60">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-left">
                      <tr><th className="p-2">Phone</th><th className="p-2">Messages</th><th className="p-2">Last seen</th></tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {((waTopQ.data ?? []) as any[]).map((u, i) => (
                        <tr key={i}>
                          <td className="p-2 font-mono">{u.phone}</td>
                          <td className="p-2">{u.messages}</td>
                          <td className="p-2 text-muted-foreground">{new Date(u.last_seen).toLocaleString()}</td>
                        </tr>
                      ))}
                      {!waTopQ.isLoading && (waTopQ.data ?? []).length === 0 ? (
                        <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">No WhatsApp users yet.</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        {source !== "whatsapp" && (
          <TabsContent value="web-parts" className="space-y-4">
            <WebPartDemandPanel payload={payload} fn={webPartsFn}
              range={range} from={from} to={to} setRange={setRange} setFrom={setFrom} setTo={setTo} exportFn={exportFn} />
          </TabsContent>
        )}

        {source !== "web" && (
          <>
            <TabsContent value="vin" className="space-y-4">
              <EventsPanel kind="vin" payload={payload} fn={waEventsFn}
                range={range} from={from} to={to} setRange={setRange} setFrom={setFrom} setTo={setTo} />
            </TabsContent>
            <TabsContent value="parts" className="space-y-4">
              <EventsPanel kind="parts" payload={payload} fn={waEventsFn}
                range={range} from={from} to={to} setRange={setRange} setFrom={setFrom} setTo={setTo} />
            </TabsContent>
            <TabsContent value="whatsapp">
              <ConversationsPanel payload={payload} fn={waConvoFn} exportFn={waExportFn}
                range={range} from={from} to={to} setRange={setRange} setFrom={setFrom} setTo={setTo} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

const tooltipStyle = { background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 } as const;

function mergeKpis(source: SourceKey, web: any, wa: any) {
  if (source === "web") return web ?? {};
  if (source === "whatsapp") return wa ?? {};
  const w = web ?? {}; const a = wa ?? {};
  const hourly = Array.from({ length: 24 }, (_, h) => (w.hourlyToday?.[h] ?? 0) + (a.hourlyToday?.[h] ?? 0));
  const peakCount = Math.max(...hourly);
  return {
    totalQueries: (w.totalQueries ?? 0) + (a.totalQueries ?? 0),
    uniqueUsers: (w.uniqueUsers ?? 0) + (a.uniqueUsers ?? 0),
    hourlyToday: hourly,
    peakHour: peakCount > 0 ? hourly.indexOf(peakCount) : null,
    peakCount,
  };
}

function mergeVolume(source: SourceKey, web: any[] | undefined, wa: any[] | undefined): any[] {
  if (source === "web") return web ?? [];
  if (source === "whatsapp") return wa ?? [];
  const m = new Map<string, number>();
  for (const r of web ?? []) m.set(r.date, (m.get(r.date) ?? 0) + r.value);
  for (const r of wa ?? []) m.set(r.date, (m.get(r.date) ?? 0) + r.value);
  return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function RangePicker({ range, from, to, setRange, setFrom, setTo }: {
  range: RangeKey; from: string; to: string;
  setRange: (r: RangeKey) => void; setFrom: (s: string) => void; setTo: (s: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <ToggleGroup type="single" value={range} onValueChange={(v) => v && setRange(v as RangeKey)} size="sm">
        <ToggleGroupItem value="30d">30 Days</ToggleGroupItem>
        <ToggleGroupItem value="12w">12 Weeks</ToggleGroupItem>
        <ToggleGroupItem value="custom">Custom</ToggleGroupItem>
      </ToggleGroup>
      {range === "custom" ? (
        <Popover>
          <PopoverTrigger asChild><Button variant="outline" size="sm">Pick dates</Button></PopoverTrigger>
          <PopoverContent className="w-64 space-y-2" align="end">
            <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}

function EventsPanel({ kind, payload, fn, range, from, to, setRange, setFrom, setTo }: {
  kind: "vin" | "parts"; payload: any; fn: any;
  range: RangeKey; from: string; to: string;
  setRange: (r: RangeKey) => void; setFrom: (s: string) => void; setTo: (s: string) => void;
}) {
  const q = useQuery({ queryKey: ["wa-events", payload], queryFn: () => fn({ data: payload }) });
  const data: any = q.data ?? {};
  const trend = kind === "vin" ? data.vinTrend : data.partTrend;
  const top = kind === "vin" ? data.topVins : data.topParts;
  const total = kind === "vin" ? data.vinSearches : data.partSearches;
  const title = kind === "vin" ? "VIN Searches" : "Part Searches";

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <KpiCard icon={<Search className="h-5 w-5" />} label={`Total ${title}`} value={q.isLoading ? "…" : String(total ?? 0)} />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap space-y-0">
            <CardTitle className="text-base">{title} Trend</CardTitle>
            <RangePicker range={range} from={from} to={to} setRange={setRange} setFrom={setFrom} setTo={setTo} />
          </CardHeader>
          <CardContent style={{ height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={trend ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Top {kind === "vin" ? "VINs" : "Parts"} Searched</CardTitle></CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-auto rounded-md border border-border/60">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-left">
                <tr><th className="p-2">{kind === "vin" ? "VIN" : "Part / Query"}</th><th className="p-2 w-24">Count</th></tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {((top ?? []) as any[]).map((r, i) => (
                  <tr key={i}><td className="p-2 font-mono">{r.value}</td><td className="p-2">{r.count}</td></tr>
                ))}
                {!q.isLoading && (top ?? []).length === 0 ? (
                  <tr><td colSpan={2} className="p-4 text-center text-muted-foreground">No events in this range.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function ConversationsPanel({ payload, fn, exportFn, range, from, to, setRange, setFrom, setTo }: {
  payload: any; fn: any; exportFn: any;
  range: RangeKey; from: string; to: string;
  setRange: (r: RangeKey) => void; setFrom: (s: string) => void; setTo: (s: string) => void;
}) {
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [page, setPage] = React.useState(0);
  const limit = 25;
  React.useEffect(() => {
    const id = setTimeout(() => { setDebounced(search); setPage(0); }, 300);
    return () => clearTimeout(id);
  }, [search]);
  const q = useQuery({
    queryKey: ["wa-convo", payload, debounced, page],
    queryFn: () => fn({ data: { ...payload, search: debounced || undefined, limit, offset: page * limit } }),
  });
  const rows = (q.data?.rows ?? []) as any[];
  const total = q.data?.total ?? 0;
  const [openId, setOpenId] = React.useState<string | null>(null);

  const onExport = async () => {
    try {
      const res = await exportFn({ data: { ...payload, type: "chat_logs" } });
      downloadCsv(res.csv, res.filename);
    } catch (e: any) {
      toast.error(e.message ?? "Export failed");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap space-y-0">
        <CardTitle className="text-base">WhatsApp Conversations ({total})</CardTitle>
        <div className="flex items-center gap-2">
          <Input placeholder="Search phone / message…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-56" />
          <RangePicker range={range} from={from} to={to} setRange={setRange} setFrom={setFrom} setTo={setTo} />
          <Button variant="outline" size="sm" onClick={onExport} className="gap-1"><Download className="h-3 w-3" /> CSV</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto rounded-md border border-border/60">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-2 w-36">Time</th>
                <th className="p-2 w-32">Phone</th>
                <th className="p-2 w-16">Locale</th>
                <th className="p-2 w-28">Intent</th>
                <th className="p-2">User message</th>
                <th className="p-2">Bot response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((r) => (
                <React.Fragment key={r.id}>
                  <tr className="cursor-pointer hover:bg-muted/30" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                    <td className="p-2 text-muted-foreground">{new Date(r.occurred_at).toLocaleString()}</td>
                    <td className="p-2 font-mono">{r.whatsapp_user_id}</td>
                    <td className="p-2">{r.user_locale ?? "—"}</td>
                    <td className="p-2">{r.intent ?? "—"}</td>
                    <td className="p-2 max-w-xs truncate">{r.user_message}</td>
                    <td className="p-2 max-w-xs truncate">{r.bot_response}</td>
                  </tr>
                  {openId === r.id ? (
                    <tr className="bg-muted/20">
                      <td colSpan={6} className="p-3 space-y-2 text-xs">
                        <div><span className="font-semibold">User:</span> <pre className="mt-1 whitespace-pre-wrap font-sans">{r.user_message}</pre></div>
                        <div><span className="font-semibold">Bot:</span> <pre className="mt-1 whitespace-pre-wrap font-sans">{r.bot_response}</pre></div>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              ))}
              {!q.isLoading && rows.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No conversations.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 text-xs">
          <span className="text-muted-foreground">Page {page + 1} of {Math.max(1, Math.ceil(total / limit))}</span>
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</Button>
          <Button size="sm" variant="outline" disabled={(page + 1) * limit >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiCard({
  icon, label, value, footer, children,
}: {
  icon: React.ReactNode; label: string; value: string;
  footer?: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur transition hover:border-primary/40 hover:-translate-y-0.5">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
            <div className="mt-2 text-4xl font-bold tracking-tight">{value}</div>
          </div>
          <div className="rounded-full bg-primary/10 p-2 text-primary">{icon}</div>
        </div>
        {footer ? <div className="mt-3">{footer}</div> : null}
        {children}
      </CardContent>
    </Card>
  );
}

function WebPartDemandPanel({ payload, fn, exportFn, range, from, to, setRange, setFrom, setTo }: {
  payload: any; fn: any; exportFn: any;
  range: RangeKey; from: string; to: string;
  setRange: (r: RangeKey) => void; setFrom: (s: string) => void; setTo: (s: string) => void;
}) {
  const q = useQuery({ queryKey: ["web-parts", payload], queryFn: () => fn({ data: payload }) });
  const data: any = q.data ?? {};
  
  const topParts = data.topPartNumbers ?? [];
  const topItems = data.topItemNames ?? [];
  const users = data.userSearchActivity ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Part Demand Intelligence</h2>
          <p className="text-sm text-muted-foreground">Website &amp; AI avatar searches — part numbers, item names and who searched.</p>
        </div>
        <div className="flex items-center gap-2 mt-2 md:mt-0">
          <RangePicker range={range} from={from} to={to} setRange={setRange} setFrom={setFrom} setTo={setTo} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Part Numbers */}
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Most Searched Part Numbers</CardTitle>
          </CardHeader>
          <CardContent>
            {q.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : topParts.length === 0 ? (
              <div className="text-sm text-muted-foreground">No data found.</div>
            ) : (
              <div className="space-y-4 mt-2">
                {topParts.map((item: any, i: number) => {
                  const max = topParts[0].count;
                  const pct = Math.max(2, (item.count / max) * 100);
                  return (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span className="font-mono">{item.value}</span>
                        <span>{item.count}</span>
                      </div>
                      <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                        <div className="h-full bg-[#185adb] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Item Names */}
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Most Searched Item Names</CardTitle>
          </CardHeader>
          <CardContent>
            {q.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : topItems.length === 0 ? (
              <div className="text-sm text-muted-foreground">No data found.</div>
            ) : (
              <div className="space-y-4 mt-2">
                {topItems.map((item: any, i: number) => {
                  const max = topItems[0].count;
                  const pct = Math.max(2, (item.count / max) * 100);
                  return (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span className="capitalize">{item.value}</span>
                        <span>{item.count}</span>
                      </div>
                      <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                        <div className="h-full bg-[#185adb] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">User Search Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-md border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="p-3 font-semibold">Customer</th>
                  <th className="p-3 font-semibold text-center">Part numbers</th>
                  <th className="p-3 font-semibold text-center">Item names</th>
                  <th className="p-3 font-semibold text-center">Total searches</th>
                  <th className="p-3 font-semibold text-right">Last activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {q.isLoading ? (
                  <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Loading...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No user search activity found.</td></tr>
                ) : (
                  users.map((u: any, i: number) => (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="p-3 font-medium">{u.customer}</td>
                      <td className="p-3 text-center">{u.part_numbers}</td>
                      <td className="p-3 text-center">{u.item_names}</td>
                      <td className="p-3 text-center font-bold">{u.total_searches}</td>
                      <td className="p-3 text-right text-muted-foreground">{new Date(u.last_activity).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

