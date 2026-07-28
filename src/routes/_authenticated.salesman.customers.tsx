import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { salesmanMyCustomers } from "@/lib/admin.salesmen.functions";

import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/salesman/customers")({
  head: () => ({ meta: [{ title: "My Customers" }] }),
  component: MyCustomers,
});

function MyCustomers() {
  const [q, setQ] = useState("");
  const { data = [] } = useQuery({ queryKey: ["salesman-customers", q], queryFn: () => salesmanMyCustomers({ data: { q } }) });
  const rows = data as any[];
  return (
    <div>
      <h1 className="text-2xl font-bold">My Customers</h1>
      <div className="relative mt-4 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-full rounded border bg-surface-2 py-2 pl-9 pr-3 text-sm" />
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
            <tr><th className="px-3 py-2 text-left">Customer</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Phone</th><th className="px-3 py-2 text-left">Status</th></tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-muted/40">
                <td className="px-3 py-2">
                  <Link to="/salesman/customers/$id" params={{ id: c.id }} className="font-medium text-primary hover:underline">
                    {c.full_name || "—"}
                  </Link>
                  {c.company_name && <div className="text-xs text-muted-foreground">{c.company_name}</div>}
                </td>
                <td className="px-3 py-2 text-xs">{c.customer_type}</td>
                <td className="px-3 py-2 text-xs">{c.phone ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{c.status}</td>
              </tr>
            ))}

            {!rows.length && <tr><td colSpan={4} className="px-3 py-10 text-center text-sm text-muted-foreground">No customers assigned yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
