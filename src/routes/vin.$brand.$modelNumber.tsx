import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { PartsouqCatalog } from "@/components/catalog/partsouq-catalog";
import { trackCatalogView } from "@/lib/orders.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/vin/$brand/$modelNumber")({
  validateSearch: (s: Record<string, unknown>) => ({
    modelName: typeof s.modelName === "string" ? s.modelName : "",
  }),
  head: ({ params }) => ({
    meta: [{ title: `Parts Catalog · ${params.brand} ${params.modelNumber}` }],
  }),
  component: VinCatalogPage,
});

function VinCatalogPage() {
  const { brand, modelNumber } = Route.useParams();
  const { modelName } = Route.useSearch();
  const { user } = useAuth();
  useEffect(() => {
    if (user) {
      trackCatalogView({ data: { brand, modelNumber, modelName: modelName || undefined } }).catch(() => {});
    }
  }, [user, brand, modelNumber, modelName]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link to="/vin" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft size={12} /> Back to VIN search
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">
        VIN Parts Catalog · {brand} {modelName || ""} <span className="font-mono text-muted-foreground">{modelNumber}</span>
      </h1>
      <div className="mt-4">
        <PartsouqCatalog
          brand={brand}
          modelNumber={modelNumber}
          modelName={modelName || undefined}
          fullPage
        />
      </div>
    </div>
  );
}
