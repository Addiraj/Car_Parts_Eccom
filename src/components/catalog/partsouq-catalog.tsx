import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { AlertCircle, ChevronRight, Layers, X, ImageOff, Copy, Check, Maximize2, ShoppingCart, Loader2, Search } from "lucide-react";
import { fetchVinCatalog } from "@/lib/catalog.functions";
import { addCatalogPartsToCart, getMyProfile } from "@/lib/account.functions";
import { SignInDialog } from "@/components/sign-in-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useIsSalesman } from "@/hooks/use-is-salesman";
import { useBulkAvailability } from "@/hooks/use-parts-availability";
import { InventoryAddButton } from "@/components/inventory-add-button";
import { resolvePrice, type CustomerType, isCustomerType } from "@/lib/pricing";
import { formatAED } from "@/lib/format";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";



const API_BASE = "https://api.carparts.koncpt-ai.tech";
const proxiedImg = (u?: string) =>
  u ? `${API_BASE}/api/image-proxy?url=${encodeURIComponent(u)}` : u;


function Highlight({ text, query }: { text: string | number | null | undefined; query: string }) {
  const s = text == null ? "" : String(text);
  if (!query) return <>{s}</>;
  const q = query.trim();
  if (!q) return <>{s}</>;
  const idx = s.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{s}</>;
  return (
    <>
      {s.slice(0, idx)}
      <mark className="bg-yellow-200/70 dark:bg-yellow-500/30 rounded px-0.5 text-inherit">
        {s.slice(idx, idx + q.length)}
      </mark>
      {s.slice(idx + q.length)}
    </>
  );
}


export type PartNumberEntry = { part_number: string; quantity?: number | null; price?: number | string | null };
export type CatalogPart = {
  part_name: string;
  callout_number?: string | number;
  description?: string;
  part_numbers?: PartNumberEntry[];
};
export type Diagram = {
  diagram_name: string;
  diagram_code?: string;
  image_url?: string;
  parts: CatalogPart[];
};
export type Category = {
  category_name: string;
  category_code?: string;
  diagrams: Diagram[];
};
export type CatalogResponse = {
  brand_name: string;
  model_name: string;
  model_number: string;
  categories: Category[];
};

async function fetchCatalog(brand: string, modelNumber: string, modelName?: string): Promise<CatalogResponse> {
  const res = await fetchVinCatalog({ data: { brand, modelNumber, modelName } });
  if (!res.ok) throw new Error(res.error);
  return res.data as CatalogResponse;
}

