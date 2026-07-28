import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { adminListMovements, adminListWarehouses } from "@/lib/admin.inventory.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/stock-movements")({
  component: MovementsPage,
});

const TYPES = ["IN","OUT","ADJUST","TRANSFER","SALE","RETURN"] as const;

function MovementsPage() {
  const list = useServerFn(adminListMovements);
  const listWh = useServerFn(adminListWarehouses);
  const [warehouseId, setWarehouseId] = useState("");
  const [type, setType] = useState<string>("");
  const [q, setQ] = useState("");

  const whs = useQuery({ queryKey: ["admin-warehouses"], queryFn: () => listWh() });
  const mv = useQuery({
    queryKey: ["admin-movements", warehouseId, type],
    queryFn: () => list({ data: { warehouse_id: warehouseId || undefined, movement_type: (type || undefined) as any, limit: 200 } as any }),
  });

  const filtered = (mv.data ?? []).filter((r: any) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.parts?.part_number ?? "").toLowerCase().includes(s) ||
           (r.parts?.name ?? "").toLowerCase().includes(s) ||
           (r.reference ?? "").toLowerCase().includes(s);
  });

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold"><ArrowUpDown className="h-6 w-6" /> Stock Movements</h1>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-surface p-3">
        <div className="grow min-w-[180px]"><Label>Search</Label><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Part / reference" /></div>
        <div className="w-48"><Label>Warehouse</Label>
          <Select value={warehouseId || "_all"} onValueChange={v => setWarehouseId(v === "_all" ? "" : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All</SelectItem>
              {(whs.data ?? []).map((w: any) => <SelectItem key={w.id} value={w.id}>{w.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40"><Label>Type</Label>
          <Select value={type || "_all"} onValueChange={v => setType(v === "_all" ? "" : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All</SelectItem>
              {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Part</th><th className="p-3">From</th><th className="p-3">To</th><th className="p-3 text-right">Qty</th><th className="p-3">Reference</th><th className="p-3">Note</th></tr>
          </thead>
          <tbody>
            {mv.isLoading && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {filtered.map((r: any) => (
              <tr key={r.id} className="border-b">
                <td className="p-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-3"><span className="rounded bg-muted px-2 py-0.5 text-xs font-bold">{r.movement_type}</span></td>
                <td className="p-3"><div className="font-mono text-xs">{r.parts?.part_number}</div><div className="text-muted-foreground">{r.parts?.name}</div></td>
                <td className="p-3 font-mono text-xs">{r.warehouses?.code ?? "—"}</td>
                <td className="p-3 font-mono text-xs">{r.to_wh?.code ?? "—"}</td>
                <td className="p-3 text-right font-mono">{r.quantity}</td>
                <td className="p-3 text-xs">{r.reference ?? "—"}</td>
                <td className="p-3 text-xs text-muted-foreground">{r.note ?? ""}</td>
              </tr>
            ))}
            {!mv.isLoading && !filtered.length && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No movements.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
