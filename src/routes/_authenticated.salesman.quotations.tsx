import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { salesmanMyQuotations, salesmanSearchCustomersForQuotation } from "@/lib/admin.salesmen.functions";
import { formatAED } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Plus, Eye } from "lucide-react";
import { NewQuotationDialog } from "@/components/admin/new-quotation-dialog";

export const Route = createFileRoute("/_authenticated/salesman/quotations")({
  head: () => ({ meta: [{ title: "My Quotations" }] }),
  component: MyQuotes,
});

function MyQuotes() {
  const { data = [] } = useQuery({ queryKey: ["salesman-quotations"], queryFn: () => salesmanMyQuotations() });
  const rows = data as any[];
  const [newOpen, setNewOpen] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Quotations</h1>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Quotation</Button>
      </div>
      <NewQuotationDialog open={newOpen} onOpenChange={setNewOpen} searchCustomersFn={salesmanSearchCustomersForQuotation as any} />
      <div className="mt-4 overflow-x-auto rounded-lg border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Customer</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-left">Created</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((q) => (
              <tr key={q.id}>
                <td className="px-3 py-2 font-mono text-xs">
                  <Link to="/salesman/quotations/$id" params={{ id: q.id }} className="text-primary hover:underline">{q.quotation_number}</Link>
                </td>
                <td className="px-3 py-2 text-xs">{q.customer_snapshot?.full_name ?? "—"}</td>
                <td className="px-3 py-2 text-xs capitalize">{q.status}</td>
                <td className="px-3 py-2 text-right font-mono">{formatAED(Number(q.grand_total ?? 0))}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(q.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-2 text-right">
                  <Button asChild variant="ghost" size="sm" title="View">
                    <Link to="/salesman/quotations/$id" params={{ id: q.id }}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-muted-foreground">No quotations yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
