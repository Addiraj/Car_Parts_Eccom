import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { adminGetQuotation, adminUpdateQuotation } from "@/lib/admin.quotations.functions";
import { QuotationBuilder, blankState, type QuotationFormState } from "@/components/admin/quotation-builder";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/quotations/$id/edit")({
  head: () => ({ meta: [{ title: "Admin · Edit Quotation" }] }),
  component: EditQuotation,
});

function EditQuotation() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const get = useServerFn(adminGetQuotation);
  const update = useServerFn(adminUpdateQuotation);
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-quotation-edit", id],
    queryFn: () => get({ data: { id } }),
  });

  if (isLoading || !data) return <div className="text-muted-foreground">Loading…</div>;
  const { quote, items } = data as any;

  const initial: QuotationFormState = {
    ...blankState,
    customer_id: quote.customer_id,
    customer_snapshot: { ...blankState.customer_snapshot, ...(quote.customer_snapshot ?? {}) },
    currency: quote.currency,
    discount_type: quote.discount_type,
    discount_value: Number(quote.discount_value),
    tax_rate: Number(quote.tax_rate),
    shipping_amount: Number(quote.shipping_amount),
    notes: quote.notes ?? "",
    terms: quote.terms ?? "",
    valid_until: quote.valid_until ? String(quote.valid_until).slice(0, 10) : "",
    status: quote.status === "draft" || quote.status === "sent" ? quote.status : "draft",
    items: (items as any[]).map((it) => ({
      part_id: it.part_id,
      part_snapshot: {
        part_number: it.part_snapshot?.part_number ?? "",
        oem_number: it.part_snapshot?.oem_number ?? "",
        name: it.part_snapshot?.name ?? "",
        manufacturer: it.part_snapshot?.manufacturer ?? "",
      },
      quantity: it.quantity,
      unit_price: Number(it.unit_price),
      custom_price: it.custom_price != null ? Number(it.custom_price) : null,
      line_discount: Number(it.line_discount),
    })),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Quotation <span className="font-mono text-base text-muted-foreground">{quote.quotation_number}</span></h1>
        <Link to="/admin/quotations/$id" params={{ id }}><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1" /> Cancel</Button></Link>
      </div>
      <QuotationBuilder
        initial={initial}
        submitting={submitting}
        primaryLabel="Save changes"
        onSubmit={async (state) => {
          setSubmitting(true);
          try {
            await update({ data: { id, payload: state as any } });
            navigate({ to: "/admin/quotations/$id", params: { id } });
          } catch (e: any) {
            alert(e?.message ?? "Failed to update");
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </div>
  );
}
