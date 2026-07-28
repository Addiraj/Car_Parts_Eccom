import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getBrandWithModels } from "@/lib/catalog.functions";

const qo = (slug: string) => queryOptions({
  queryKey: ["brand", slug],
  queryFn: () => getBrandWithModels({ data: { slug } }),
});

export const Route = createFileRoute("/catalog/$brand")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(qo(params.brand));
    if (!data) throw notFound();
    return data;
  },
  head: ({ params }) => ({ meta: [{ title: `${params.brand} models — Car Parts Dubai` }] }),
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center text-sm">Brand not found.</div>,
  component: BrandPage,
});

function BrandPage() {
  const { brand } = Route.useParams();
  const { data } = useSuspenseQuery(qo(brand));
  if (!data) return null;
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="text-xs text-muted-foreground">
        <Link to="/">Home</Link> / <Link to="/catalog">Catalog</Link> / <span className="text-foreground">{data.name}</span>
      </nav>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">{data.name} models</h1>
      <p className="mt-2 text-sm text-muted-foreground">Select your model.</p>
      {data.models?.length ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {data.models.map((m: any) => (
            <Link key={m.id} to="/catalog/$brand/$model" params={{ brand, model: m.slug }}
              className="group overflow-hidden rounded-lg border bg-surface transition hover:border-primary hover:shadow-md">
              <div className="aspect-[16/10] bg-surface-2">
                {m.image_url ? <img src={m.image_url} alt={m.name} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" /> : <div className="grid h-full place-items-center text-xs text-muted-foreground">No image</div>}
              </div>
              <div className="p-3 text-sm font-semibold">{m.name}</div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-lg border bg-surface-2 p-8 text-center text-sm text-muted-foreground">No models available yet for this brand.</div>
      )}
    </div>
  );
}
