import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { adminCreateQuotation } from "@/lib/admin.quotations.functions";
import { salesmanSearchCustomersForQuotation } from "@/lib/admin.salesmen.functions";

import { QuotationBuilder, blankState } from "@/components/admin/quotation-builder";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/salesman/quotations/new")({
  head: () => ({ meta: [{ title: "Salesman · New Quotation" }] }),
  component: NewQuotation,
});

function NewQuotation() {
  const navigate = useNavigate();
  const create = useServerFn(adminCreateQuotation);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Quotation</h1>
        <Link to="/salesman/quotations"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button></Link>
      </div>
      <QuotationBuilder
        initial={blankState}
        submitting={submitting}
        primaryLabel="Create quotation"
        searchCustomersFn={salesmanSearchCustomersForQuotation as any}

        onSubmit={async (state) => {
          setSubmitting(true);
          try {
            const r = await create({ data: state as any });
            navigate({ to: "/admin/quotations/$id", params: { id: r.id } });
          } catch (e: any) {
            alert(e?.message ?? "Failed to create quotation");
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </div>
  );
}
