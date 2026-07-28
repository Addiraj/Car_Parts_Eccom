import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getCategories } from "@/lib/catalog.functions";
import { Wrench, Disc, Gauge, Zap, Snowflake, Filter, Settings, Car } from "lucide-react";

const iconMap: Record<string, any> = {
  engine: Wrench, brakes: Disc, suspension: Gauge, electrical: Zap,
  cooling: Snowflake, filters: Filter, transmission: Settings, body: Car,
};

const catsQO = queryOptions({ queryKey: ["categories"], queryFn: () => getCategories() });

export const Route = createFileRoute("/catalog/$brand/$model/$year/$engine")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catsQO),
  head: ({ params }) => ({ meta: [{ title: `${params.brand} ${params.model} ${params.year} ${params.engine} — Categories` }] }),
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  component: EnginePage,
});

function EnginePage() {
  const { brand, model, year, engine } = Route.useParams();
  const { data: cats } = useSuspenseQuery(catsQO);
  const roots = cats.filter((c) => !c.parent_id);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="text-xs text-muted-foreground">
        <Link to="/catalog">Catalog</Link> / <Link to="/catalog/$brand" params={{ brand }}>{brand}</Link> /{" "}
        <Link to="/catalog/$brand/$model" params={{ brand, model }}>{model}</Link> /{" "}
        <span className="text-foreground">{year} · {engine}</span>
      </nav>

      <div className="mt-4 rounded-lg border bg-secondary p-4 text-secondary-foreground">
        <div className="text-[10px] uppercase tracking-widest opacity-70">Selected vehicle</div>
        <div className="mt-1 flex items-baseline gap-2 font-mono">
          <span className="text-2xl font-bold capitalize">{brand} {model}</span>
          <span className="text-base opacity-80">{year} · {engine}</span>
        </div>
      </div>

      <h2 className="mt-8 text-xl font-bold tracking-tight">Choose a category</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {roots.map((c) => {
          const Icon = iconMap[c.slug] ?? Wrench;
          const childCount = cats.filter((x) => x.parent_id === c.id).length;
          return (
            <Link key={c.id} to="/category/$slug" params={{ slug: c.slug }} search={{ engine }}
              className="group flex flex-col gap-3 rounded-lg border bg-surface p-5 transition hover:border-primary hover:shadow-md">
              <Icon className="h-6 w-6 text-primary" />
              <div>
                <div className="font-semibold">{c.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{childCount} sub-categories</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
