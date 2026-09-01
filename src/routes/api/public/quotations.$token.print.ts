import { createFileRoute } from "@tanstack/react-router";
import { models } from "@/lib/db/index.server";

export const Route = createFileRoute("/api/public/quotations/$token/print")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const token = params.token;
        if (!token || token.length < 16) return new Response("Not found", { status: 404 });
        const url = new URL(request.url);
        const auto = url.searchParams.get("auto") === "1";

        const quote = await models.quotations.findOne({
          where: { share_token: token },
          raw: true,
        });
        
        if (!quote) return new Response("Quotation not found", { status: 404 });

        const items = await models.quotation_items.findAll({
          where: { quotation_id: quote.id },
          order: [["created_at", "ASC"]],
          raw: true,
        });

        const html = renderQuotationHtml(quote as any, (items ?? []) as any[], auto);
        return new Response(html, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      },
    },
  },
});

function esc(s: any) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function renderQuotationHtml(q: any, items: any[], auto = false) {
  const cur = q.currency ?? "AED";
  const fmt = (n: number) => `${cur} ${Number(n).toFixed(2)}`;
  const snap = q.customer_snapshot ?? {};
  const created = new Date(q.created_at).toLocaleDateString();
  const validUntil = q.valid_until ? new Date(q.valid_until).toLocaleDateString() : "—";

  const rows = items.map((it: any, idx: number) => {
    const ps = it.part_snapshot ?? {};
    const unit = it.custom_price ?? it.unit_price;
    return `
      <tr>
        <td>${idx + 1}</td>
        <td>
          <div style="font-weight:600">${esc(ps.name)}</div>
          <div style="font-size:11px;color:#666">${esc(ps.part_number)} ${ps.manufacturer ? "· " + esc(ps.manufacturer) : ""}</div>
        </td>
        <td style="text-align:right">${it.quantity}</td>
        <td style="text-align:right">${fmt(unit)}</td>
        <td style="text-align:right">${fmt(it.line_discount)}</td>
        <td style="text-align:right">${fmt(it.line_total)}</td>
      </tr>`;
  }).join("");

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<title>Quotation ${esc(q.quotation_number)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;max-width:820px;margin:24px auto;padding:0 24px;background:#fff}
  h1{font-size:28px;margin:0}
  .muted{color:#666;font-size:13px}
  .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:16px;margin-bottom:20px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
  .card{border:1px solid #eee;border-radius:6px;padding:12px}
  table{width:100%;border-collapse:collapse;margin:16px 0}
  th,td{padding:8px;border-bottom:1px solid #eee;font-size:13px;vertical-align:top}
  th{background:#fafafa;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#666}
  .totals{margin-left:auto;width:300px}
  .totals .row{display:flex;justify-content:space-between;padding:4px 0}
  .totals .grand{border-top:2px solid #111;margin-top:6px;padding-top:8px;font-weight:700;font-size:16px}
  .status{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase;background:#eee}
  .notes{margin-top:24px;font-size:12px;color:#444;white-space:pre-wrap}
  .print-btn{margin:16px 0;padding:8px 16px;background:#111;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px}
  @media print{ .print-btn{display:none} body{margin:0;padding:12px} }
</style>
</head><body>
  <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  <div class="top">
    <div>
      <h1>QUOTATION</h1>
      <div class="muted">#${esc(q.quotation_number)}</div>
    </div>
    <div style="text-align:right">
      <div class="status">${esc(q.status)}</div>
      <div class="muted" style="margin-top:6px">Issued: ${created}</div>
      <div class="muted">Valid until: ${validUntil}</div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="muted" style="font-size:11px;text-transform:uppercase">Bill To</div>
      <div style="font-weight:600;margin-top:4px">${esc(snap.full_name)}</div>
      ${snap.company_name ? `<div>${esc(snap.company_name)}</div>` : ""}
      ${snap.email ? `<div class="muted">${esc(snap.email)}</div>` : ""}
      ${snap.phone ? `<div class="muted">${esc(snap.phone)}</div>` : ""}
      ${snap.address ? `<div class="muted">${esc(snap.address)}</div>` : ""}
    </div>
    <div class="card">
      <div class="muted" style="font-size:11px;text-transform:uppercase">Quotation Details</div>
      <div style="margin-top:4px">Currency: ${cur}</div>
      <div>Tax rate: ${q.tax_rate}%</div>
      <div>Discount: ${q.discount_type === "percent" ? q.discount_value + "%" : fmt(Number(q.discount_value))}</div>
    </div>
  </div>

  <table>
    <thead><tr>
      <th style="width:30px">#</th><th>Product</th>
      <th style="text-align:right;width:60px">Qty</th>
      <th style="text-align:right;width:90px">Unit</th>
      <th style="text-align:right;width:80px">Disc.</th>
      <th style="text-align:right;width:100px">Line Total</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${fmt(q.subtotal)}</span></div>
    <div class="row"><span>Discount</span><span>− ${fmt(q.discount_amount)}</span></div>
    <div class="row"><span>Tax (${q.tax_rate}%)</span><span>${fmt(q.tax_amount)}</span></div>
    <div class="row"><span>Shipping</span><span>${fmt(q.shipping_amount)}</span></div>
    <div class="row grand"><span>Grand Total</span><span>${fmt(q.grand_total)}</span></div>
  </div>

  ${q.notes ? `<div class="notes"><strong>Notes:</strong>\n${esc(q.notes)}</div>` : ""}
  ${q.terms ? `<div class="notes"><strong>Terms & Conditions:</strong>\n${esc(q.terms)}</div>` : ""}
  ${auto ? `<script>window.addEventListener('load', () => setTimeout(() => window.print(), 300));</script>` : ""}
</body></html>`;
}
