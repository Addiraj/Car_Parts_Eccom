import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/catalog")({
  head: () => ({ meta: [{ title: "Catalog — Coming Soon" }, { name: "description", content: "Our parts catalog is coming soon." }] }),
  component: CatalogComingSoon,
});

function CatalogComingSoon() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Coming Soon</h1>
      <p className="mt-4 text-muted-foreground">Our parts catalog is being prepared. Please check back later.</p>
    </div>
  );
}
