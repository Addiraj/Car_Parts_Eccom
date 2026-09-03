import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  adminListParts,
  adminListPartBrands,
  adminUpsertPart,
  adminDeletePart,
  adminCreateImport,
  adminImportPartsBatch,
  adminFinishImport,
  adminListImports,
  adminGetImportErrors,
  type ImportRowError,
} from "@/lib/admin.functions";
import { adminBulkUpdateParts, adminBulkDeleteParts, adminExportPartsCsv, adminDeleteAllParts } from "@/lib/admin.catalog.functions";
import { formatAED } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Trash2, Upload, ChevronLeft, ChevronRight, Download, AlertCircle, Pencil } from "lucide-react";


export const Route = createFileRoute("/_authenticated/admin/parts")({
  head: () => ({ meta: [{ title: "Admin · Parts" }] }),
  component: AdminParts,
});

const empty = {
  part_number: "",
  name: "",
  price: 0,
  ind_price: 0,
  gar_price: 0,
  export_price: 0,
  stock: 0,
  manufacturer: "",
  oem_number: "",
  is_oem: true,
  images: [] as string[],
};

function AdminParts() {
  const [tab, setTab] = useState<"browse" | "import">("browse");
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Parts</h1>
        <div className="flex rounded-lg border bg-surface p-1 text-sm">
          <button
            onClick={() => setTab("browse")}
            className={`rounded-md px-3 py-1.5 ${tab === "browse" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Browse
          </button>
          <button
            onClick={() => setTab("import")}
            className={`rounded-md px-3 py-1.5 ${tab === "import" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Import CSV
          </button>
        </div>
      </div>
      <div className="mt-6">{tab === "browse" ? <BrowsePanel /> : <ImportPanel />}</div>
    </div>
  );
}

/* ───────── Browse ───────── */

function BrowsePanel() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("");
  const [form, setForm] = useState<any>(empty);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const pageSize = 50;

  const { data, isFetching } = useQuery({
    queryKey: ["admin-parts", page, q, brand],
    queryFn: () => adminListParts({ data: { page, pageSize, q, brand } }),
  });
  const items = (data as any)?.items ?? [];
  const total = (data as any)?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const { data: brandsData } = useQuery({
    queryKey: ["admin-part-brands"],
    queryFn: () => adminListPartBrands(),
  });
  const brands: { brand: string; count: number }[] = (brandsData as any)?.items ?? [];
  const brandsTotal: number = (brandsData as any)?.total ?? 0;

  const save = useMutation({
    mutationFn: () =>
      adminUpsertPart({ data: {
        ...form,
        price: Number(form.price),
        ind_price: form.ind_price === "" || form.ind_price == null ? null : Number(form.ind_price),
        gar_price: form.gar_price === "" || form.gar_price == null ? null : Number(form.gar_price),
        export_price: form.export_price === "" || form.export_price == null ? null : Number(form.export_price),
        stock: Number(form.stock),
      } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-parts"] });
      qc.invalidateQueries({ queryKey: ["admin-part-brands"] });
      toast.success("Saved");
      setForm(empty);
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => adminDeletePart({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-parts"] });
      qc.invalidateQueries({ queryKey: ["admin-part-brands"] });
      toast.success("Deleted");
    },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder="Search by part #, OEM, name, brand…"
          className="flex-1 min-w-[260px] rounded border bg-surface-2 px-3 py-2 text-sm"
        />
        <select
          value={brand}
          onChange={(e) => { setPage(1); setBrand(e.target.value); }}
          className="rounded border bg-surface-2 px-3 py-2 text-sm min-w-[200px]"
        >
          <option value="">All brands ({brandsTotal.toLocaleString()})</option>
          {brands.map((b) => (
            <option key={b.brand} value={b.brand}>
              {b.brand} ({b.count.toLocaleString()})
            </option>
          ))}
        </select>
        <button
          onClick={async () => {
            try {
              const r: any = await adminExportPartsCsv({ data: { q, brand } });
              const blob = new Blob([r.csv], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = `parts-${Date.now()}.csv`; a.click();
              URL.revokeObjectURL(url);
              toast.success(`Exported ${r.count} rows`);
            } catch (e: any) { toast.error(e.message); }
          }}
          className="flex items-center gap-1.5 rounded-md border bg-surface px-3 py-2 text-sm font-semibold"
        ><Download className="h-4 w-4" /> Export CSV</button>
        <button
          onClick={async () => {
            if (!confirm(`Are you absolutely sure you want to delete ALL parts in the database? This action cannot be undone.`)) return;
            const doubleCheck = prompt(`Type "DELETE ALL" to confirm:`);
            if (doubleCheck !== "DELETE ALL") {
              toast.error("Aborted delete all.");
              return;
            }
            try {
              const r: any = await adminDeleteAllParts();
              toast.success(`Deleted all ${r.deleted} parts successfully.`);
              setPage(1);
              setSelected(new Set());
              qc.invalidateQueries({ queryKey: ["admin-parts"] });
              qc.invalidateQueries({ queryKey: ["admin-part-brands"] });
            } catch (e: any) { toast.error(e.message); }
          }}
          className="flex items-center gap-1.5 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
        >
          <Trash2 className="h-4 w-4" /> Delete all parts
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Quick add
        </button>
      </div>

      {selected.size > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border bg-secondary/10 px-3 py-2 text-sm">
          <span className="font-semibold">{selected.size} selected</span>
          <button onClick={() => setBulkOpen(true)} className="rounded border bg-surface px-3 py-1 text-xs font-semibold">Bulk update</button>
          <button onClick={async () => {
            if (!confirm(`Delete ${selected.size} parts? This cannot be undone.`)) return;
            try {
              await adminBulkDeleteParts({ data: { ids: Array.from(selected) } });
              toast.success(`Deleted ${selected.size}`); setSelected(new Set());
              qc.invalidateQueries({ queryKey: ["admin-parts"] });
            } catch (e: any) { toast.error(e.message); }
          }} className="rounded border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">Bulk delete</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Clear</button>
        </div>
      )}

      {bulkOpen && (
        <BulkUpdateModal ids={Array.from(selected)} onClose={() => setBulkOpen(false)}
          onDone={() => { setBulkOpen(false); setSelected(new Set()); qc.invalidateQueries({ queryKey: ["admin-parts"] }); }} />
      )}

      {brand && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border bg-surface px-3 py-2 text-xs text-muted-foreground">
          <span>
            Filtering by brand <span className="font-semibold text-foreground">{brand}</span> ·{" "}
            {total.toLocaleString()} parts
          </span>
          <button onClick={() => { setPage(1); setBrand(""); }} className="ml-auto rounded border px-2 py-0.5 hover:bg-surface-2">
            Clear
          </button>
        </div>
      )}

      {brands.length > 0 && !brand && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {brands.slice(0, 12).map((b) => (
            <button
              key={b.brand}
              onClick={() => { setPage(1); setBrand(b.brand); }}
              className="rounded-full border bg-surface px-2.5 py-1 text-xs hover:bg-surface-2"
            >
              {b.brand} <span className="text-muted-foreground">· {b.count.toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}


      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="mt-4 grid gap-3 rounded-lg border bg-surface p-5 sm:grid-cols-2"
        >
          <input required placeholder="Part #" value={form.part_number} onChange={(e) => setForm({ ...form, part_number: e.target.value })} className="rounded border bg-surface-2 p-2 text-sm" />
          <input placeholder="Manufacturer / brand" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className="rounded border bg-surface-2 p-2 text-sm" />
          <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded border bg-surface-2 p-2 text-sm sm:col-span-2" />
          <input placeholder="OEM / Brand Part #" value={form.oem_number} onChange={(e) => setForm({ ...form, oem_number: e.target.value })} className="rounded border bg-surface-2 p-2 text-sm" />
          <input type="number" step="0.01" placeholder="Base / fallback price (AED)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="rounded border bg-surface-2 p-2 text-sm" />
          <input type="number" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="rounded border bg-surface-2 p-2 text-sm" />
          <input type="number" step="0.01" placeholder="IND price (Individual)" value={form.ind_price} onChange={(e) => setForm({ ...form, ind_price: e.target.value })} className="rounded border bg-surface-2 p-2 text-sm" />
          <input type="number" step="0.01" placeholder="GAR price (Garage)" value={form.gar_price} onChange={(e) => setForm({ ...form, gar_price: e.target.value })} className="rounded border bg-surface-2 p-2 text-sm" />
          <input type="number" step="0.01" placeholder="EXPORT price (Bulk)" value={form.export_price} onChange={(e) => setForm({ ...form, export_price: e.target.value })} className="rounded border bg-surface-2 p-2 text-sm sm:col-span-2" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_oem} onChange={(e) => setForm({ ...form, is_oem: e.target.checked })} /> Genuine OEM
          </label>
          <button disabled={save.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:col-span-2">
            Save
          </button>
        </form>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">
                <input type="checkbox"
                  checked={items.length > 0 && items.every((p: any) => selected.has(p.id))}
                  onChange={(e) => {
                    const next = new Set(selected);
                    items.forEach((p: any) => { if (e.target.checked) next.add(p.id); else next.delete(p.id); });
                    setSelected(next);
                  }} />
              </th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Part #</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Brand</th>
              <th className="px-3 py-2 text-right">Rate</th>
              <th className="px-3 py-2 text-right">IND</th>
              <th className="px-3 py-2 text-right">GAR</th>
              <th className="px-3 py-2 text-right">EXP</th>
              <th className="px-3 py-2 text-left">Stock</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((p: any) => (
              <tr key={p.id} className={selected.has(p.id) ? "bg-primary/5" : ""}>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selected.has(p.id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(p.id); else next.delete(p.id);
                      setSelected(next);
                    }} />
                </td>
                <td className="px-3 py-2 text-muted-foreground">{p.category ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{p.part_number}</td>
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{p.manufacturer ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-right">{formatAED(Number(p.price))}</td>
                <td className="px-3 py-2 font-mono text-right">{p.ind_price != null ? formatAED(Number(p.ind_price)) : "—"}</td>
                <td className="px-3 py-2 font-mono text-right">{p.gar_price != null ? formatAED(Number(p.gar_price)) : "—"}</td>
                <td className="px-3 py-2 font-mono text-right">{p.export_price != null ? formatAED(Number(p.export_price)) : "—"}</td>
                <td className="px-3 py-2">{p.stock}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <Link to="/admin/parts/$id" params={{ id: p.id }} className="rounded p-1 text-muted-foreground hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button onClick={() => del.mutate(p.id)} className="rounded p-1 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && !isFetching && (
              <tr>
                <td colSpan={11} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  No parts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col items-center gap-2 text-xs text-muted-foreground">
        <span>
          {total.toLocaleString()} parts · page {page} / {pages}
        </span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border px-2 py-1 disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded border px-2 py-1 disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── Bulk update modal ───────── */

function BulkUpdateModal({ ids, onClose, onDone }: { ids: string[]; onClose: () => void; onDone: () => void }) {
  const [field, setField] = useState<"price" | "ind_price" | "gar_price" | "export_price" | "stock">("price");
  const [mode, setMode] = useState<"set" | "delta" | "percent">("set");
  const [value, setValue] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const r: any = await adminBulkUpdateParts({ data: { ids, field, mode, value } });
      toast.success(`Updated ${r.updated} parts`); onDone();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        className="w-full max-w-md space-y-4 rounded-lg border bg-background p-5">
        <h2 className="text-lg font-bold">Bulk update {ids.length} parts</h2>
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Field</span>
          <select value={field} onChange={(e) => setField(e.target.value as any)} className="mt-1 w-full rounded border bg-surface px-3 py-2 text-sm">
            <option value="price">Default price</option>
            <option value="ind_price">IND price</option>
            <option value="gar_price">GAR price</option>
            <option value="export_price">EXPORT price</option>
            <option value="stock">Stock</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Operation</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="mt-1 w-full rounded border bg-surface px-3 py-2 text-sm">
            <option value="set">Set to value</option>
            <option value="delta">Add / subtract</option>
            <option value="percent">Adjust by % (e.g. -10)</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Value</span>
          <input type="number" step="0.01" value={value} onChange={(e) => setValue(Number(e.target.value))}
            className="mt-1 w-full rounded border bg-surface px-3 py-2 text-sm" />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border px-3 py-2 text-sm">Cancel</button>
          <button disabled={saving} className="rounded bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {saving ? "Updating…" : "Apply"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ───────── Import ───────── */

const HEADER_MAP: Record<string, string> = {
  categoryname: "category_tag",
  category: "category_tag",
  categorytag: "category_tag",
  tag: "category_tag",
  partnumber: "part_number",
  partno: "part_number",
  brand: "manufacturer",
  manufacturer: "manufacturer",
  brandpartnumber: "oem_number",
  brandpartno: "oem_number",
  oemnumber: "oem_number",
  oem: "oem_number",
  itemdescription: "description",
  description: "description",
  name: "description",
  uniquevalue: "unique_value",
  unique: "unique_value",
  uniqueid: "unique_value",
  id: "unique_value",
  quantity: "stock",
  qty: "stock",
  stock: "stock",
  rateprice: "rate_price",
  rate: "rate_price",
  ind: "ind_price",
  indprice: "ind_price",
  individualprice: "ind_price",
  individual: "ind_price",
  price: "price",
  garageprice: "gar_price",
  garage: "gar_price",
  gar: "gar_price",
  garprice: "gar_price",
  exportprice: "export_price",
  export: "export_price",
  exp: "export_price",
};

function normHeader(h: string) {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}
function toNum(v: any): number {
  if (v == null || v === "") return 0;
  const n = Number(String(v).replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

const BATCH = 500;

type FailedRow = ImportRowError & { source: "duplicate-in-batch" | "server" };

function downloadFailedCsv(rows: FailedRow[], filename: string) {
  const header = "rowIndex,part_number,manufacturer,reason\n";
  const escape = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = rows
    .map((r) => [r.rowIndex ?? "", r.part_number ?? "", r.manufacturer ?? "", r.reason].map(escape).join(","))
    .join("\n");
  const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `failed-rows-${filename.replace(/\.csv$/i, "")}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


function ImportPanel() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{
    total: number;
    processed: number;
    inserted: number;
    updated: number;
    failed: number;
    duplicates: number;
    status: "idle" | "parsing" | "uploading" | "done" | "error";
    filename?: string;
    importId?: string;
    error?: string;
  }>({ total: 0, processed: 0, inserted: 0, updated: 0, failed: 0, duplicates: 0, status: "idle" });

  const [failedRows, setFailedRows] = useState<FailedRow[]>([]);
  const [viewingImport, setViewingImport] = useState<{ id: string; filename: string; errors: FailedRow[] } | null>(null);

  const { data: history = [] } = useQuery({
    queryKey: ["csv-imports"],
    queryFn: () => adminListImports(),
    refetchInterval: progress.status === "uploading" ? 2000 : false,
  });

  async function handleAnyFile(originalFile: File) {
    const name = originalFile.name.toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      try {
        setProgress({ total: 0, processed: 0, inserted: 0, updated: 0, failed: 0, duplicates: 0, status: "parsing", filename: originalFile.name });
        const buf = await originalFile.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) throw new Error("Workbook has no sheets");
        const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
        const csvName = originalFile.name.replace(/\.(xlsx|xls)$/i, ".csv");
        const csvFile = new File([csv], csvName, { type: "text/csv" });
        await handleFile(csvFile);
        return;
      } catch (e: any) {
        setProgress((p) => ({ ...p, status: "error", error: `XLSX parse failed: ${e?.message ?? e}` }));
        return;
      }
    }
    await handleFile(originalFile);
  }

  async function handleFile(file: File) {
    setProgress({ total: 0, processed: 0, inserted: 0, updated: 0, failed: 0, duplicates: 0, status: "parsing", filename: file.name });
    setFailedRows([]);

    // Pass 1: count rows
    const total = await new Promise<number>((resolve, reject) => {
      let count = 0;
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        worker: false,
        step: () => { count++; },
        complete: () => resolve(count),
        error: (e) => reject(e),
      });
    });

    if (!total) {
      setProgress((p) => ({ ...p, status: "error", error: "CSV appears empty" }));
      return;
    }

    let importId: string;
    try {
      const created = await adminCreateImport({ data: { filename: file.name, totalRows: total } });
      importId = created.id;
    } catch (e: any) {
      setProgress((p) => ({ ...p, status: "error", error: e.message }));
      return;
    }

    setProgress((p) => ({ ...p, total, status: "uploading", importId }));

    // Pass 2: stream + batch upload (with intra-batch dedup)
    let buffer: any[] = [];
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalFailed = 0;
    let totalDuplicates = 0;
    let totalProcessed = 0;
    let firstHeaderMapWarned = false;
    let rowCursor = 0; // 1-based CSV data row index

    const pushFailed = (rows: FailedRow[]) => {
      if (!rows.length) return;
      setFailedRows((prev) => (prev.length >= 1000 ? prev : [...prev, ...rows].slice(0, 1000)));
    };

    const flush = async () => {
      if (!buffer.length) return;
      // No de-duplication: every row in the file is imported as its own record.
      const rows = buffer;
      const sent = buffer.length;
      buffer = [];
      try {
        const r = await adminImportPartsBatch({ data: { importId, rows } });
        totalInserted += r.inserted;
        totalUpdated += r.updated;
        totalFailed += r.failed;
        if (r.errors?.length) {
          pushFailed(r.errors.map((e: ImportRowError) => ({ ...e, source: "server" as const })));
        }
      } catch (e: any) {
        totalFailed += rows.length;
        pushFailed(rows.map((r: any) => ({
          rowIndex: r.rowIndex ?? null,
          part_number: r.part_number ?? null,
          manufacturer: r.manufacturer ?? null,
          reason: `batch-error: ${e?.message ?? e}`,
          source: "server" as const,
        })));
        toast.error(`Batch failed: ${e.message}`);
      }
      totalProcessed += sent;
      setProgress((p) => ({
        ...p,
        processed: totalProcessed,
        inserted: totalInserted,
        updated: totalUpdated,
        failed: totalFailed,
        duplicates: totalDuplicates,
      }));
    };

    await new Promise<void>((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        worker: false,
        chunkSize: 1024 * 256,
        chunk: async (results, parser) => {
          parser.pause();
          try {
            for (const raw of results.data as Record<string, any>[]) {
              rowCursor++;
              const mapped: any = {};
              for (const [k, v] of Object.entries(raw)) {
                const key = HEADER_MAP[normHeader(k)];
                if (!key) continue;
                mapped[key] = v;
              }
              const part_number = mapped.part_number?.toString().trim() || "";
              if (!part_number) {
                pushFailed([{
                  rowIndex: rowCursor,
                  part_number: null,
                  manufacturer: mapped.manufacturer?.toString().trim() ?? null,
                  reason: "missing part_number",
                  source: "server",
                }]);
                totalFailed++;
                totalProcessed++;
                continue;
              }
              if (!firstHeaderMapWarned && !("price" in mapped) && !("ind_price" in mapped) && !("stock" in mapped)) {
                firstHeaderMapWarned = true;
                toast.warning("Couldn't detect price/quantity columns — check CSV headers");
              }
              const indP = mapped.ind_price != null ? toNum(mapped.ind_price) : null;
              const rateP = mapped.rate_price != null ? toNum(mapped.rate_price) : null;
              const basePrice = mapped.price != null ? toNum(mapped.price) : (rateP ?? indP ?? 0);
              buffer.push({
                rowIndex: rowCursor,
                category_tag: mapped.category_tag?.toString().trim() || null,
                part_number,
                manufacturer: mapped.manufacturer?.toString().trim() || null,
                oem_number: mapped.oem_number?.toString().trim() || null,
                description: mapped.description?.toString().trim() || null,
                unique_value: mapped.unique_value?.toString().trim() || null,
                stock: Math.max(0, Math.floor(toNum(mapped.stock))),
                rate_price: rateP,
                price: basePrice,
                ind_price: indP,
                gar_price: mapped.gar_price != null ? toNum(mapped.gar_price) : null,
                export_price: mapped.export_price != null ? toNum(mapped.export_price) : null,
              });
              if (buffer.length >= BATCH) await flush();
            }
            parser.resume();
          } catch (err) {
            parser.abort();
            reject(err);
          }
        },
        complete: async () => {
          await flush();
          resolve();
        },
        error: (e) => reject(e),
      });
    }).catch((e) => {
      setProgress((p) => ({ ...p, status: "error", error: String(e?.message ?? e) }));
    });

    await adminFinishImport({ data: { importId, status: totalFailed >= total ? "failed" : "completed" } }).catch(() => {});
    setProgress((p) => ({ ...p, status: "done" }));
    qc.invalidateQueries({ queryKey: ["csv-imports"] });
    qc.invalidateQueries({ queryKey: ["admin-parts"] });
    qc.invalidateQueries({ queryKey: ["home-parts"] });
    toast.success(`Import complete · ${totalInserted} new · ${totalUpdated} updated · ${totalFailed} failed · ${totalDuplicates} duplicates`);
  }

  const pct = progress.total ? Math.min(100, Math.round((progress.processed / progress.total) * 100)) : 0;
  const busy = progress.status === "parsing" || progress.status === "uploading";

  const panelRows = viewingImport ? viewingImport.errors : failedRows;
  const panelFilename = viewingImport ? viewingImport.filename : (progress.filename ?? "import");

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-surface p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary">
            <Upload className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Import parts from CSV or Excel</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Accepts .csv, .xlsx, .xls — columns: Category Name, Part Number, Brand, Brand Part No., Description, Unique Value, Quantity, Rate, IND, GAR, EXPORT.
              Existing parts (matching Unique Value) are updated (including changes to part number or category); if Unique Value is new or changes, a new row is inserted. Handles 50,000+ rows in batches of {BATCH}.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleAnyFile(f);
                }}
                className="block text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
              />
              {busy && <span className="text-xs text-muted-foreground">Working… do not close this tab.</span>}
            </div>
          </div>
        </div>

        {progress.status !== "idle" && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
              <span>{progress.filename}</span>
              <span>
                {progress.processed.toLocaleString()} / {progress.total.toLocaleString()} ({pct}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span className="text-green-400">+{progress.inserted.toLocaleString()} new</span>
              <span className="text-blue-400">~{progress.updated.toLocaleString()} updated</span>
              <span className="text-red-400">×{progress.failed.toLocaleString()} failed</span>
              <span className="text-amber-400">⤺{progress.duplicates.toLocaleString()} duplicates skipped</span>
              <span>Status: {progress.status}</span>
            </div>
            {progress.error && <div className="text-xs text-destructive">{progress.error}</div>}
          </div>
        )}
      </div>

      {(panelRows.length > 0 || viewingImport) && (
        <div className="rounded-lg border bg-surface">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <AlertCircle className="h-4 w-4 text-red-400" />
              Failed rows · {panelRows.length.toLocaleString()}
              {viewingImport && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">({panelFilename})</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadFailedCsv(panelRows, panelFilename)}
                disabled={!panelRows.length}
                className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-surface-2 disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" /> Download CSV
              </button>
              {viewingImport && (
                <button
                  onClick={() => setViewingImport(null)}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-surface-2"
                >
                  Close
                </button>
              )}
            </div>
          </div>
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Row</th>
                  <th className="px-3 py-2 text-left">Part #</th>
                  <th className="px-3 py-2 text-left">Brand</th>
                  <th className="px-3 py-2 text-left">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {panelRows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 font-mono text-muted-foreground">{r.rowIndex ?? "—"}</td>
                    <td className="px-3 py-1.5 font-mono">{r.part_number ?? "—"}</td>
                    <td className="px-3 py-1.5">{r.manufacturer ?? "—"}</td>
                    <td className="px-3 py-1.5 text-red-400">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-surface">
        <div className="border-b px-5 py-3 text-sm font-semibold">Recent imports</div>
        <div className="divide-y text-sm">
          {(history as any[]).map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{h.filename}</div>
                <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{h.processed_rows}/{h.total_rows}</span>
                <span className="text-green-400">+{h.inserted_rows}</span>
                <span className="text-blue-400">~{h.updated_rows}</span>
                <span className="text-red-400">×{h.failed_rows}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                    h.status === "completed" ? "bg-green-500/10 text-green-400" : h.status === "failed" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {h.status}
                </span>
                {h.failed_rows > 0 && (
                  <button
                    onClick={async () => {
                      try {
                        const res = await adminGetImportErrors({ data: { importId: h.id } });
                        setViewingImport({
                          id: h.id,
                          filename: res.filename,
                          errors: (res.errors ?? []).map((e: ImportRowError) => ({ ...e, source: "server" as const })),
                        });
                      } catch (e: any) {
                        toast.error(e.message);
                      }
                    }}
                    className="rounded border px-2 py-1 text-[10px] hover:bg-surface-2"
                  >
                    View errors
                  </button>
                )}
              </div>
            </div>
          ))}
          {!history.length && <div className="px-5 py-8 text-center text-xs text-muted-foreground">No imports yet.</div>}
        </div>
      </div>
    </div>
  );
}
