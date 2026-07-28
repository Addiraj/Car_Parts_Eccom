import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { adminListWarehouses, adminUpsertWarehouse, adminDeleteWarehouse } from "@/lib/admin.inventory.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Pencil, Plus, Trash2, Warehouse } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/warehouses")({
  component: WarehousesPage,
});

type W = { id?: string; code: string; name: string; address?: string | null; city?: string | null; country?: string | null; is_default: boolean; is_active: boolean };
const empty: W = { code: "", name: "", address: "", city: "", country: "UAE", is_default: false, is_active: true };

function WarehousesPage() {
  const list = useServerFn(adminListWarehouses);
  const upsert = useServerFn(adminUpsertWarehouse);
  const del = useServerFn(adminDeleteWarehouse);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-warehouses"], queryFn: () => list() });
  const [editing, setEditing] = useState<W | null>(null);
  const save = useMutation({
    mutationFn: (w: W) => upsert({ data: w }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-warehouses"] }); setEditing(null); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-warehouses"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Warehouse className="h-6 w-6" /> Warehouses</h1>
        <Button onClick={() => setEditing({ ...empty })}><Plus className="mr-1 h-4 w-4" /> New Warehouse</Button>
      </div>

      <div className="rounded-lg border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr><th className="p-3">Code</th><th className="p-3">Name</th><th className="p-3">Location</th><th className="p-3">Default</th><th className="p-3">Active</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {(data ?? []).map((w: any) => (
              <tr key={w.id} className="border-b">
                <td className="p-3 font-mono">{w.code}</td>
                <td className="p-3">{w.name}</td>
                <td className="p-3 text-muted-foreground">{[w.city, w.country].filter(Boolean).join(", ")}</td>
                <td className="p-3">{w.is_default ? "✓" : ""}</td>
                <td className="p-3">{w.is_active ? "✓" : "—"}</td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(w)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete ${w.code}?`)) remove.mutate(w.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {!isLoading && !(data ?? []).length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No warehouses yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} Warehouse</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code</Label><Input value={editing.code} onChange={e => setEditing({ ...editing, code: e.target.value.toUpperCase() })} placeholder="MAIN" /></div>
              <div><Label>Name</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="col-span-2"><Label>Address</Label><Input value={editing.address ?? ""} onChange={e => setEditing({ ...editing, address: e.target.value })} /></div>
              <div><Label>City</Label><Input value={editing.city ?? ""} onChange={e => setEditing({ ...editing, city: e.target.value })} /></div>
              <div><Label>Country</Label><Input value={editing.country ?? ""} onChange={e => setEditing({ ...editing, country: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_default} onCheckedChange={v => setEditing({ ...editing, is_default: v })} /><Label>Default</Label></div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
