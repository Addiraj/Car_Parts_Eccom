import * as XLSX from "xlsx";

export function downloadCsv(filename: string, headers: string[], rows: any[][]) {
  const esc = (v: any) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [headers.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}

export function downloadXlsx(filename: string, headers: string[], rows: any[][], sheetName = "Report") {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  triggerDownload(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}

export function printReport(title: string, headers: string[], rows: any[][], subtitle?: string) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  const tableRows = rows.map((r) =>
    `<tr>${r.map((c) => `<td>${escapeHtml(String(c ?? ""))}</td>`).join("")}</tr>`
  ).join("");
  w.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title>
<style>
  body { font: 12px -apple-system, Arial, sans-serif; padding: 24px; color: #111; }
  h1 { margin: 0 0 4px; font-size: 18px; }
  .sub { color: #666; font-size: 11px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border-bottom: 1px solid #ddd; padding: 6px 8px; text-align: left; }
  th { background: #f3f4f6; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
  tr:nth-child(even) td { background: #fafafa; }
  @media print { body { padding: 0; } }
</style></head><body>
  <h1>${escapeHtml(title)}</h1>
  ${subtitle ? `<div class="sub">${escapeHtml(subtitle)}</div>` : ""}
  <table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
    <tbody>${tableRows || `<tr><td colspan="${headers.length}" style="text-align:center;color:#888;padding:24px">No data</td></tr>`}</tbody>
  </table>
  <script>setTimeout(()=>window.print(),200);</script>
</body></html>`);
  w.document.close();
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
