import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getMyAddresses, saveAddress, deleteAddress, getShippingZones } from "@/lib/orders.functions";
import { toast } from "sonner";
import { MapPin, Trash2, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/addresses")({
  head: () => ({ meta: [{ title: "Addresses — Car Parts Dubai" }] }),
  component: AddressesPage,
});

const empty = { full_name: "", phone: "", emirate: "Dubai", area: "", street: "", building: "", landmark: "", is_default: false };

function AddressesPage() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const { data: addresses = [] } = useQuery({ queryKey: ["addresses"], queryFn: () => getMyAddresses() });
  const { data: zones = [] } = useQuery({ queryKey: ["shipping_zones"], queryFn: () => getShippingZones() });
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);

  const save = useMutation({
    mutationFn: () => saveAddress({ data: form as any }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["addresses"] }); toast.success(t("save")); setForm(empty); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteAddress({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["addresses"] }); toast.success(t("remove")); },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{t("addresses")}</h1>
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> {t("newAddress")}
        </button>
      </div>

      {open && (
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="mt-6 grid gap-3 rounded-lg border bg-surface p-5 sm:grid-cols-2">
          <input required placeholder={t("fullName")} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="rounded border bg-surface-2 p-2 text-sm" />
          <input required placeholder={t("phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded border bg-surface-2 p-2 text-sm" />
          <select value={form.emirate} onChange={(e) => setForm({ ...form, emirate: e.target.value })} className="rounded border bg-surface-2 p-2 text-sm">
            {zones.map((z: any) => <option key={z.emirate}>{z.emirate}</option>)}
          </select>
          <input required placeholder={t("area")} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="rounded border bg-surface-2 p-2 text-sm" />
          <input required placeholder={t("street")} value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className="rounded border bg-surface-2 p-2 text-sm sm:col-span-2" />
          <input placeholder={t("building")} value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} className="rounded border bg-surface-2 p-2 text-sm" />
          <input placeholder={t("landmark")} value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} className="rounded border bg-surface-2 p-2 text-sm" />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} /> {t("makeDefault")}
          </label>
          <button disabled={save.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:col-span-2">{t("saveAddressBtn")}</button>
        </form>
      )}

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {addresses.map((a: any) => (
          <li key={a.id} className="rounded-lg border bg-surface p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 text-primary" />{a.full_name}</div>
              <button onClick={() => del.mutate(a.id)} className="rounded p-1 text-muted-foreground hover:text-destructive" aria-label={t("remove")}><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{a.phone}</div>
            <div className="mt-2 text-sm">{a.street}{a.building ? `, ${a.building}` : ""}<br />{a.area}, {a.emirate}</div>
            {a.is_default && <span className="mt-2 inline-block rounded bg-secondary px-2 py-0.5 text-[10px] uppercase text-secondary-foreground">{t("default")}</span>}
          </li>
        ))}
      </ul>
      {addresses.length === 0 && !open && <p className="mt-10 text-center text-sm text-muted-foreground">{t("noAddressesPrompt")}</p>}
    </div>
  );
}
