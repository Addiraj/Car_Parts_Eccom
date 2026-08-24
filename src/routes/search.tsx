import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { searchParts } from "@/lib/catalog.functions";
import { formatAED } from "@/lib/format";
import { Search as SearchIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { PartThumb } from "@/components/part-thumb";
import { PartCard } from "@/components/part-card";

const schema = z.object({ q: z.string().optional().default("") });

export const Route = createFileRoute("/search")({
  validateSearch: schema,
  head: () => ({ meta: [{ title: "Search — Car Parts Dubai" }] }),
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const { t } = useI18n();
  const isAdmin = useIsAdmin();
  const query = useQuery({
    queryKey: ["search", q],
    queryFn: () => searchParts({ data: { q } }),
    enabled: !!q,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">{t("searchResults")}</h1>
      <form action="/search" method="get" className="mt-4 flex max-w-2xl items-center rounded-md border bg-surface-2">
        <SearchIcon className="ms-3 h-4 w-4 text-muted-foreground" />
        <input name="q" defaultValue={q} placeholder={t("searchShort")} className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
        <button className="rounded-e-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">{t("search")}</button>
      </form>

      {!q && <p className="mt-8 text-sm text-muted-foreground">{t("typeToBegin")}</p>}
      {q && query.isLoading && <p className="mt-8 text-sm text-muted-foreground">{t("searching")}</p>}
      {query.data && (
        <>
          {query.data.expanded && (
            <div className="mt-4 rounded-md border-s-4 border-primary bg-accent/40 px-3 py-2 text-xs">
              "{q}" → <span className="font-mono font-bold">{query.data.expanded}</span>
            </div>
          )}

          {query.data.categories.length > 0 && (
            <div className="mt-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("categoriesLabel")}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {query.data.categories.map((c) => (
                  <Link key={c.id} to="/category/$slug" params={{ slug: c.slug }}
                    className="rounded-md border bg-surface-2 px-3 py-1.5 text-sm hover:border-primary hover:text-primary">{c.name}</Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {query.data.parts.length}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {query.data.parts.map((p: any) => (
              <Link key={p.id} to="/parts/$id" params={{ id: p.id }} className="group block">
                <PartCard part={p} />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
