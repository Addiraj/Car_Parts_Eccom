import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { decodeVin } from "@/lib/catalog.functions";
import { addVehicle, getMyGarage } from "@/lib/account.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ScanLine, Car, Plus, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { SignInDialog } from "@/components/sign-in-dialog";
import { anonCanDecode, recordAnonVin, MAX_ANON_VINS } from "@/lib/anon-vin-quota";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/vin/")({
  head: () => ({ meta: [{ title: "VIN Search — Car Parts Dubai" }] }),
  component: VinPage,
});

function VinPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vin, setVin] = useState("");
  const [signInOpen, setSignInOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const { data: garage, refetch: refetchGarage } = useQuery({
    queryKey: ["my-garage"],
    queryFn: () => getMyGarage(),
    enabled: !!user,
  });

  const mut = useMutation({
    mutationFn: (v: string) => decodeVin({ data: { vin: v } }),
    onSuccess: (_data, v) => {
      if (!user) recordAnonVin(v);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const tryDecode = (raw: string) => {
    const v = raw.trim().toUpperCase();
    if (v.length < 11) { toast.error("VIN 11-17"); return; }
    if (!user && !anonCanDecode(v)) {
      setSignInOpen(true);
      return;
    }
    mut.mutate(v);
  };

  const result = mut.data;
  const modelNumber =
    (result?.ok && (result.details as any)?.["Model Number"]) ||
    (result?.ok && (result.details as any)?.model_number) ||
    (result?.ok ? result.model : "");

  const currentVin = result?.ok ? result.vin : "";
  const alreadyInGarage = !!(currentVin && garage?.some((g: any) => (g.vin || "").toUpperCase() === currentVin.toUpperCase()));

  const addMut = useMutation({
    mutationFn: async (reference_tag: string) => {
      if (!result?.ok) throw new Error("No vehicle");
      const yearNum = Number(result.year);
      const engine =
        (result.details as any)?.["Engine"] ||
        (result.details as any)?.engine ||
        (result.details as any)?.["Engine Type"] ||
        null;
      return addVehicle({
        data: {
          vin: result.vin,
          brand_name: result.make || "Unknown",
          model_name: result.model || "Unknown",
          year: yearNum && !Number.isNaN(yearNum) ? yearNum : null,
          engine_name: engine ? String(engine) : null,
          reference_tag: reference_tag.trim() || null,
        },
      });
    },
    onSuccess: () => {
      toast.success(t("addedToGarage"), {
        action: { label: t("myVehicles"), onClick: () => navigate({ to: "/garage" }) },
      });
      setTagDialogOpen(false);
      setTagInput("");
      refetchGarage();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleAddToGarage = () => {
    if (!user) {
      toast.info(t("signInRequired"));
      navigate({ to: "/auth/login", search: { redirect: typeof window !== "undefined" ? window.location.pathname + window.location.search : "/vin" } });
      return;
    }
    if (alreadyInGarage) {
      toast.info(t("alreadyInGarage"));
      return;
    }
    setTagInput("");
    setTagDialogOpen(true);
  };

  return (
    <div className="mx-auto px-4 py-10 max-w-6xl">
      <div className="flex items-center gap-3">
        <ScanLine className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">{t("vinTitle")}</h1>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{t("vinSub")}</p>

      <form onSubmit={(e) => { e.preventDefault(); tryDecode(vin); }}
        className="mt-6 flex gap-2">
        <input value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())}
          placeholder={t("vinPlaceholder")}
          maxLength={17}
          className="flex-1 min-w-0 rounded-md border bg-surface px-4 py-3 font-mono text-base tracking-wider outline-none focus:ring-2 focus:ring-ring" />
        <button disabled={mut.isPending} className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {mut.isPending ? t("loading") : t("decode")}
        </button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Suggested VINs:</span>
        {[
          { vin: "WBAFR71020C725456", label: "BMW 535i" },
          { vin: "WBAPH5C55BA123456", label: "BMW 3 Series" },
          { vin: "WBA3B31000F123456", label: "BMW F30" },
        ].map((item) => (
          <button
            key={item.vin}
            type="button"
            onClick={() => {
              setVin(item.vin);
              tryDecode(item.vin);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 font-mono text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
          >
            <span>{item.vin}</span>
            <span className="text-[10px] text-muted-foreground font-sans">({item.label})</span>
          </button>
        ))}
      </div>

      {!user && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Free preview: decode up to {MAX_ANON_VINS} VINs — sign in to unlock unlimited lookups.
        </p>
      )}
      <SignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        message={`You've reached the free limit of ${MAX_ANON_VINS} VIN decodes. Create a free account to continue.`}
      />

      {result && result.ok && (
        <div className="mt-8 rounded-lg border bg-surface flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="flex-1 w-full">
            <div className="flex items-center gap-3 border-b bg-secondary px-4 py-3 text-secondary-foreground">
              <Car className="h-5 w-5" />
              <div>
                <div className="text-xs uppercase tracking-widest opacity-70">{t("decodedVehicle")}</div>
                <div className="font-mono text-lg font-bold">{result.year} {result.make} {result.model}</div>
              </div>
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-3 p-4 text-sm">
              <Row k="VIN" v={result.vin} />
              {Object.entries((result.details as Record<string, unknown>) || {})
                .filter(([, v]) => v != null && !(typeof v === "string" && v.trim() === ""))
                .map(([k, v]) => {
                  const isPrimitive = typeof v === "string" || typeof v === "number" || typeof v === "boolean";
                  if (isPrimitive) return <Row key={k} k={k} v={String(v)} />;
                  return (
                    <div key={k} className="col-span-full">
                      <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</dt>
                      <dd>
                        <pre className="mt-1 whitespace-pre-wrap break-words rounded border bg-surface-2 p-2 font-mono text-xs">
                          {JSON.stringify(v, null, 2)}
                        </pre>
                      </dd>
                    </div>
                  );
                })}
            </dl>

          </div>
          <div className="p-6 shrink-0 w-full md:w-auto flex flex-col gap-3 justify-center border-t md:border-t-0 md:border-l border-border/50">
            <button
              type="button"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-4 rounded-xl shadow-lg transition-colors disabled:opacity-50"
              onClick={() => {
                if (!modelNumber) { toast.error("Model number not available for this VIN"); return; }
                navigate({
                  to: "/vin/$brand/$modelNumber",
                  params: { brand: result.make, modelNumber: String(modelNumber) },
                  search: { modelName: result.model || "" },
                });
              }}
            >
              {t("browseCatalog")}
            </button>
            <button
              type="button"
              disabled={addMut.isPending || alreadyInGarage}
              onClick={handleAddToGarage}
              className="inline-flex items-center justify-center gap-2 border border-primary/40 text-primary hover:bg-primary/10 font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {alreadyInGarage ? (
                <><Check className="h-4 w-4" /> {t("inYourGarage")}</>
              ) : (
                <><Plus className="h-4 w-4" /> {addMut.isPending ? t("loading") : t("addToGarage")}</>
              )}
            </button>
            {alreadyInGarage && (
              <Link to="/garage" className="text-xs text-center text-muted-foreground hover:text-primary underline">
                {t("myVehicles")}
              </Link>
            )}
          </div>
        </div>
      )}


      {result && !result.ok && (
        <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {result.error}
        </div>
      )}

      <Dialog open={tagDialogOpen} onOpenChange={(o) => { if (!addMut.isPending) setTagDialogOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("saveToGarageTitle")}</DialogTitle>
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
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMut.mutate(tagInput); } }}
            />
          </div>
          <DialogFooter className="mt-4 gap-2">
            <button
              type="button"
              disabled={addMut.isPending}
              onClick={() => addMut.mutate("")}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              {t("skip")}
            </button>
            <button
              type="button"
              disabled={addMut.isPending}
              onClick={() => addMut.mutate(tagInput)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {addMut.isPending ? t("loading") : t("save")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string | null }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</dt>
      <dd className="font-mono">{v || "—"}</dd>
    </div>
  );
}
