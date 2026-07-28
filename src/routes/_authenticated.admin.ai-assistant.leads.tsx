import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListAiLeads, updateAiLead } from "@/lib/ai-chat.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin/ai-assistant/leads")({
  component: LeadsPage,
});

function LeadsPage() {
  const list = useServerFn(adminListAiLeads);
  const update = useServerFn(updateAiLead);
  const qc = useQueryClient();
  const leads = useQuery({ queryKey: ["ai-leads"], queryFn: () => list({}) });
  const m = useMutation({
    mutationFn: (v: { id: string; status: "new" | "assigned" | "contacted" | "closed" }) => update({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-leads"] }),
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">AI-generated Leads</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">{leads.data?.length ?? 0} leads</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(leads.data ?? []).map((l: any) => (
            <div key={l.id} className="rounded border p-3 flex flex-wrap items-start gap-3 text-sm">
              <div className="flex-1 min-w-[200px]">
                <div className="font-medium">{l.name || "Unnamed"} <Badge variant="secondary" className="ml-2">{l.status}</Badge></div>
                <div className="text-xs text-muted-foreground">{l.phone || l.email || "no contact"} · {format(new Date(l.created_at), "PP p")}</div>
                <div className="mt-1">{l.reason}</div>
                {l.vehicle && Object.keys(l.vehicle).length ? (
                  <div className="mt-1 text-xs text-muted-foreground">Vehicle: {JSON.stringify(l.vehicle)}</div>
                ) : null}
              </div>
              <div className="flex gap-1">
                {(["assigned", "contacted", "closed"] as const).map((s) => (
                  <Button key={s} size="sm" variant={l.status === s ? "default" : "outline"} onClick={() => m.mutate({ id: l.id, status: s })}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
