import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { adminGetCodLimits, adminUpdateCodLimits } from "@/lib/credit.functions";
import { formatAED } from "@/lib/format";
import { Settings, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/payment-settings")({
  head: () => ({ meta: [{ title: "Payment Settings — Admin" }] }),
  component: PaymentSettings,
});

type Limit = { enabled: boolean; max_amount: number };
const TYPES: Array<"IND" | "GAR" | "EXP"> = ["IND", "GAR", "EXP"];
const DEFAULTS: Record<string, Limit> = {
  IND: { enabled: true, max_amount: 5000 },
  GAR: { enabled: true, max_amount: 15000 },
  EXP: { enabled: true, max_amount: 20000 },
};

function PaymentSettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-cod-limits"], queryFn: () => adminGetCodLimits() });
  const [values, setValues] = useState<Record<string, Limit>>(DEFAULTS);

  useEffect(() => {
    if (data) {
      const merged: any = { ...DEFAULTS };
      for (const t of TYPES) merged[t] = { ...merged[t], ...(data as any)[t] };
      setValues(merged);
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: () => adminUpdateCodLimits({ data: values as any }),
    onSuccess: () => {
      toast.success("Payment settings updated");
      qc.invalidateQueries({ queryKey: ["admin-cod-limits"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Payment Settings</h1>
      </div>

      <section className="rounded-lg border bg-surface p-5">
        <h2 className="text-sm font-semibold">Cash on Delivery (COD) Limits</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Set the maximum COD amount for each customer type. Orders exceeding this limit will disable the COD option at checkout.
        </p>

        <div className="mt-5 space-y-4">
          {TYPES.map((t) => (
            <div key={t} className="grid grid-cols-1 gap-3 rounded-md border p-4 sm:grid-cols-[80px_120px_1fr]">
              <div>
                <span className="rounded bg-muted px-2 py-1 text-xs font-bold">{t}</span>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={values[t]?.enabled ?? true}
                  onChange={(e) => setValues((v) => ({ ...v, [t]: { ...v[t], enabled: e.target.checked } }))} />
                COD Enabled
              </label>
              <div>
                <label className="text-xs text-muted-foreground">Max amount (AED)</label>
                <input type="number" min={0} value={values[t]?.max_amount ?? 0}
                  disabled={!values[t]?.enabled}
                  onChange={(e) => setValues((v) => ({ ...v, [t]: { ...v[t], max_amount: Number(e.target.value) } }))}
                  className="mt-1 w-full rounded-md border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50" />
                {values[t]?.enabled && values[t]?.max_amount > 0 && (
                  <p className="mt-1 text-[10px] text-muted-foreground">Approx: {formatAED(values[t].max_amount)}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => mut.mutate()} disabled={mut.isPending}
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
          <Save className="h-4 w-4" /> {mut.isPending ? "Saving…" : "Save Settings"}
        </button>
      </section>
    </div>
  );
}
