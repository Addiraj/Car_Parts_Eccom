import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listMyLogins } from "@/lib/security.functions";
import { useEffect, useState } from "react";
import { ShieldCheck, Monitor, Smartphone, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/account/security")({
  head: () => ({ meta: [{ title: "Security — Car Parts Dubai" }] }),
  component: Security,
});

function Security() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ["my-logins"], queryFn: () => listMyLogins() });
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCurrentSession(localStorage.getItem("jwt_token")?.slice(-12) ?? null);
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security</h1>
          <p className="text-sm text-muted-foreground">Review recent sign-ins and manage active sessions.</p>
        </div>
      </div>
      <div className="mt-8 overflow-hidden rounded-lg border bg-surface">
        <div className="border-b px-4 py-3 text-sm font-semibold">Recent sign-in activity</div>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !data || data.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No sign-in history yet.</div>
        ) : (
          <ul className="divide-y">
            {data.map((row: any) => {
              const isMobile = (row.device ?? "").toLowerCase() === "mobile";
              const isCurrent = currentSession && row.session_id && row.session_id.endsWith(currentSession);
              return (
                <li key={row.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-muted">
                    {isMobile ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {row.browser ?? "Browser"} · {row.os ?? "Unknown"}
                      {isCurrent && <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-700 dark:text-green-300">This session</span>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{new Date(row.logged_in_at).toLocaleString()}</span>
                      {row.ip_address && <span>IP {row.ip_address}</span>}
                      {row.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {row.location}
                        </span>
                      )}
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{row.method}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
