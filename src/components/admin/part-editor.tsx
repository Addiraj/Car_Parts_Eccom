import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { X, Plus } from "lucide-react";
import {
  adminUpsertPartFull, adminListBrands, adminListCategoriesTree,
  adminGetPart, adminSearchPartsBasic, adminSetAlternatives,
} from "@/lib/admin.catalog.functions";

type Props = { partId?: string };

export function PartEditor({ partId }: Props) {
  const navigate = useNavigate();
  const isEdit = !!partId;
  const { data: brands } = useQuery({ queryKey: ["admin-brands"], queryFn: () => adminListBrands() });
  const { data: cats } = useQuery({ queryKey: ["admin-categories"], queryFn: () => adminListCategoriesTree() });
  const { data: existing } = useQuery({
    queryKey: ["admin-part", partId],
    queryFn: () => adminGetPart({ data: { id: partId! } }),
    enabled: isEdit,
  }) as { data: { part: any; alternatives: any[] } | undefined };

  const [form, setForm] = useState<any>({
    part_number: "", oem_number: "", name: "", description: "",
    manufacturer: "", is_oem: true, brand_id: "", category_id: "", category_tag: "",
    price: 0, ind_price: null, gar_price: null, export_price: null, stock: 0, images: [],
  });
  const [alts, setAlts] = useState<{ id: string; part_number: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [newImage, setNewImage] = useState("");

  useEffect(() => {
    if (existing?.part) {
      const p = existing.part as any;
      setForm({
        part_number: p.part_number, oem_number: p.oem_number ?? "", name: p.name,
        description: p.description ?? "", manufacturer: p.manufacturer ?? "", is_oem: !!p.is_oem,
        brand_id: p.brand_id ?? "", category_id: p.category_id ?? "", category_tag: p.category_tag ?? "",
        price: Number(p.price ?? 0),
        ind_price: p.ind_price != null ? Number(p.ind_price) : null,
        gar_price: p.gar_price != null ? Number(p.gar_price) : null,
        export_price: p.export_price != null ? Number(p.export_price) : null,
        stock: Number(p.stock ?? 0),
        images: Array.isArray(p.images) ? p.images.filter((u: any) => typeof u === "string" && u.length > 0) : [],
      });
      setAlts((existing.alternatives ?? []).map((a: any) => ({
        id: a.alternative_part_id,
        part_number: a.parts?.part_number ?? "?",
        name: a.parts?.name ?? "",
      })));
    }
  }, [existing]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload: any = {
        ...form,
        id: partId,
        brand_id: form.brand_id || null,
        category_id: form.category_id || null,
        category_tag: form.category_tag || null,
        oem_number: form.oem_number || null,
        manufacturer: form.manufacturer || null,
        description: form.description || null,
        price: Number(form.price ?? 0),
        stock: Number(form.stock ?? 0),
        ind_price: form.ind_price === "" || form.ind_price == null ? null : Number(form.ind_price),
        gar_price: form.gar_price === "" || form.gar_price == null ? null : Number(form.gar_price),
        export_price: form.export_price === "" || form.export_price == null ? null : Number(form.export_price),
        images: (form.images ?? []).filter((u: any) => typeof u === "string" && u.length > 0),
      };
      const r = await adminUpsertPartFull({ data: payload });
      const id = (r as any).id ?? partId;
      if (id) await adminSetAlternatives({ data: { partId: id, altIds: alts.map((a) => a.id) } });
      toast.success(isEdit ? "Saved" : "Part created");
      if (!isEdit && id) navigate({ to: "/admin/parts/$id", params: { id } });
    } catch (e: any) {
      const msg = e?.issues?.[0]?.message || e?.message || "Save failed";
      toast.error(msg);
      console.error("Part save failed:", e);
    }
    finally { setSaving(false); }
  };

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Part number" required>
          <input className="input" required value={form.part_number} onChange={(e) => set("part_number", e.target.value)} />
        </FormField>
        <FormField label="OEM number">
          <input className="input" value={form.oem_number} onChange={(e) => set("oem_number", e.target.value)} />
        </FormField>
        <FormField label="Name" required>
          <input className="input" required value={form.name} onChange={(e) => set("name", e.target.value)} />
        </FormField>
        <FormField label="Manufacturer">
          <input className="input" value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} />
        </FormField>
        <FormField label="Brand">
          <select className="input" value={form.brand_id} onChange={(e) => set("brand_id", e.target.value)}>
            <option value="">— None —</option>
            {(brands ?? []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </FormField>
        <FormField label="Category">
          <select className="input" value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
            <option value="">— None —</option>
            {(cats ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FormField>
        <FormField label="Category tag (legacy)">
          <input className="input" value={form.category_tag} onChange={(e) => set("category_tag", e.target.value)} />
        </FormField>
        <FormField label="OEM part?">
          <label className="mt-2 inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_oem} onChange={(e) => set("is_oem", e.target.checked)} /> Yes
          </label>
        </FormField>
      </div>

      <FormField label="Description">
        <textarea rows={4} className="input" value={form.description} onChange={(e) => set("description", e.target.value)} />
      </FormField>

      <section className="rounded-lg border bg-surface p-4">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Pricing (AED)</h3>
        <div className="grid gap-3 md:grid-cols-4">
          <NumField label="Default price" value={form.price} onChange={(v: any) => set("price", v)} required />
          <NumField label="IND price" value={form.ind_price} onChange={(v: any) => set("ind_price", v)} nullable />
          <NumField label="GAR price" value={form.gar_price} onChange={(v: any) => set("gar_price", v)} nullable />
          <NumField label="EXPORT price" value={form.export_price} onChange={(v: any) => set("export_price", v)} nullable />
        </div>
      </section>

      <section className="rounded-lg border bg-surface p-4">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Inventory</h3>
        <NumField label="Stock quantity" value={form.stock} onChange={(v: any) => set("stock", v)} integer />
      </section>

      <section className="rounded-lg border bg-surface p-4">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Images</h3>
        <div className="flex flex-wrap gap-2">
          {form.images.map((url: string, i: number) => (
            <div key={i} className="relative h-20 w-20 overflow-hidden rounded border">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => set("images", form.images.filter((_: any, j: number) => j !== i))}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white"><X size={10} /></button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input className="input" placeholder="Image URL" value={newImage} onChange={(e) => setNewImage(e.target.value)} />
          <button type="button" onClick={() => { if (newImage) { set("images", [...form.images, newImage]); setNewImage(""); } }}
            className="rounded-md border px-3 text-sm">Add</button>
        </div>
      </section>

      <AlternativesPicker selfId={partId} alts={alts} onChange={setAlts} />

      <div className="flex justify-end gap-3 border-t pt-4">
        <button type="button" onClick={() => navigate({ to: "/admin/parts" })} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
        <button disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create part"}
        </button>
      </div>
      <style>{`.input{width:100%;border:1px solid hsl(var(--border));background:hsl(var(--surface));border-radius:.375rem;padding:.5rem .75rem;font-size:.875rem;outline:none}.input:focus{box-shadow:0 0 0 2px hsl(var(--ring))}`}</style>
    </form>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}{required && " *"}</span><div className="mt-1">{children}</div></label>;
}

function NumField({ label, value, onChange, nullable, required, integer }: any) {
  return (
    <FormField label={label} required={required}>
      <input type="number" step={integer ? 1 : 0.01} min={0} className="input"
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "" && nullable) onChange(null);
          else onChange(integer ? Math.max(0, parseInt(v || "0", 10)) : Number(v));
        }} />
    </FormField>
  );
}

function AlternativesPicker({ selfId, alts, onChange }: { selfId?: string; alts: any[]; onChange: (a: any[]) => void }) {
  const [q, setQ] = useState("");
  const { data: results } = useQuery({
    queryKey: ["admin-search-parts", q],
    queryFn: () => adminSearchPartsBasic({ data: { q } }),
    enabled: q.trim().length > 1,
  });
  return (
    <section className="rounded-lg border bg-surface p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Alternative parts</h3>
      <div className="flex flex-wrap gap-2">
        {alts.map((a) => (
          <span key={a.id} className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs">
            <span className="font-mono">{a.part_number}</span>
            <button type="button" onClick={() => onChange(alts.filter((x) => x.id !== a.id))}
              className="text-rose-600"><X size={11} /></button>
          </span>
        ))}
      </div>
      <div className="relative mt-3">
        <input className="input" placeholder="Search part number / name…" value={q} onChange={(e) => setQ(e.target.value)} />
        {q.trim().length > 1 && (results ?? []).length > 0 && (
          <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-background shadow-lg">
            {(results ?? []).filter((r: any) => r.id !== selfId && !alts.find((a) => a.id === r.id)).map((r: any) => (
              <button key={r.id} type="button"
                onClick={() => { onChange([...alts, r]); setQ(""); }}
                className="flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm hover:bg-muted">
                <span className="font-mono">{r.part_number}</span>
                <span className="truncate text-xs text-muted-foreground">{r.name}</span>
                <Plus size={14} />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
