import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Send, MessageCircle } from "lucide-react";
import { submitContact } from "@/lib/contact.functions";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { WHATSAPP_NUMBER, getWhatsAppUrl } from "@/components/whatsapp-float";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — Fine Land International" },
      { name: "description", content: "Get in touch with Fine Land International. We're here to help with OEM parts inquiries, fitment questions, and orders across the UAE." },
      { property: "og:title", content: "Contact Us — Fine Land International" },
      { property: "og:description", content: "Reach out for OEM parts inquiries and orders across the UAE." },
    ],
  }),
  component: ContactPage,
});

const Schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().max(40).optional(),
  subject: z.string().trim().min(1, "Subject is required").max(150),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

function ContactPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        name: f.name || (user.user_metadata?.full_name as string) || "",
        email: f.email || user.email || "",
      }));
    }
  }, [user]);

  const mut = useMutation({
    mutationFn: (data: { name: string; email: string; phone?: string | null; subject: string; message: string }) =>
      submitContact({ data }),
    onSuccess: () => {
      toast.success(t("contactSuccess"));
      setForm({ name: user?.email ? form.name : "", email: user?.email || "", phone: "", subject: "", message: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    mut.mutate(parsed.data);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:py-20">
      <div className="text-center">
        <div className="eyebrow">{t("footerSupport")}</div>
        <h1 className="mt-3 font-display text-4xl tracking-tight md:text-5xl">{t("contactUs")}</h1>
        <p className="mt-3 text-sm text-muted-foreground md:text-base">
          {t("contactIntro")}
        </p>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-[1fr_1.5fr]">
        <aside className="space-y-5 rounded-lg border bg-surface p-6">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Address</div>
              <div className="mt-1 text-sm">Dubai, United Arab Emirates</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Email</div>
              <a href="mailto:support@finelandintl.ae" className="mt-1 block text-sm hover:text-primary">support@finelandintl.ae</a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Phone</div>
              <a href={`tel:${WHATSAPP_NUMBER.replace(/\s/g, "")}`} className="mt-1 block text-sm hover:text-primary">{WHATSAPP_NUMBER}</a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MessageCircle className="mt-0.5 h-5 w-5 text-[#25D366]" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">WhatsApp</div>
              <a href={getWhatsAppUrl("Hi, I have an enquiry.")} target="_blank" rel="noreferrer" className="mt-1 block text-sm hover:text-primary">{WHATSAPP_NUMBER}</a>
            </div>
          </div>
        </aside>

        <form onSubmit={submit} className="space-y-4 rounded-lg border bg-surface p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("fullName")} value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Field label={t("email")} type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
            <Field label={t("phone")} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label={t("contactSubject")} value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} required />
          </div>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contactMessage")}</span>
            <textarea
              required
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={6}
              maxLength={2000}
              className="mt-1 w-full rounded-md border bg-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <button
            type="submit"
            disabled={mut.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> {mut.isPending ? t("placing") : t("contactSubmit")}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border bg-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
