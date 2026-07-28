import { useI18n } from "@/lib/i18n";

export function LangToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <button
      onClick={() => setLocale(locale === "en" ? "ar" : "en")}
      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-foreground/80 transition hover:border-white/25 hover:text-foreground"
      aria-label="Toggle language"
    >
      {locale === "en" ? "العربية" : "EN"}
    </button>
  );
}
