import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

const getPublishedPage = createServerFn({ method: "POST" })
  .validator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const { data: row } = await supabase
      .from("cms_pages")
      .select("slug, title, body_html, meta_title, meta_description, published_at")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();
    return row;
  });

export const Route = createFileRoute("/page/$slug")({
  loader: async ({ params }) => {
    const page = await getPublishedPage({ data: { slug: params.slug } });
    if (!page) throw notFound();
    return page;
  },
  errorComponent: ({ error }) => <div className="mx-auto max-w-3xl px-4 py-12 text-center text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="mx-auto max-w-3xl px-4 py-12 text-center"><h1 className="text-2xl font-bold">Page not found</h1></div>,
  component: PublicPage,
});

function PublicPage() {
  const page = Route.useLoaderData();
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">{page.title}</h1>
      <div className="prose prose-lg mt-6 max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: page.body_html || "" }} />
    </article>
  );
}
