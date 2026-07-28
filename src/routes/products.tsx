import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AllParts, homePartsQO } from "@/components/all-parts";
import { AuthGate } from "@/components/auth-gate";

const SearchSchema = z.object({ page: z.coerce.number().int().min(1).default(1).catch(1) });

export const Route = createFileRoute("/products")({
  validateSearch: SearchSchema,
  head: () => ({
    meta: [
      { title: "Products — Fine Land International" },
      { name: "description", content: "Browse our complete catalog of OEM and aftermarket spare parts. Delivered across the UAE." },
      { property: "og:title", content: "Products — Fine Land International" },
      { property: "og:description", content: "Browse our complete catalog of OEM and aftermarket spare parts, delivered across the UAE." },
    ],
  }),
  loaderDeps: ({ search: { page } }) => ({ page }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(homePartsQO(deps.page)),
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  component: ProductsPage,
});

function ProductsPage() {
  const { page } = Route.useSearch();
  return (
    <div className="pt-24">
      <AuthGate message="Please sign in to browse our products catalog.">
        <AllParts page={page} basePath="/products" />
      </AuthGate>
    </div>
  );
}
