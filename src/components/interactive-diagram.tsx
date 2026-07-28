import { useState, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getDiagram } from "@/lib/catalog.functions";
import { formatAED } from "@/lib/format";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface Hotspot {
  id: string;
  callout_number: number;
  x: number; y: number; w: number; h: number;
  part: {
    id: string; part_number: string; oem_number: string | null;
    name: string; price: number; stock: number; images: string[];
    manufacturer: string | null; is_oem: boolean;
  } | null;
}

export function InteractiveDiagram({ diagramId }: { diagramId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["diagram", diagramId],
    queryFn: () => getDiagram({ data: { id: diagramId } }),
  });
  const isAdmin = useIsAdmin();
  const [active, setActive] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const hotspots: Hotspot[] = useMemo(
    () => ((data?.hotspots ?? []) as any).filter((h: any) => h.part).sort((a: any, b: any) => a.callout_number - b.callout_number),
    [data],
  );

  if (isLoading) return <div className="grid h-96 place-items-center rounded-lg border bg-surface-2 text-sm text-muted-foreground">Loading diagram…</div>;
  if (!data) return <div className="grid h-96 place-items-center rounded-lg border bg-surface-2 text-sm text-muted-foreground">Diagram unavailable.</div>;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      {/* Diagram canvas */}
      <div className="relative overflow-hidden rounded-lg border bg-surface">
        <div className="flex items-center justify-between border-b bg-surface-2 px-3 py-2 text-xs">
          <div className="font-semibold">{data.title}</div>
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="rounded p-1 hover:bg-muted" aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></button>
            <span className="w-12 text-center font-mono">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="rounded p-1 hover:bg-muted" aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></button>
            <button onClick={() => setZoom(1)} className="rounded p-1 hover:bg-muted" aria-label="Reset"><RotateCcw className="h-4 w-4" /></button>
          </div>
        </div>
        <div ref={containerRef} className="relative max-h-[640px] overflow-auto bg-grid">
          <div className="relative" style={{ width: `${zoom * 100}%`, transition: "width 200ms" }}>
            <img src={data.image_url} alt={data.title} className="block w-full select-none" draggable={false} />
            {hotspots.map((h) => {
              const isActive = active === h.id;
              return (
                <button key={h.id}
                  onMouseEnter={() => setActive(h.id)}
                  onFocus={() => setActive(h.id)}
                  onClick={() => setActive(h.id)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 text-[10px] font-bold transition ${
                    isActive ? "z-10 scale-125 border-primary bg-primary text-primary-foreground hotspot-active" : "border-primary/70 bg-surface/90 text-foreground hover:scale-110"
                  }`}
                  style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%`, width: 24, height: 24 }}
                  aria-label={`Part ${h.callout_number}: ${h.part?.name}`}>
                  {h.callout_number}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Parts list */}
      <div className="rounded-lg border bg-surface">
        <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Parts on this diagram ({hotspots.length})
        </div>
        <ul className="max-h-[640px] divide-y overflow-y-auto">
          {hotspots.map((h) => {
            const isActive = active === h.id;
            return (
              <li key={h.id}>
                <div
                  onMouseEnter={() => setActive(h.id)}
                  className={`flex gap-3 p-3 transition ${isActive ? "bg-accent" : "hover:bg-muted/50"}`}>
                  <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}>{h.callout_number}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10px] text-muted-foreground">{h.part!.part_number}</div>
                    <Link to="/parts/$id" params={{ id: h.part!.id }} className="block truncate text-sm font-medium hover:text-primary">
                      {h.part!.name}
                    </Link>
                    <div className="mt-1 flex items-center justify-between">
                      {!isAdmin ? <span className="text-sm font-bold text-primary">{formatAED(Number(h.part!.price))}</span> : <span />}
                      <span className={`text-[10px] font-semibold ${h.part!.stock > 0 ? "text-success" : "text-destructive"}`}>
                        {h.part!.stock > 0 ? `${h.part!.stock} in stock` : "Out of stock"}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
