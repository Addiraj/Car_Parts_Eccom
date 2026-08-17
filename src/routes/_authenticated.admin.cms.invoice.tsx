import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Save, Image as ImageIcon, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { getInvoiceSettings, saveInvoiceSettings, type InvoiceSettings } from "@/lib/cms.invoice.functions";

export const Route = createFileRoute("/_authenticated/admin/cms/invoice")({
  head: () => ({ meta: [{ title: "CMS · Invoice Settings" }] }),
  component: InvoiceSettingsPage,
});

function normalizeHex(hex: string): string {
  if (!hex) return "#0f172a";
  let h = hex.trim();
  if (!h.startsWith("#")) h = "#" + h;
  if (/^#([0-9A-Fa-f]{3})$/.test(h)) {
    h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  }
  if (!/^#([0-9A-Fa-f]{6})$/.test(h)) return "#0f172a";
  return h.toLowerCase();
}

const formSchema = z.object({
  companyName: z.string().min(1, "Company Name is required"),
  companyAddress: z.string(),
  companyPhone: z.string(),
  companyEmail: z.string(),
  companyTrn: z.string(),
  logoUrl: z.string(),
  primaryColor: z.string().regex(/^#([0-9A-Fa-f]{3}){1,2}$/, "Must be a valid hex color"),
  headerText: z.string(),
  footerText: z.string(),
});

function InvoiceSettingsPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getInvoiceSettings);
  const saveFn = useServerFn(saveInvoiceSettings);

  const { data, isLoading } = useQuery({
    queryKey: ["cms-invoice-settings"],
    queryFn: () => getFn(),
  });

  const formattedData = data
    ? { ...data, primaryColor: normalizeHex(data.primaryColor) }
    : undefined;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: formattedData || {
      companyName: "",
      companyAddress: "",
      companyPhone: "",
      companyEmail: "",
      companyTrn: "",
      logoUrl: "",
      primaryColor: "#0f172a",
      headerText: "",
      footerText: "",
    },
    values: formattedData,
  });

  const saveMut = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) =>
      saveFn({ data: { ...values, primaryColor: normalizeHex(values.primaryColor) } }),
    onSuccess: () => {
      toast.success("Invoice settings saved!");
      qc.invalidateQueries({ queryKey: ["cms-invoice-settings"] });
    },
    onError: (e) => toast.error(e.message || "Failed to save"),
  });

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Invoice Configuration</h1>
        <p className="text-muted-foreground">
          Customize the appearance and content of your system-generated PDF invoices and quotations.
        </p>
      </div>

      <form onSubmit={form.handleSubmit((d) => saveMut.mutate(d))} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4 rounded-xl border bg-surface p-6">
            <h2 className="text-xl font-semibold">Company Details</h2>
            
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input {...form.register("companyName")} />
              {form.formState.errors.companyName && <span className="text-xs text-destructive">{form.formState.errors.companyName.message}</span>}
            </div>

            <div className="space-y-2">
              <Label>Tax Registration Number (TRN)</Label>
              <Input {...form.register("companyTrn")} />
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea {...form.register("companyAddress")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input {...form.register("companyPhone")} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" {...form.register("companyEmail")} />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border bg-surface p-6">
            <h2 className="text-xl font-semibold">Appearance & Text</h2>

            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                {form.watch("logoUrl") ? (
                  <div className="relative h-16 w-32 shrink-0 rounded-lg border bg-white p-2 flex items-center justify-center overflow-hidden">
                    <img src={form.watch("logoUrl")} alt="Company Logo" className="max-h-full max-w-full object-contain" />
                    <button
                      type="button"
                      onClick={() => form.setValue("logoUrl", "", { shouldDirty: true })}
                      className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-destructive text-white text-xs shadow hover:bg-destructive/80"
                      title="Remove logo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="h-16 w-32 shrink-0 rounded-lg border border-dashed flex flex-col items-center justify-center text-xs text-muted-foreground bg-muted/40">
                    <ImageIcon className="h-4 w-4 mb-1 text-muted-foreground/60" />
                    <span>No Logo</span>
                  </div>
                )}

                <div className="space-y-1 flex-1">
                  <Input
                    type="file"
                    accept="image/png, image/jpeg, image/webp, image/svg+xml"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        toast.error("File size must be under 2MB");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const base64 = event.target?.result as string;
                        if (base64) {
                          form.setValue("logoUrl", base64, { shouldDirty: true });
                          toast.success("Logo uploaded!");
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="text-xs cursor-pointer"
                  />
                  <p className="text-[11px] text-muted-foreground">Upload PNG, JPG, or WebP (Max 2MB)</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Primary Theme Color</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  className="h-10 w-20 p-1 rounded border bg-transparent cursor-pointer"
                  value={normalizeHex(form.watch("primaryColor"))}
                  onChange={(e) => form.setValue("primaryColor", e.target.value.toLowerCase(), { shouldDirty: true })}
                />
                <Input
                  className="flex-1 font-mono"
                  value={form.watch("primaryColor") || ""}
                  onChange={(e) => form.setValue("primaryColor", e.target.value, { shouldDirty: true })}
                />
              </div>
              {form.formState.errors.primaryColor && <span className="text-xs text-destructive">{form.formState.errors.primaryColor.message}</span>}
            </div>

            <div className="space-y-2">
              <Label>Header Text (Optional)</Label>
              <Input placeholder="e.g. TAX INVOICE" {...form.register("headerText")} />
            </div>

            <div className="space-y-2">
              <Label>Footer Text</Label>
              <Textarea className="h-20" {...form.register("footerText")} />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saveMut.isPending}>
            <Save className="mr-2 h-4 w-4" /> Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
