import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { models } from "@/lib/db/index.server";

const getPublishedPage = createServerFn({ method: "POST" })
  .validator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const row = await models.cms_pages.findOne({
      where: { slug: data.slug, is_published: true },
      attributes: ["slug", "title", "body_html", "meta_title", "meta_description", "published_at"],
      raw: true,
    });
    return row as any;
  });

export const Route = createFileRoute("/page/$slug")({
  loader: async ({ params }) => {
    const page = await getPublishedPage({ data: { slug: params.slug } });
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: loaderData.meta_title || loaderData.title },
      ...(loaderData.meta_description ? [{ name: "description", content: loaderData.meta_description }] : []),
      { property: "og:title", content: loaderData.meta_title || loaderData.title },
    ] : [{ title: "Page" }],
  }),
  errorComponent: ({ error }) => <div className="mx-auto max-w-3xl px-4 py-12 text-center text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="mx-auto max-w-3xl px-4 py-12 text-center"><h1 className="text-2xl font-bold">Page not found</h1></div>,
  component: PublicPage,
});

function PublicPage() {
  const page = Route.useLoaderData();
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">{page.title}</h1>
      <div className="prose prose-lg mt-6 max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: page.body_html }} />
    </article>
  );
}
