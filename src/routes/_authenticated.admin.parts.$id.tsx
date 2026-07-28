import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PartEditor } from "@/components/admin/part-editor";
import { NewQuotationDialog } from "@/components/admin/new-quotation-dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, AlertCircle } from "lucide-react";
import { adminGetPart } from "@/lib/admin.catalog.functions";

export const Route = createFileRoute("/_authenticated/admin/parts/$id")({
  head: () => ({ meta: [{ title: "Edit part — Admin" }] }),
  component: EditPart,
  errorComponent: ({ error, reset }) => (
    <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-6">
      <div className="flex items-center gap-2 text-red-600">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-semibold">Couldn't load part</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{(error as Error)?.message ?? "Unknown error"}</p>
      <button onClick={reset} className="mt-3 rounded-md border px-3 py-1.5 text-sm">Retry</button>
    </div>
  ),
});

function EditPart() {
  const { id } = Route.useParams();
  const get = useServerFn(adminGetPart);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-part", id],
    queryFn: () => get({ data: { id } }),
    retry: false,
  });
  const part = (data as any)?.part;
  const [quoteOpen, setQuoteOpen] = useState(false);

  return (
    <div>
      <Link to="/admin/parts" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft size={12} /> Back to parts
      </Link>
      <div className="mt-2 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Edit part</h1>
        <Button onClick={() => setQuoteOpen(true)} disabled={!part}>
          <FileText className="h-4 w-4 mr-1" /> Create Quotation
        </Button>
      </div>

      {isLoading && <div className="mt-6 text-sm text-muted-foreground">Loading part…</div>}
      {error && (
        <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-600">
          {(error as Error).message}
        </div>
      )}

      <div className="mt-6"><PartEditor partId={id} /></div>

      {part && (
        <NewQuotationDialog
          open={quoteOpen}
          onOpenChange={setQuoteOpen}
          prefillPart={{
            id: part.id,
            part_number: part.part_number,
            oem_number: part.oem_number,
            name: part.name,
            manufacturer: part.manufacturer,
            price: Number(part.price ?? 0),
          }}
        />
      )}
    </div>
  );
}
