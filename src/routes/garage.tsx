import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyGarage, deleteVehicle, updateVehicleTag } from "@/lib/account.functions";
import { decodeVin } from "@/lib/catalog.functions";
import { toast } from "sonner";
import { Car, Trash2, LogIn, BookOpen, Loader2, Tag, Pencil, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/garage")({
  head: () => ({ meta: [{ title: "My Garage — Car Parts Dubai" }] }),
  component: GaragePage,
});

function GaragePage() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["garage"],
    queryFn: () => getMyGarage(),
    enabled: !!user,
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteVehicle({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["garage"] }); toast.success(t("remove")); },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vehicles;
    return (vehicles as any[]).filter((v) => {
      const hay = [v.reference_tag, v.nickname, v.vin, v.brand_name, v.model_name, v.engine_name, v.year]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [vehicles, query]);

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">{t("myGarage")}</h1>
        <div className="mt-8 grid place-items-center rounded-lg border border-dashed bg-surface-2 p-12 text-center">
          <Car className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">{t("signInToUseGarage")}</p>
          <Link
            to="/auth/login"
            search={{ redirect: "/garage" }}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <LogIn className="h-4 w-4" /> {t("signIn")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("myGarage")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("savedVehicles")}</p>
      </div>

      {vehicles.length > 0 && (
        <div className="mt-6 relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchGarage")}
            className="w-full rounded-md border bg-surface ps-9 pe-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      <div className="mt-4 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">{t("loading")}</p>}
        {!isLoading && vehicles.length === 0 && (
          <div className="grid place-items-center rounded-lg border border-dashed bg-surface-2 p-12 text-center">
            <Car className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">{t("noVehiclesPrompt")}</p>
          </div>
        )}
        {!isLoading && vehicles.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">No matches for “{query}”.</p>
        )}
        {filtered.map((v: any) => (
          <VehicleRow key={v.id} v={v} onDelete={() => del.mutate(v.id)} />
        ))}
      </div>
    </div>
  );
}

function VehicleRow({ v, onDelete }: { v: any; onDelete: () => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [tagInput, setTagInput] = useState<string>(v.reference_tag || "");

  const tagMut = useMutation({
    mutationFn: (val: string) =>
      updateVehicleTag({ data: { id: v.id, reference_tag: val.trim() || null } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["garage"] });
      setTagOpen(false);
      toast.success(t("save"));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const browse = async () => {
    if (!v.vin) {
      toast.error("VIN required to browse catalog. Add a VIN to this vehicle.");
      return;
    }
    setBusy(true);
    try {
      const r = await decodeVin({ data: { vin: v.vin } });
      if (!r.ok) throw new Error(r.error || "Decode failed");
      const modelNumber =
        (r.details as any)?.["Model Number"] ||
        (r.details as any)?.model_number ||
        r.model;
      if (!modelNumber) throw new Error("Model number not available");
      navigate({
        to: "/vin/$brand/$modelNumber",
        params: { brand: String(r.make || v.brand_name), modelNumber: String(modelNumber) },
        search: { modelName: String(r.model || v.model_name || "") },
      });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-surface p-4">
      <Car className="h-8 w-8 shrink-0 text-primary" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-semibold truncate">{v.nickname || `${v.brand_name} ${v.model_name}`}</div>
          {v.reference_tag && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              <Tag className="h-3 w-3" /> {v.reference_tag}
            </span>
          )}
        </div>
        <div className="font-mono text-xs text-muted-foreground truncate">{v.year} · {v.brand_name} {v.model_name}{v.engine_name && ` · ${v.engine_name}`}{v.vin && ` · VIN ${v.vin}`}</div>
      </div>
      <button
        onClick={() => { setTagInput(v.reference_tag || ""); setTagOpen(true); }}
        className="grid h-9 w-9 place-items-center rounded hover:bg-muted"
        aria-label={t("editTag")}
        title={t("editTag")}
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button onClick={browse} disabled={busy} className="hidden sm:inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-semibold hover:border-primary hover:text-primary disabled:opacity-50">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookOpen className="h-3.5 w-3.5" />}
        {t("browseCatalog") || "Browse Catalog"}
      </button>
      <button onClick={browse} disabled={busy} className="sm:hidden grid h-9 w-9 place-items-center rounded hover:bg-muted disabled:opacity-50" aria-label="Browse Catalog">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
      </button>
      <button onClick={onDelete} className="grid h-9 w-9 place-items-center rounded hover:bg-destructive/10 hover:text-destructive" aria-label={t("remove")}>
        <Trash2 className="h-4 w-4" />
      </button>

      <Dialog open={tagOpen} onOpenChange={(o) => { if (!tagMut.isPending) setTagOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editTag")}</DialogTitle>
            <DialogDescription className="text-xs">{t("referenceTagHelper")}</DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <label className="text-xs font-medium text-muted-foreground">{t("referenceTag")}</label>
            <input
              autoFocus
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              maxLength={60}
              placeholder="e.g. RO-8307 / Ali-8307"
              className="mt-1 w-full rounded-md border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); tagMut.mutate(tagInput); } }}
            />
          </div>
          <DialogFooter className="mt-4 gap-2">
            <button
              type="button"
              disabled={tagMut.isPending}
              onClick={() => tagMut.mutate("")}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              {t("remove")}
            </button>
            <button
              type="button"
              disabled={tagMut.isPending}
              onClick={() => tagMut.mutate(tagInput)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {tagMut.isPending ? t("loading") : t("save")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
