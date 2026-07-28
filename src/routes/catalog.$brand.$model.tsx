import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getModelWithYears } from "@/lib/catalog.functions";

const qo = (brandSlug: string, modelSlug: string) => queryOptions({
  queryKey: ["model", brandSlug, modelSlug],
  queryFn: () => getModelWithYears({ data: { brandSlug, modelSlug } }),
});

export const Route = createFileRoute("/catalog/$brand/$model")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(qo(params.brand, params.model));
    if (!data) throw notFound();
    return data;
  },
  head: ({ params }) => ({ meta: [{ title: `${params.brand} ${params.model} — Year & Engine` }] }),
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center text-sm">Model not found.</div>,
  component: ModelPage,
});

function ModelPage() {
  const { brand, model } = Route.useParams();
  const { data } = useSuspenseQuery(qo(brand, model));
  if (!data) return null;
  const years = [...(data.model.model_years ?? [])].sort((a: any, b: any) => b.year - a.year);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="text-xs text-muted-foreground">
        <Link to="/catalog">Catalog</Link> / <Link to="/catalog/$brand" params={{ brand }}>{data.brand.name}</Link> / <span className="text-foreground">{data.model.name}</span>
      </nav>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">{data.brand.name} {data.model.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Select a model year &amp; engine.</p>

      <div className="mt-8 space-y-4">
        {years.map((y: any) => (
          <div key={y.id} className="rounded-lg border bg-surface p-4">
            <div className="flex items-baseline gap-3">
              <div className="font-mono text-xl font-bold">{y.year}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Model year</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {y.engines?.length ? y.engines.map((e: any) => (
                <Link key={e.id}
                  to="/catalog/$brand/$model/$year/$engine"
                  params={{ brand, model, year: String(y.year), engine: e.code }}
                  className="rounded-md border bg-surface-2 px-3 py-2 text-xs font-medium hover:border-primary hover:text-primary">
                  <span className="font-mono font-bold">{e.code}</span>
                  <span className="ml-2 text-muted-foreground">{e.name} · {e.displacement} · {e.fuel_type}</span>
                </Link>
              )) : <span className="text-xs text-muted-foreground">No engines registered</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