export function PartsouqCatalog({
  brand,
  modelNumber,
  modelName,
  onClose,
  fullPage,
}: {
  brand: string;
  modelNumber: string;
  modelName?: string;
  onClose?: () => void;
  fullPage?: boolean;
}) {
  const q = useQuery({
    queryKey: ["vin-catalog", "v2-service", brand, modelNumber, modelName],
    queryFn: () => fetchCatalog(brand, modelNumber, modelName),
    enabled: !!brand && !!modelNumber,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const [catIdx, setCatIdx] = useState(0);
  const [selected, setSelected] = useState<Diagram | null>(null);
  const [zoom, setZoom] = useState(false);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [signInOpen, setSignInOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const autoOpenedForRef = useRef<string>("");
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isSalesman = useIsSalesman();
  const isStaff = isAdmin || isSalesman;
  const getProfile = useServerFn(getMyProfile);
  const profileQ = useQuery({
    queryKey: ["my-profile-tier", user?.id],
    queryFn: () => getProfile(),
    enabled: !!user && !isStaff,
    staleTime: 5 * 60 * 1000,
  });
  const tier: CustomerType = isCustomerType(profileQ.data?.customer_type) ? profileQ.data!.customer_type as CustomerType : "IND";
  const qc = useQueryClient();


  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);


  // Clear selection when diagram changes/closes
  useEffect(() => { setPicked({}); }, [selected]);

  const allPartNumbers = useMemo(() => {
    if (!selected) return [] as { pn: string; name: string }[];
    const out: { pn: string; name: string }[] = [];
    const seen = new Set<string>();
    for (const p of selected.parts || []) {
      for (const e of p.part_numbers || []) {
        const pn = (e?.part_number || "").trim();
        if (!pn || seen.has(pn)) continue;
        seen.add(pn);
        out.push({ pn, name: p.part_name });
      }
    }
    return out;
  }, [selected]);

  const availability = useBulkAvailability(allPartNumbers.map((x) => x.pn));
  const purchasablePns = useMemo(
    () => allPartNumbers.filter(({ pn }) => availability.get(pn).isPurchasable).map((x) => x.pn),
    [allPartNumbers, availability],
  );
  const pickedCount = Object.entries(picked).filter(([pn, v]) => v && availability.get(pn).isPurchasable).length;
  const allChecked = purchasablePns.length > 0 && purchasablePns.every((pn) => picked[pn]);

  const togglePicked = (pn: string, v?: boolean) => {
    if (!availability.get(pn).isPurchasable) return;
    setPicked((s) => ({ ...s, [pn]: v ?? !s[pn] }));
  };
  const toggleAll = () => {
    if (allChecked) setPicked({});
    else {
      const next: Record<string, boolean> = {};
      for (const pn of purchasablePns) next[pn] = true;
      setPicked(next);
    }
  };


  const addOneMut = useMutation({
    mutationFn: async (item: { part_number: string; part_name?: string }) =>
      addCatalogPartsToCart({ data: { items: [{ ...item, brand }] } }),
    onSuccess: (res, vars) => {
      if (res.added > 0) {
        toast.success(`Added ${vars.part_number} to cart`);
        qc.invalidateQueries({ queryKey: ["cart"] });
      } else toast.error(`Couldn't add ${vars.part_number}`);
    },
    onError: (e: any) => toast.error(e?.message || "Add to cart failed"),
  });

  const addSelected = async () => {
    if (!user) { setSignInOpen(true); return; }
    const items = allPartNumbers
      .filter(({ pn }) => picked[pn] && availability.get(pn).isPurchasable)
      .map(({ pn, name }) => ({ part_number: pn, part_name: name, brand }));
    if (!items.length) { toast.error("None of the selected parts are available"); return; }
    try {
      setBulkLoading(true);
      const res = await addCatalogPartsToCart({ data: { items } });
      if (res.added > 0) toast.success(`Added ${res.added} item${res.added === 1 ? "" : "s"} to cart`);
      if (res.skipped?.length) toast.error(`Skipped ${res.skipped.length} item(s)`);
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["parts-availability"] });
      setPicked({});
    } catch (e: any) {
      toast.error(e?.message || "Add to cart failed");
    } finally { setBulkLoading(false); }
  };

  const addOne = (pn: string, name: string) => {
    if (!user) { setSignInOpen(true); return; }
    if (!availability.get(pn).isPurchasable) return;
    addOneMut.mutate({ part_number: pn, part_name: name });
  };


  useEffect(() => {
    setCatIdx(0);
    if (import.meta.env.DEV && q.data) {
      const cats = Array.isArray(q.data.categories) ? q.data.categories : [];
      let diagCount = 0, partCount = 0, pnCount = 0;
      for (const c of cats) {
        const ds = Array.isArray(c?.diagrams) ? c.diagrams : [];
        diagCount += ds.length;
        for (const d of ds) {
          const parts = Array.isArray(d?.parts) ? d.parts : [];
          partCount += parts.length;
          for (const p of parts) pnCount += Array.isArray(p?.part_numbers) ? p.part_numbers.length : 0;
        }
      }
      // eslint-disable-next-line no-console
      console.log("[vin-catalog]", { categories: cats.length, diagrams: diagCount, parts: partCount, part_numbers: pnCount });
    }
  }, [q.data]);

  const rawCategories = Array.isArray(q.data?.categories) ? q.data!.categories : [];

  const filteredCategories = useMemo(() => {
    const qStr = debouncedQuery.toLowerCase();
    if (!qStr) return rawCategories;
    const matches = (v: unknown) =>
      v != null && String(v).toLowerCase().includes(qStr);
    const out: Category[] = [];
    for (const c of rawCategories) {
      const catHit = matches(c?.category_name);
      const keptDiagrams: Diagram[] = [];
      for (const d of c?.diagrams || []) {
        const diagHit =
          matches(d?.diagram_name) || matches(d?.diagram_code);
        let partHit = false;
        if (!catHit && !diagHit) {
          for (const p of d?.parts || []) {
            if (
              matches(p?.part_name) ||
              matches(p?.description) ||
              matches(p?.callout_number) ||
              (p?.part_numbers || []).some((pn) => matches(pn?.part_number))
            ) {
              partHit = true;
              break;
            }
          }
        }
        if (catHit || diagHit || partHit) keptDiagrams.push(d);
      }
      if (keptDiagrams.length > 0) {
        out.push({ ...c, diagrams: keptDiagrams });
      }
    }
    return out;
  }, [rawCategories, debouncedQuery]);

  const categories = useMemo(() => {
    const isService = (n?: string) => /^service\s*parts?$/i.test((n || "").trim());
    const list = [...filteredCategories];
    list.sort((a, b) => {
      const sa = isService(a?.category_name);
      const sb = isService(b?.category_name);
      return sa === sb ? 0 : sa ? -1 : 1;
    });
    return list;
  }, [filteredCategories]);
  const safeCatIdx = Math.min(catIdx, Math.max(0, categories.length - 1));
  const activeCat = categories[safeCatIdx];
  const diagrams = Array.isArray(activeCat?.diagrams) ? activeCat!.diagrams : [];

  // Auto-expand first matching category on new query
  useEffect(() => {
    if (debouncedQuery && categories.length > 0 && catIdx >= categories.length) {
      setCatIdx(0);
    }
  }, [debouncedQuery, categories.length, catIdx]);

  // Auto-open single result
  useEffect(() => {
    if (!debouncedQuery) { autoOpenedForRef.current = ""; return; }
    if (autoOpenedForRef.current === debouncedQuery) return;
    const totalDiagrams = categories.reduce((a, c) => a + (c.diagrams?.length || 0), 0);
    if (totalDiagrams === 1) {
      const only = categories[0]?.diagrams?.[0];
      if (only) {
        autoOpenedForRef.current = debouncedQuery;
        setSelected(only);
      }
    }
  }, [debouncedQuery, categories]);


  return (
    <div className={`${fullPage ? "" : "mt-8"} rounded-xl border bg-surface overflow-hidden`}>
      <div className="flex items-center justify-between gap-3 border-b bg-secondary/60 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Parts Catalog</div>
            <div className="font-mono text-sm font-semibold truncate">
              {brand} · {modelName || q.data?.model_name} · {modelNumber}
            </div>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-1" /> Close
          </Button>
        )}
      </div>

      {q.data && rawCategories.length > 0 && (
        <div className="border-b px-4 py-3 bg-background">
          <div className="relative max-w-xl">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search parts in this vehicle catalog..."
              className="pl-8 pr-8 h-9"
              aria-label="Search catalog"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}


      {q.isLoading && <CatalogSkeleton />}

      {q.isError && (
        <div className="p-6">
          <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <div className="font-semibold">Couldn't load catalog</div>
              <div className="opacity-80">{(q.error as Error)?.message || "Please try again."}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => q.refetch()}>Retry</Button>
          </div>
        </div>
      )}

      {q.data && rawCategories.length === 0 && (
        <div className="p-10 text-center text-sm text-muted-foreground">
          No catalog data available for this vehicle.
        </div>
      )}

      {q.data && rawCategories.length > 0 && categories.length === 0 && (
        <div className="p-10 text-center text-sm text-muted-foreground space-y-1">
          <div className="font-medium text-foreground">No matching parts found for this vehicle.</div>
          <div>Try searching by category name, part name, or OEM/Part number.</div>
        </div>
      )}

      {q.data && categories.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] min-h-[520px]">
          <ScrollArea className="lg:border-r max-h-[60vh] lg:max-h-[760px]">
            <ul className="p-2">
              {categories.map((c, i) => {
                const active = i === safeCatIdx;
                const count = Array.isArray(c?.diagrams) ? c.diagrams.length : 0;
                return (
                  <li key={(c?.category_name || "cat") + "-" + i}>
                    <button
                      onClick={() => setCatIdx(i)}
                      className={`group w-full text-left rounded-md px-3 py-2 text-sm flex items-center gap-2 transition-colors ${active
                          ? "bg-primary/10 text-foreground border-l-2 border-primary"
                          : "hover:bg-muted/60 border-l-2 border-transparent"
                        }`}
                    >
                      <span className="flex-1 truncate">
                        <Highlight text={c?.category_name || "Untitled"} query={debouncedQuery} />
                      </span>
                      <Badge variant="secondary" className="text-[10px]">{count}</Badge>
                      <ChevronRight className={`h-3.5 w-3.5 transition-transform ${active ? "translate-x-0.5 text-primary" : "text-muted-foreground"}`} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>

          <div className="border-t lg:border-t-0 p-4">
            {diagrams.length === 0 ? (
              <div className="h-full min-h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                No diagrams available
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 animate-in fade-in duration-300">
                {diagrams.map((d, i) => (
                  <DiagramCard
                    key={(d?.diagram_code || d?.diagram_name || "d") + "-" + i}
                    diagram={d}
                    query={debouncedQuery}
                    onOpen={() => { setSelected(d); setZoom(false); }}
                  />

                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Diagram details dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setZoom(false); } }}>
        <DialogContent className="max-w-6xl p-0 overflow-hidden" data-lenis-prevent>
          {selected && (
            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] h-[85vh]">
              <div className="bg-muted/30 flex items-center justify-center p-4 relative border-b md:border-b-0 md:border-r min-h-[280px]">
                {selected.image_url ? (
                  <>
                    <img
                      src={proxiedImg(selected.image_url)}
                      alt={selected.diagram_name}
                      referrerPolicy="no-referrer"
                      className="max-h-[75vh] w-auto object-contain"
                    />
                    <button
                      onClick={() => setZoom(true)}
                      className="absolute top-3 right-3 rounded-md bg-background/80 backdrop-blur p-2 hover:bg-background border"
                      aria-label="Zoom diagram"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <div className="text-muted-foreground flex flex-col items-center gap-2">
                    <ImageOff className="h-10 w-10" />
                    <span className="text-xs">No diagram available</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col overflow-hidden min-h-0">
                <div className="px-5 py-4 border-b">
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Diagram</div>
                  <div className="text-base font-semibold leading-tight">{selected.diagram_name}</div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {selected.diagram_code && (
                      <Badge variant="outline" className="text-[10px] font-mono">{selected.diagram_code}</Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px]">{selected.parts?.length || 0} part{(selected.parts?.length || 0) === 1 ? "" : "s"}</Badge>
                  </div>
                </div>
                {allPartNumbers.length > 0 && (
                  <div className="flex items-center justify-between gap-2 px-5 py-2 border-b bg-muted/30">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <Checkbox checked={allChecked} onCheckedChange={toggleAll} />
                      <span>Selecct all ({allPartNumbers.length})</span>
                    </label>
                    <Button size="sm" disabled={pickedCount === 0 || bulkLoading} onClick={addSelected}>
                      {bulkLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5 mr-1" />}
                      Add {pickedCount > 0 ? `${pickedCount} ` : ""}to cart
                    </Button>
                  </div>
                )}
                <ScrollArea className="flex-1 min-h-0" data-lenis-prevent>
                  {!selected.parts || selected.parts.length === 0 ? (
                    <div className="p-5 text-sm text-muted-foreground">No parts available</div>
                  ) : (
                    <ul className="divide-y">
                      {selected.parts.map((p, i) => (
                        <PartRow
                          key={(p.part_name || "part") + "-" + (p.callout_number ?? "") + "-" + i}
                          part={p}
                          picked={picked}
                          onTogglePicked={togglePicked}
                          onAddOne={addOne}
                          addingPn={addOneMut.isPending ? (addOneMut.variables as any)?.part_number : null}
                          query={debouncedQuery}
                          availability={availability}
                          isStaff={isStaff}
                          tier={tier}

                        />

                      ))}

                    </ul>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Zoom lightbox */}
      <Dialog open={zoom} onOpenChange={(o) => !o && setZoom(false)}>
        <DialogContent className="max-w-[95vw] p-0 overflow-hidden bg-background">
          {selected?.image_url && (
            <div className="flex items-center justify-center p-2 bg-muted/30 max-h-[92vh] overflow-auto">
              <img
                src={proxiedImg(selected.image_url)}
                alt={selected.diagram_name}
                referrerPolicy="no-referrer"
                className="max-h-[88vh] w-auto object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} message="Sign in to add catalog parts to your cart." />
    </div>
  );
}

function DiagramCard({ diagram, onOpen, query = "" }: { diagram: Diagram; onOpen: () => void; query?: string }) {
  const [errored, setErrored] = useState(false);
  const partCount = diagram.parts?.length || 0;
  const pnCount = (diagram.parts || []).reduce((a, p) => a + (p.part_numbers?.length || 0), 0);
  return (
    <div className="group rounded-lg border bg-card overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5">
      <button
        onClick={onOpen}
        className="block w-full aspect-video bg-muted/40 overflow-hidden relative"
        aria-label={`Open ${diagram.diagram_name}`}
      >
        {errored || !diagram.image_url ? (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            <ImageOff className="h-8 w-8" />
          </div>
        ) : (
          <img
            src={proxiedImg(diagram.image_url)}
            alt={diagram.diagram_name}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setErrored(true)}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
        )}
        {diagram.diagram_code && (
          <span className="absolute top-2 left-2 rounded-full bg-background/90 text-foreground text-[10px] font-mono font-semibold px-2 py-0.5 border">
            <Highlight text={diagram.diagram_code} query={query} />
          </span>
        )}
        {pnCount > 0 && (
          <span className="absolute top-2 right-2 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5">
            {pnCount} part numbers
          </span>
        )}
      </button>
      <button onClick={onOpen} className="block w-full text-left p-3">
        <div className="text-sm font-semibold truncate">
          <Highlight text={diagram.diagram_name} query={query} />
        </div>
        <div className="text-[11px] text-muted-foreground truncate mt-0.5">
          {partCount} part{partCount === 1 ? "" : "s"} · {pnCount} number{pnCount === 1 ? "" : "s"}
        </div>
      </button>
    </div>
  );
}

type AvailabilityApi = ReturnType<typeof useBulkAvailability>;

type PartRowProps = {
  part: CatalogPart;
  picked: Record<string, boolean>;
  onTogglePicked: (pn: string, v?: boolean) => void;
  onAddOne: (pn: string, name: string) => void;
  addingPn: string | null;
  query?: string;
  availability: AvailabilityApi;
  isStaff: boolean;
  tier: CustomerType;
};

function PartRow({ part, picked, onTogglePicked, onAddOne, addingPn, query = "", availability, isStaff, tier }: PartRowProps) {
  const pns = Array.isArray(part.part_numbers) ? part.part_numbers : [];
  return (
    <li className="px-5 py-3 hover:bg-muted/40">
      <div className="flex items-start gap-3">
        {part.callout_number != null && String(part.callout_number).length > 0 && (
          <Badge variant="outline" className="text-[10px] mt-0.5 shrink-0">#{part.callout_number}</Badge>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium leading-snug">
            <Highlight text={part.part_name} query={query} />
          </div>
          {part.description && part.description !== part.part_name && (
            <div className="text-[11px] text-muted-foreground mt-1 line-clamp-3">
              <Highlight text={part.description} query={query} />
            </div>
          )}
          {pns.length === 0 ? (
            <div className="text-[11px] text-muted-foreground mt-2 italic">No part numbers available</div>
          ) : (
            <ul className="mt-2 space-y-1">
              {pns.map((pn, i) => {
                const num = (pn?.part_number || "").trim();
                const info = availability.get(num);
                return (
                  <PartNumberItem
                    key={(num || "pn") + "-" + i}
                    entry={pn}
                    checked={!!picked[num]}
                    onToggle={() => num && onTogglePicked(num)}
                    onAdd={() => num && onAddOne(num, part.part_name)}
                    adding={addingPn === num}
                    query={query}
                    availabilityLoading={availability.isLoading}
                    existsInInventory={info.existsInInventory}
                    stock={info.stock}
                    price={info.price}
                    indPrice={info.ind_price}
                    garPrice={info.gar_price}
                    exportPrice={info.export_price}
                    isStaff={isStaff}
                    tier={tier}
                  />
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}


function PartNumberItem({
  entry, checked, onToggle, onAdd, adding, query = "",
  availabilityLoading, existsInInventory, stock,
  price, indPrice, garPrice, exportPrice, isStaff, tier,
}: {
  entry: PartNumberEntry;
  checked: boolean;
  onToggle: () => void;
  onAdd: () => void;
  adding: boolean;
  query?: string;
  availabilityLoading: boolean;
  existsInInventory: boolean;
  stock: number;
  price: number | null;
  indPrice: number | null;
  garPrice: number | null;
  exportPrice: number | null;
  isStaff: boolean;
  tier: CustomerType;
}) {
  const [copied, setCopied] = useState(false);
  const pn = entry?.part_number || "";
  const purchasable = existsInInventory && stock > 0;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pn);
      setCopied(true);
      toast.success(`Copied ${pn}`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  const tierPrice = existsInInventory
    ? resolvePrice({ ind_price: indPrice, gar_price: garPrice, export_price: exportPrice } as any, tier)
    : 0;

  return (
    <li className="flex items-center gap-2 flex-wrap">
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        aria-label={`Select ${pn}`}
        disabled={!purchasable}
      />
      <span className="font-mono text-[12px] bg-muted/60 rounded px-2 py-0.5"><Highlight text={pn} query={query} /></span>

      {entry?.quantity != null && (
        <span className="text-[10px] text-muted-foreground">Qty {entry.quantity}</span>
      )}

      {existsInInventory && isStaff && (
        <div className="flex items-center gap-1 flex-wrap">
          {price != null && (
            <span className="text-[10px] rounded bg-muted px-1.5 py-0.5 font-mono" title="Rate">
              <span className="text-muted-foreground">Rate</span> {formatAED(price)}
            </span>
          )}
          {indPrice != null && (
            <span className="text-[10px] rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 font-mono" title="Individual">
              <span className="opacity-70">IND</span> {formatAED(indPrice)}
            </span>
          )}
          {garPrice != null && (
            <span className="text-[10px] rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 font-mono" title="Garage">
              <span className="opacity-70">GAR</span> {formatAED(garPrice)}
            </span>
          )}
          {exportPrice != null && (
            <span className="text-[10px] rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 font-mono" title="Bulk / Export">
              <span className="opacity-70">EXP</span> {formatAED(exportPrice)}
            </span>
          )}
        </div>
      )}

      {existsInInventory && !isStaff && tierPrice > 0 && (
        <span className="text-[11px] font-semibold text-primary font-mono">
          {formatAED(tierPrice)}
        </span>
      )}

      {!availabilityLoading && existsInInventory && stock > 0 && isStaff && (
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400">In stock: {stock}</span>
      )}
      <div className="ml-auto flex items-center gap-1">
        <Button size="sm" variant="ghost" className="h-6 px-2" onClick={copy} aria-label="Copy part number">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
        <InventoryAddButton
          existsInInventory={existsInInventory}
          stock={stock}
          isLoading={availabilityLoading}
          adding={adding}
          onAdd={onAdd}
          compact
          isStaff={isStaff}
          className="h-6 px-2"
        />
      </div>
    </li>
  );
}



function CatalogSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] min-h-[520px]">
      <div className="p-3 space-y-2 lg:border-r">
        {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 border-t lg:border-t-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border overflow-hidden">
            <Skeleton className="aspect-video w-full" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
