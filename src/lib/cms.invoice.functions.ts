import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export type InvoiceSettings = {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyTrn: string;
  logoUrl: string;
  primaryColor: string;
  headerText: string;
  footerText: string;
};

function normalizeHexColor(val: string): string {
  if (!val) return "#0f172a";
  let h = val.trim();
  if (!h.startsWith("#")) h = "#" + h;
  if (/^#([0-9A-Fa-f]{3})$/.test(h)) {
    h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  }
  if (!/^#([0-9A-Fa-f]{6})$/.test(h)) return "#0f172a";
  return h.toLowerCase();
}

const DEFAULT_SETTINGS: InvoiceSettings = {
  companyName: "Dubai Car Parts",
  companyAddress: "Industrial Area, Dubai, UAE",
  companyPhone: "+971 50 123 4567",
  companyEmail: "sales@dubaicarparts.com",
  companyTrn: "100123456789003",
  logoUrl: "",
  primaryColor: "#0f172a",
  headerText: "Thank you for your business.",
  footerText: "This is a computer generated document. No signature is required.",
};

const SETTINGS_ID = "invoice_settings";

export const getInvoiceSettings = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data: record } = await supabase.from("site_settings").select("data").eq("key", SETTINGS_ID).maybeSingle();
    if (!record || !record.data) return DEFAULT_SETTINGS;
    const merged = { ...DEFAULT_SETTINGS, ...(record.data as Partial<InvoiceSettings>) };
    merged.primaryColor = normalizeHexColor(merged.primaryColor);
    return merged;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
});

const invoiceSettingsSchema = z.object({
  companyName: z.string(),
  companyAddress: z.string(),
  companyPhone: z.string(),
  companyEmail: z.string(),
  companyTrn: z.string(),
  logoUrl: z.string(),
  primaryColor: z.string(),
  headerText: z.string(),
  footerText: z.string(),
});

export const saveInvoiceSettings = createServerFn({ method: "POST" })
  .validator(invoiceSettingsSchema)
  .handler(async ({ data }) => {
    const payload = {
      ...data,
      primaryColor: normalizeHexColor(data.primaryColor),
    };
    await supabase.from("site_settings").upsert({
      key: SETTINGS_ID,
      data: payload as any,
    });
    return { ok: true };
  });
