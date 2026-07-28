import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  adminListInventory, adminListWarehouses, adminInventoryStats,
  adminSetStockLevel, adminRecordMovement,
} from "@/lib/admin.inventory.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Boxes, AlertTriangle, PackageX, Warehouse as WHIcon, ArrowUpDown, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  const list = useServerFn(adminListInventory);
  const listWh = useServerFn(adminListWarehouses);
  const stats = useServerFn(adminInventoryStats);
  const setLevel = useServerFn(adminSetStockLevel);
  const move = useServerFn(adminRecordMovement);
  const qc = useQueryClient();

  const [warehouseId, setWarehouseId] = useState<string>("");
  const [filter, setFilter] = useState<"all"|"low"|"out">("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const whs = useQuery({ queryKey: ["admin-warehouses"], queryFn: () => listWh() });
  const st = useQuery({ queryKey: ["admin-inv-stats"], queryFn: () => stats() });
  const inv = useQuery({
    queryKey: ["admin-inventory", warehouseId, filter, q, page],
    queryFn: () => list({ data: { warehouse_id: warehouseId || undefined, filter, q: q || undefined, page, pageSize } as any }),
  });
  const items: any[] = (inv.data as any)?.items ?? [];
  const total: number = (inv.data as any)?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const [levelEdit, setLevelEdit] = useState<any | null>(null);
  const [moveEdit, setMoveEdit] = useState<any | null>(null);

  const saveLevel = useMutation({
    mutationFn: (d: any) => setLevel({ data: d }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-inventory"] }); qc.invalidateQueries({ queryKey: ["admin-inv-stats"] }); setLevelEdit(null); toast.success("Stock level updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const saveMove = useMutation({
    mutationFn: (d: any) => move({ data: d }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-inventory"] }); qc.invalidateQueries({ queryKey: ["admin-inv-stats"] }); setMoveEdit(null); toast.success("Movement recorded"); },
    onError: (e: any) => toast.error(e.message),
  });

  const s = st.data ?? { totalSkus: 0, low: 0, out: 0, totalValue: 0, warehouseCount: 0, movementsToday: 0 };
  const cards = [
    { label: "Total SKUs", value: s.totalSkus, icon: Boxes },
    { label: "Low Stock", value: s.low, icon: AlertTriangle, accent: "text-amber-600" },
    { label: "Out of Stock", value: s.out, icon: PackageX, accent: "text-destructive" },
    { label: "Warehouses", value: s.warehouseCount, icon: WHIcon },
    { label: "Movements Today", value: s.movementsToday, icon: ArrowUpDown },
    { label: "Inventory Value", value: `AED ${Number(s.totalValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: Boxes },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Inventory</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {cards.map(c => (
          <div key={c.label} className="rounded-lg border bg-surface p-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{c.label}</div>
              <c.icon className={`h-4 w-4 ${c.accent ?? "text-muted-foreground"}`} />
            </div>
            <div className={`mt-1 text-xl font-bold ${c.accent ?? ""}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-surface p-3">
        <div className="grow min-w-[180px]"><Label>Search</Label><Input value={q} onChange={e => { setPage(1); setQ(e.target.value); }} placeholder="Part number / name / OEM" /></div>
        <div className="w-48"><Label>Warehouse</Label>
          <Select value={warehouseId || "_all"} onValueChange={v => { setPage(1); setWarehouseId(v === "_all" ? "" : v); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All (aggregate)</SelectItem>
              {(whs.data ?? []).map((w: any) => <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40"><Label>Status</Label>
          <Select value={filter} onValueChange={(v: any) => { setPage(1); setFilter(v); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="low">Low only</SelectItem>
              <SelectItem value="out">Out only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="p-3">Part</th><th className="p-3">Manufacturer</th>
              <th className="p-3 text-right">{warehouseId ? "Qty (WH)" : "Total Qty"}</th>
              <th className="p-3 text-right">Reorder pt</th>
              <th className="p-3">Bin</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {inv.isLoading && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {items.map((r: any) => {
              const qty = warehouseId ? (r.wh_quantity ?? 0) : r.stock;
              return (
                <tr key={r.id} className="border-b">
                  <td className="p-3"><div className="font-mono text-xs">{r.part_number}</div><div className="text-muted-foreground">{r.name}</div></td>
                  <td className="p-3">{r.manufacturer}</td>
                  <td className="p-3 text-right font-mono">{qty}</td>
                  <td className="p-3 text-right font-mono">{r.reorder_point}</td>
                  <td className="p-3 font-mono text-xs">{r.bin_location ?? "—"}</td>
                  <td className="p-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${r.status === "out" ? "bg-destructive/15 text-destructive" : r.status === "low" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{r.status}</span>
                  </td>
                  <td className="p-3 text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => setMoveEdit({ part_id: r.id, part_label: `${r.part_number} — ${r.name}`, warehouse_id: warehouseId || (whs.data?.[0]?.id ?? ""), movement_type: "IN", quantity: 1 })}>
                      <Plus className="mr-1 h-3 w-3" /> Move
                    </Button>
                    {warehouseId && (
                      <Button size="sm" variant="ghost" onClick={() => setLevelEdit({ part_id: r.id, part_label: `${r.part_number} — ${r.name}`, warehouse_id: warehouseId, quantity: r.wh_quantity ?? 0, reorder_point: r.reorder_point ?? 0, bin_location: r.bin_location ?? "" })}>
                        Set
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!inv.isLoading && !items.length && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No parts match.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
        <span>{total.toLocaleString()} parts · page {page} / {pages}</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </div>

      {/* Set Level dialog */}
      <Dialog open={!!levelEdit} onOpenChange={o => !o && setLevelEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Set Stock Level</DialogTitle></DialogHeader>
          {levelEdit && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">{levelEdit.part_label}</div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Quantity</Label><Input type="number" min={0} value={levelEdit.quantity} onChange={e => setLevelEdit({ ...levelEdit, quantity: Number(e.target.value) })} /></div>
                <div><Label>Reorder Point</Label><Input type="number" min={0} value={levelEdit.reorder_point} onChange={e => setLevelEdit({ ...levelEdit, reorder_point: Number(e.target.value) })} /></div>
                <div className="col-span-2"><Label>Bin Location</Label><Input value={levelEdit.bin_location} onChange={e => setLevelEdit({ ...levelEdit, bin_location: e.target.value })} placeholder="A-12-03" /></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLevelEdit(null)}>Cancel</Button>
            <Button onClick={() => saveLevel.mutate({
              part_id: levelEdit.part_id, warehouse_id: levelEdit.warehouse_id,
              quantity: levelEdit.quantity, reorder_point: levelEdit.reorder_point,
              bin_location: levelEdit.bin_location || null,
            })} disabled={saveLevel.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movement dialog */}
      <Dialog open={!!moveEdit} onOpenChange={o => !o && setMoveEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Stock Movement</DialogTitle></DialogHeader>
          {moveEdit && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">{moveEdit.part_label}</div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label>
                  <Select value={moveEdit.movement_type} onValueChange={v => setMoveEdit({ ...moveEdit, movement_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["IN","OUT","ADJUST","TRANSFER","SALE","RETURN"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Quantity</Label><Input type="number" min={1} value={moveEdit.quantity} onChange={e => setMoveEdit({ ...moveEdit, quantity: Number(e.target.value) })} /></div>
                <div><Label>From Warehouse</Label>
                  <Select value={moveEdit.warehouse_id} onValueChange={v => setMoveEdit({ ...moveEdit, warehouse_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{(whs.data ?? []).map((w: any) => <SelectItem key={w.id} value={w.id}>{w.code}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {moveEdit.movement_type === "TRANSFER" && (
                  <div><Label>To Warehouse</Label>
                    <Select value={moveEdit.to_warehouse_id ?? ""} onValueChange={v => setMoveEdit({ ...moveEdit, to_warehouse_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>{(whs.data ?? []).filter((w: any) => w.id !== moveEdit.warehouse_id).map((w: any) => <SelectItem key={w.id} value={w.id}>{w.code}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="col-span-2"><Label>Reference</Label><Input value={moveEdit.reference ?? ""} onChange={e => setMoveEdit({ ...moveEdit, reference: e.target.value })} placeholder="PO-1234 / Order#..." /></div>
                <div className="col-span-2"><Label>Note</Label><Input value={moveEdit.note ?? ""} onChange={e => setMoveEdit({ ...moveEdit, note: e.target.value })} /></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveEdit(null)}>Cancel</Button>
            <Button onClick={() => saveMove.mutate({
              part_id: moveEdit.part_id, warehouse_id: moveEdit.warehouse_id,
              to_warehouse_id: moveEdit.to_warehouse_id ?? null,
              movement_type: moveEdit.movement_type, quantity: moveEdit.quantity,
              reference: moveEdit.reference || null, note: moveEdit.note || null,
            })} disabled={saveMove.isPending}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
