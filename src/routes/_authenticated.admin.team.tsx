import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { adminListTeam } from "@/lib/admin.functions";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/team")({
  head: () => ({ meta: [{ title: "Admin · Our Team" }] }),
  component: TeamPage,
});

type RoleFilter = "all" | "super_admin" | "admin" | "salesman";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  salesman: "Salesman",
};
const ROLE_CLS: Record<string, string> = {
  super_admin: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  admin: "border-primary/30 bg-primary/10 text-primary",
  salesman: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
};

function TeamPage() {
  const { data } = useQuery({ queryKey: ["admin-team"], queryFn: () => adminListTeam() });
  const [q, setQ] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");

  const items = (data?.items ?? []) as any[];
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((u) => {
      if (role !== "all" && !u.roles.includes(role)) return false;
      if (!s) return true;
      return (
        u.full_name?.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s) ||
        u.phone?.toLowerCase().includes(s) ||
        u.employee_id?.toLowerCase().includes(s)
      );
    });
  }, [items, q, role]);

  const counts = useMemo(() => ({
    all: items.length,
    super_admin: items.filter((u) => u.roles.includes("super_admin")).length,
    admin: items.filter((u) => u.roles.includes("admin") && !u.roles.includes("super_admin")).length,
    salesman: items.filter((u) => u.roles.includes("salesman")).length,
  }), [items]);

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold">Our Team</h1>
        <p className="text-sm text-muted-foreground">Admins, super admins, and salesmen with access to the platform.</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone, employee ID…"
            className="w-full rounded border bg-surface-2 py-2 pl-9 pr-3 text-sm" />
        </div>
        <div className="flex flex-wrap gap-1 rounded border bg-surface p-1 text-xs">
          {(["all","super_admin","admin","salesman"] as const).map((r) => (
            <button key={r} onClick={() => setRole(r)}
              className={`rounded px-3 py-1.5 font-medium ${role === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-2"}`}>
              {r === "all" ? "All" : ROLE_LABEL[r]} <span className="ml-1 opacity-70">({counts[r]})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Phone</th>
              <th className="px-3 py-2 text-left">Roles</th>
              <th className="px-3 py-2 text-left">Employee ID</th>
              <th className="px-3 py-2 text-left">Territory</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((u) => {
              const isSalesman = u.roles.includes("salesman");
              return (
                <tr key={u.id} className="hover:bg-surface-2/50">
                  <td className="px-3 py-2 font-medium">
                    {isSalesman ? (
                      <Link to="/admin/salesmen/$id" params={{ id: u.id }} className="text-primary hover:underline">
                        {u.full_name || "—"}
                      </Link>
                    ) : (
                      u.full_name || "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">{u.email || "—"}</td>
                  <td className="px-3 py-2 text-xs">{u.phone || "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r: string) => (
                        <span key={r} className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${ROLE_CLS[r] ?? ""}`}>
                          {ROLE_LABEL[r] ?? r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">{u.employee_id || "—"}</td>
                  <td className="px-3 py-2 text-xs">{u.territory || "—"}</td>
                  <td className="px-3 py-2 text-xs">{u.status || "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">No team members found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
