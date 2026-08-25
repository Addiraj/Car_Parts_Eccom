import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  adminListStaffAccounts,
  adminCreateStaffAccount,
  adminDeleteStaffAccount,
  adminResetStaffPassword,
} from "@/lib/admin.staff.functions";
import { Plus, Trash2, KeyRound, ShieldAlert, UserCog } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  head: () => ({ meta: [{ title: "Staff Accounts" }] }),
  component: AdminStaffAccounts,
});

const defaultForm = { username: "", full_name: "", password: "", role: "admin" as "admin" | "super_admin" };

function AdminStaffAccounts() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [resetModal, setResetModal] = useState<{ id: string; username: string } | null>(null);
  const [resetPwd, setResetPwd] = useState("");

  const { data, isFetching } = useQuery({
    queryKey: ["admin-staff-accounts"],
    queryFn: () => adminListStaffAccounts(),
  });
  const items = (data as any)?.items || [];

  const create = useMutation({
    mutationFn: () => adminCreateStaffAccount({ data: form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-staff-accounts"] });
      toast.success("Staff account created");
      setOpen(false);
      setForm(defaultForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => adminDeleteStaffAccount({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-staff-accounts"] });
      toast.success("Account deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetPass = useMutation({
    mutationFn: () => adminResetStaffPassword({ data: { id: resetModal!.id, password: resetPwd } }),
    onSuccess: () => {
      toast.success("Password updated");
      setResetModal(null);
      setResetPwd("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff Accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create admin and super admin logins
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-md bg-[#0F4CBA] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0b388b] transition-colors"
        >
          <Plus className="h-4 w-4" /> Add staff account
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b">
            <tr>
              <th className="px-5 py-3.5 text-left">Username</th>
              <th className="px-5 py-3.5 text-left">Name</th>
              <th className="px-5 py-3.5 text-left">Role</th>
              <th className="px-5 py-3.5 text-left">Created</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item: any) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-4 font-mono text-slate-700">{item.username}</td>
                <td className="px-5 py-4 font-medium text-slate-900">{item.full_name}</td>
                <td className="px-5 py-4">
                  {item.role === "super_admin" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                      <ShieldAlert className="h-3 w-3" /> Super Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                      <UserCog className="h-3 w-3" /> Admin
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-slate-500">
                  {item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      title="Reset Password"
                      onClick={() => setResetModal(item)}
                      className="grid h-8 w-8 place-items-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    >
                      <KeyRound className="h-4 w-4" />
                    </button>
                    <button
                      title="Delete Account"
                      onClick={() => {
                        if (confirm(`Delete account ${item.username}? This cannot be undone.`)) {
                          del.mutate(item.id);
                        }
                      }}
                      disabled={del.isPending}
                      className="grid h-8 w-8 place-items-center rounded border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && !isFetching && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                  No staff accounts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
            className="w-full max-w-[480px] rounded-xl bg-white shadow-2xl"
          >
            <div className="border-b px-6 py-5">
              <h2 className="text-xl font-bold">Add staff account</h2>
            </div>
            
            <div className="space-y-5 px-6 py-6">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Username</span>
                <input
                  required
                  autoFocus
                  placeholder="e.g. sales.admin"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().trim() })}
                  className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Lowercase letters, numbers, dot or underscore. Used to sign in.
                </p>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Display Name</span>
                <input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Password</span>
                <input
                  required
                  type="text"
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Role</span>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "super_admin" })}
                  className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-3 rounded-b-xl bg-slate-50 px-6 py-4 border-t">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={create.isPending}
                className="rounded-md bg-[#0F4CBA] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0b388b] disabled:opacity-50"
              >
                {create.isPending ? "Creating..." : "Create account"}
              </button>
            </div>
          </form>
        </div>
      )}

      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              resetPass.mutate();
            }}
            className="w-full max-w-sm rounded-xl bg-white shadow-2xl"
          >
            <div className="px-6 py-5 border-b">
              <h2 className="text-lg font-bold">Reset Password</h2>
              <p className="mt-1 text-sm text-muted-foreground">{resetModal.username}</p>
            </div>
            <div className="px-6 py-5">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">New Password</span>
                <input
                  required
                  type="text"
                  minLength={6}
                  value={resetPwd}
                  onChange={(e) => setResetPwd(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 bg-slate-50 border-t rounded-b-xl">
              <button
                type="button"
                onClick={() => setResetModal(null)}
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={resetPass.isPending || resetPwd.length < 6}
                className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
