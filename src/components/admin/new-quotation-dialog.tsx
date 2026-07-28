import * as React from "react";
import { useMemo, useState, useEffect } from "react";

import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuotationBuilder, blankState, type QuotationFormState, type Item } from "@/components/admin/quotation-builder";
import { adminCreateQuotation } from "@/lib/admin.quotations.functions";

export type PrefillPart = {
  id: string;
  part_number?: string | null;
  oem_number?: string | null;
  name?: string | null;
  manufacturer?: string | null;
  price?: number | null;
};

export function NewQuotationDialog({
  open,
  onOpenChange,
  prefillPart,
  searchCustomersFn,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefillPart?: PrefillPart | null;
  searchCustomersFn?: React.ComponentProps<typeof QuotationBuilder>["searchCustomersFn"];
}) {

  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(adminCreateQuotation);
  const [submitting, setSubmitting] = useState(false);

  const initial = useMemo<QuotationFormState>(() => {
    if (!prefillPart) return blankState;
    const item: Item = {
      part_id: prefillPart.id,
      part_snapshot: {
        part_number: prefillPart.part_number ?? "",
        oem_number: prefillPart.oem_number ?? "",
        name: prefillPart.name ?? "",
        manufacturer: prefillPart.manufacturer ?? "",
      },
      quantity: 1,
      unit_price: Number(prefillPart.price ?? 0),
      custom_price: null,
      line_discount: 0,
    };
    return { ...blankState, items: [item] };
  }, [prefillPart]);

  // Reset key whenever dialog reopens so internal state restarts cleanly
  const [instanceKey, setInstanceKey] = useState(0);
  useEffect(() => { if (open) setInstanceKey((k) => k + 1); }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] p-0 gap-0 overflow-hidden block">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle>New Quotation</DialogTitle>
        </DialogHeader>
        <div
          className="overflow-y-auto overscroll-contain max-h-[calc(90vh-72px)] px-6 py-4"
          tabIndex={-1}
        >
          <QuotationBuilder
            key={instanceKey}
            initial={initial}
            submitting={submitting}
            primaryLabel="Create quotation"
            searchCustomersFn={searchCustomersFn}
            onSubmit={async (state) => {

              setSubmitting(true);
              try {
                const r = await create({ data: state as any });
                toast.success(`Quotation ${r.quotation_number ?? ""} created`);
                qc.invalidateQueries({ queryKey: ["admin-quotations"] });
                qc.invalidateQueries({ queryKey: ["admin-quotation-stats"] });
                qc.invalidateQueries({ queryKey: ["salesman-quotations"] });
                onOpenChange(false);
                navigate({ to: "/admin/quotations/$id", params: { id: r.id } });
              } catch (e: any) {
                toast.error(e?.message ?? "Failed to create quotation");
              } finally {
                setSubmitting(false);
              }
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
