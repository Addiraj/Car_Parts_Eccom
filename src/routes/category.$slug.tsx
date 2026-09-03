import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { getCategoryParts } from "@/lib/catalog.functions";
import { InteractiveDiagram } from "@/components/interactive-diagram";
import { formatAED } from "@/lib/format";
import { PartThumb } from "@/components/part-thumb";

const searchSchema = z.object({ engine: z.string().optional() });

const qo = (slug: string) => queryOptions({
  queryKey: ["category", slug],
  queryFn: () => getCategoryParts({ data: { categorySlug: slug } }),
});

export const Route = createFileRoute("/category/$slug")({
  validateSearch: searchSchema,
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(qo(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ params }) => ({ meta: [{ title: `${params.slug} parts — Car Parts Dubai` }] }),
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center text-sm">Category not found.</div>,
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(qo(slug));
  if (!data) return null;
  const diagram = data.diagrams[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="text-xs text-muted-foreground">
        <Link to="/catalog">Catalog</Link> / <span className="text-foreground">{data.category.name}</span>
      </nav>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">{data.category.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{data.parts.length} parts · {data.diagrams.length} diagram(s)</p>

      {diagram ? (
        <div className="mt-6">
          <InteractiveDiagram diagramId={diagram.id} />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.parts.map((p) => (
            <Link key={p.id} to="/parts/$id" params={{ id: p.id }}
              className="group overflow-hidden rounded-lg border bg-surface transition hover:border-primary hover:shadow-md">
              <div className="aspect-square bg-surface-2">
                <PartThumb src={p.images?.[0]} alt={p.name} />
              </div>
              <div className="p-3">
                <div className="font-mono text-[10px] text-muted-foreground">{p.part_number}</div>
                <div className="mt-1 line-clamp-2 text-sm font-medium">{p.name}</div>
                <div className="mt-2 text-sm font-bold text-primary">
                  {Number(p.price) > 0 ? formatAED(Number(p.price)) : <span className="text-muted-foreground font-normal text-xs">Contact for price</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
