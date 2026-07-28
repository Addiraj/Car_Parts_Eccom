import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminGetQuotation,
  adminSetQuotationStatus,
  adminConvertQuotationToOrder,
} from "@/lib/admin.quotations.functions";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Printer, Mail, Send, CheckCircle2, XCircle, ArrowRightCircle, MessageCircle, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/quotations/$id")({
  head: () => ({ meta: [{ title: "Admin · Quotation" }] }),
  component: QuotationDetail,
});

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-200 text-zinc-700",
  sent: "bg-blue-100 text-blue-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-destructive/15 text-destructive",
  expired: "bg-amber-100 text-amber-800",
  converted: "bg-violet-100 text-violet-800",
};

function QuotationDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const get = useServerFn(adminGetQuotation);
  const setStatus = useServerFn(adminSetQuotationStatus);
  const convert = useServerFn(adminConvertQuotationToOrder);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-quotation", id],
    queryFn: () => get({ data: { id } }),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (!data) return <div>Not found.</div>;

  const { quote, items, events } = data as any;
  const snap = (quote.customer_snapshot ?? {}) as any;
  const fmt = (n: number) => `${quote.currency} ${Number(n).toFixed(2)}`;
  const printUrl = `/api/public/quotations/${quote.share_token}/print`;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-quotation", id] });
    qc.invalidateQueries({ queryKey: ["admin-quotation-stats"] });
  };

  const onStatus = async (status: any) => {
    await setStatus({ data: { id, status } });
    refresh();
  };
  const onConvert = async () => {
    if (!confirm("Convert this quotation into an order?")) return;
    const r = await convert({ data: { id } });
    refresh();
    navigate({ to: "/admin/orders/$id", params: { id: r.order_id } });
  };
  const emailLink = () => {
    const subject = `Quotation ${quote.quotation_number}`;
    const body = `Dear ${snap.full_name ?? "Customer"},\n\nPlease find your quotation ${quote.quotation_number} below:\n${window.location.origin}${printUrl}\n\nTotal: ${fmt(quote.grand_total)}\n\nThank you.`;
    return `mailto:${snap.email ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  const whatsappLink = () => {
    const phone = (snap.phone ?? "").replace(/\D/g, "");
    const msg = `Quotation ${quote.quotation_number}\nTotal: ${fmt(quote.grand_total)}\nView: ${window.location.origin}${printUrl}`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const canEdit = quote.status !== "converted";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link to="/admin/quotations"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-2xl font-bold font-mono">{quote.quotation_number}</h1>
          <span className={`inline-block rounded px-2 py-0.5 text-xs ${STATUS_COLORS[quote.status]}`}>{quote.status}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Link to="/admin/quotations/$id/edit" params={{ id }}><Button variant="outline" size="sm"><Edit className="h-4 w-4 mr-1" /> Edit</Button></Link>
          )}
          <a href={printUrl} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm"><Printer className="h-4 w-4 mr-1" /> Print</Button>
          </a>
          <a href={`${printUrl}?auto=1`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Download PDF</Button>
          </a>
          <a href={emailLink()}>
            <Button variant="outline" size="sm"><Mail className="h-4 w-4 mr-1" /> Email</Button>
          </a>
          <a href={whatsappLink()} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm"><MessageCircle className="h-4 w-4 mr-1" /> WhatsApp</Button>
          </a>
        </div>
      </div>

      {/* Status actions */}
      <div className="rounded-lg border bg-surface p-3 flex flex-wrap gap-2">
        {quote.status === "draft" && (
          <Button size="sm" onClick={() => onStatus("sent")}><Send className="h-4 w-4 mr-1" /> Mark as Sent</Button>
        )}
        {(quote.status === "sent" || quote.status === "draft") && (
          <>
            <Button size="sm" variant="outline" onClick={() => onStatus("approved")}><CheckCircle2 className="h-4 w-4 mr-1" /> Approve</Button>
            <Button size="sm" variant="outline" onClick={() => onStatus("rejected")}><XCircle className="h-4 w-4 mr-1" /> Reject</Button>
          </>
        )}
        {quote.status === "approved" && (
          <Button size="sm" onClick={onConvert}><ArrowRightCircle className="h-4 w-4 mr-1" /> Convert to Order</Button>
        )}
        {quote.converted_order_id && (
          <Link to="/admin/orders/$id" params={{ id: quote.converted_order_id }}>
            <Button size="sm" variant="outline">View Order →</Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-surface p-4">
          <h3 className="text-sm font-semibold mb-2">Customer</h3>
          <div className="text-sm space-y-0.5">
            <div className="font-medium">{snap.full_name || "—"}</div>
            {snap.company_name && <div className="text-muted-foreground">{snap.company_name}</div>}
            {snap.email && <div className="text-muted-foreground">{snap.email}</div>}
            {snap.phone && <div className="text-muted-foreground">{snap.phone}</div>}
            {snap.address && <div className="text-muted-foreground">{snap.address}</div>}
          </div>
        </div>
        <div className="rounded-lg border bg-surface p-4">
          <h3 className="text-sm font-semibold mb-2">Details</h3>
          <div className="text-sm space-y-1">
            <div>Created: {new Date(quote.created_at).toLocaleString()}</div>
            <div>Valid until: {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : "—"}</div>
            <div>Tax rate: {quote.tax_rate}%</div>
            <div>Currency: {quote.currency}</div>
          </div>
        </div>
        <div className="rounded-lg border bg-surface p-4">
          <h3 className="text-sm font-semibold mb-2">Totals</h3>
          <div className="text-sm space-y-1">
            <Row label="Subtotal" value={fmt(quote.subtotal)} />
            <Row label="Discount" value={`−${fmt(quote.discount_amount)}`} />
            <Row label="Tax" value={fmt(quote.tax_amount)} />
            <Row label="Shipping" value={fmt(quote.shipping_amount)} />
            <div className="flex justify-between font-bold border-t pt-1">
              <span>Grand Total</span><span>{fmt(quote.grand_total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left py-2 px-3">Product</th>
              <th className="text-right py-2 px-3">Qty</th>
              <th className="text-right py-2 px-3">Unit</th>
              <th className="text-right py-2 px-3">Disc.</th>
              <th className="text-right py-2 px-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {(items as any[]).map((it) => {
              const snap = (it.part_snapshot ?? {}) as any;
              const unit = it.custom_price ?? it.unit_price;
              return (
                <tr key={it.id} className="border-t">
                  <td className="py-2 px-3">
                    <div className="font-medium">{snap.name}</div>
                    <div className="text-xs text-muted-foreground">{snap.part_number} · {snap.manufacturer}</div>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">{it.quantity}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{fmt(unit)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{fmt(it.line_discount)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{fmt(it.line_total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(quote.notes || quote.terms) && (
        <div className="grid gap-4 md:grid-cols-2">
          {quote.notes && (
            <div className="rounded-lg border bg-surface p-4">
              <h3 className="text-sm font-semibold mb-2">Notes</h3>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{quote.notes}</p>
            </div>
          )}
          {quote.terms && (
            <div className="rounded-lg border bg-surface p-4">
              <h3 className="text-sm font-semibold mb-2">Terms</h3>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{quote.terms}</p>
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border bg-surface p-4">
        <h3 className="text-sm font-semibold mb-2">Activity</h3>
        <ul className="space-y-2 text-sm">
          {(events as any[]).map((e) => (
            <li key={e.id} className="flex justify-between border-b pb-1">
              <span>{e.event_type}{e.note ? ` — ${e.note}` : ""}</span>
              <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
            </li>
          ))}
          {events.length === 0 && <li className="text-muted-foreground text-xs">No activity yet.</li>}
        </ul>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="tabular-nums">{value}</span></div>;
}
