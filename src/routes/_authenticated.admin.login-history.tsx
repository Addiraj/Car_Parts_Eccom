import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { adminListLoginHistory } from "@/lib/admin.functions";
import { Search, Monitor, Smartphone, Globe, Download, LogIn, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/login-history")({
  head: () => ({ meta: [{ title: "Admin · Login History" }] }),
  component: AdminLoginHistory,
});

function AdminLoginHistory() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"All" | "Active" | "Inactive">("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const { data, isFetching } = useQuery({
    queryKey: ["admin-login-history", search, status, fromDate, toDate, page, pageSize],
    queryFn: () =>
      adminListLoginHistory({
        data: {
          search,
          status,
          from: fromDate || undefined,
          to: toDate || undefined,
          page,
          pageSize,
        },
      }),
  });

  const items = (data as any)?.items ?? [];
  const total = (data as any)?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const exportCsv = () => {
    const headers = ["full_name", "email", "type", "login_time", "logout_time", "duration", "device", "ip_address", "location"];
    const esc = (v: any) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(","), ...items.map((u: any) => {
      const login = new Date(u.login_time);
      const logout = u.logout_time ? new Date(u.logout_time) : null;
      let durationStr = "Active";
      if (logout) {
        const diffMins = Math.floor((logout.getTime() - login.getTime()) / 60000);
        durationStr = diffMins > 0 ? `${diffMins}m` : "< 1m";
      }
      return headers.map(h => {
        if (h === "duration") return esc(durationStr);
        if (h === "device") return esc(`${u.browser ?? "Unknown"} - ${u.os ?? "Unknown"} ${u.method ?? ""}`);
        return esc(u[h]);
      }).join(",");
    })].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "login-history.csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <LogIn className="h-6 w-6" /> Login History
        </h1>
        <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-surface-2">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="mt-4 grid gap-4 rounded-lg border bg-surface p-4 sm:grid-cols-12">
        <div className="sm:col-span-4">
          <label className="text-xs font-medium text-muted-foreground">Search</label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              placeholder="Customer name or email..."
              className="w-full rounded border bg-surface-2 py-2 pl-9 pr-3 text-sm"
            />
          </div>
        </div>
        
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <select
            value={status}
            onChange={(e) => { setPage(1); setStatus(e.target.value as any); }}
            className="mt-1 w-full rounded border bg-surface-2 px-3 py-2 text-sm"
          >
            <option value="All">All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setPage(1); setFromDate(e.target.value); }}
            className="mt-1 w-full rounded border bg-surface-2 px-3 py-2 text-sm uppercase"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => { setPage(1); setToDate(e.target.value); }}
            className="mt-1 w-full rounded border bg-surface-2 px-3 py-2 text-sm uppercase"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Per page</label>
          <select
            value={pageSize}
            onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }}
            className="mt-1 w-full rounded border bg-surface-2 px-3 py-2 text-sm"
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Customer</th>
              <th className="px-4 py-3 text-left font-semibold">Type</th>
              <th className="px-4 py-3 text-left font-semibold">Login</th>
              <th className="px-4 py-3 text-left font-semibold">Logout</th>
              <th className="px-4 py-3 text-left font-semibold">Duration</th>
              <th className="px-4 py-3 text-left font-semibold">Device</th>
              <th className="px-4 py-3 text-left font-semibold">IP</th>
              <th className="px-4 py-3 text-left font-semibold">Location</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((u: any) => {
              const loginDate = new Date(u.login_time);
              const logoutDate = u.logout_time ? new Date(u.logout_time) : null;
              
              let durationStr = "Active";
              if (logoutDate) {
                const diffMins = Math.floor((logoutDate.getTime() - loginDate.getTime()) / 60000);
                durationStr = diffMins > 0 ? `${diffMins}m` : "< 1m";
              }

              const isMobile = u.device_type?.toLowerCase().includes("mobile") || u.os?.toLowerCase().includes("ios") || u.os?.toLowerCase().includes("android");

              return (
                <tr key={u.id} className="hover:bg-surface-2/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{u.full_name}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.type}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {loginDate.toLocaleDateString("en-GB")}, {loginDate.toLocaleTimeString("en-GB", { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    {logoutDate ? (
                      <span className="text-muted-foreground">
                        {logoutDate.toLocaleDateString("en-GB")}, {logoutDate.toLocaleTimeString("en-GB", { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-sm bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 uppercase">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{durationStr}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {isMobile ? <Smartphone className="h-3.5 w-3.5 text-muted-foreground" /> : <Monitor className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span>{u.browser ?? "Unknown"} - {u.os ?? "Unknown"}</span>
                    </div>
                    {u.method && <div className="text-xs text-muted-foreground ml-5">{u.method}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.ip_address ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.location ?? "—"}</td>
                </tr>
              );
            })}
            {!items.length && !isFetching && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">No login history found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col items-center gap-2 text-xs text-muted-foreground">
        <span>{total.toLocaleString()} records · page {page} / {pages}</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border px-2 py-1 disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded border px-2 py-1 disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
