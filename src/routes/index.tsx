import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getBrands } from "@/lib/catalog.functions";
import { listActiveBanners, listActiveTestimonials } from "@/lib/cms.functions";
import { useI18n } from "@/lib/i18n";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Shield,
  Truck,
  Award,
  Headphones,
  Star,
} from "lucide-react";
import heroAsset from "@/assets/hero-generic.jpg.asset.json";

const brandsQO = queryOptions({ queryKey: ["brands"], queryFn: () => getBrands() });
const testimonialsQO = queryOptions({ queryKey: ["home-testimonials"], queryFn: () => listActiveTestimonials() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fine Land International — OEM & Aftermarket Car Parts, UAE" },
      { name: "description", content: "Precision OEM & aftermarket parts for BMW, Mercedes-Benz, Honda, Audi, Rolls-Royce & MINI. VIN-verified fitment. Delivered across the UAE in 24 hours." },
      { property: "og:title", content: "Fine Land International — Precision Parts. Delivered." },
      { property: "og:description", content: "The Dubai marketplace for OEM & aftermarket car parts. VIN-verified fitment, 24h delivery." },
      { property: "og:image", content: heroAsset.url },
      { name: "twitter:image", content: heroAsset.url },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(brandsQO),
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  component: Home,
});

type T = ReturnType<typeof useI18n>["t"];

const CAR_BRANDS = ["Rolls-Royce", "Honda", "BMW", "Mercedes-Benz", "MINI"];

/* Shared button styles */
const primaryBtn = "group inline-flex items-center gap-2 rounded-lg px-8 py-4 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.03] shadow-[0_10px_30px_-10px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]";
const primaryBtnStyle = { background: "linear-gradient(135deg, #3B82F6, #6366F1)" } as const;
const secondaryBtn = "inline-flex items-center gap-2 rounded-lg border border-border bg-transparent px-8 py-4 text-sm font-semibold text-foreground transition-all duration-300 hover:border-primary/50 hover:bg-accent/40";

function Home() {
  useSuspenseQuery(brandsQO);
  const { t } = useI18n();

  return (
    <div className="-mt-16 bg-background text-foreground md:-mt-20">
      <Hero t={t} />
      <BrandMarquee t={t} />
      <WhyFineLand t={t} />
      <ShopByBrand t={t} />
      <VinDecoderBanner t={t} />
      <CatalogPreview t={t} />
      <Testimonials t={t} />
      <StatsCounters t={t} />
      <FinalCta t={t} />
    </div>
  );
}

/* ─────────────── useInView ─────────────── */

function useInView<E extends Element>(options?: IntersectionObserverInit) {
  const ref = useRef<E | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) { setInView(true); io.disconnect(); break; }
      },
      { threshold: 0.15, ...options },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, options]);
  return { ref, inView };
}

/* ─────────────── 1. Hero (always dark — cinematic backdrop) ─────────────── */

function Hero({ t }: { t: T }) {
  const getBannersFn = useServerFn(listActiveBanners);
  const { data: banners = [] } = useQuery({
    queryKey: ["home-banners"],
    queryFn: () => getBannersFn(),
  });

  const activeBanner = (banners as any[]).length > 0 ? banners[0] : null;
  const bgImage = activeBanner?.image_url || heroAsset.url;
  const title = activeBanner?.title || t("Your Trusted Source for Genuine Car Parts Across the UAE");
  const subtitle = activeBanner?.subtitle || t("OEM & aftermarket components for BMW, Mercedes-Benz, Honda, Rolls-Royce & MINI. VIN-verified compatibility. Shipped across the UAE.");
  const ctaLabel = activeBanner?.cta_label || t("Explore Catalog");
  const ctaUrl = activeBanner?.cta_url || "/catalog";

  return (
    <section className="relative flex min-h-[100svh] w-full items-center overflow-hidden bg-background text-foreground dark:bg-[#0a0a0a] dark:text-white">
      <div className="absolute inset-0">
        <img
          src={bgImage}
          alt=""
          className="ken-burns h-full w-full object-cover opacity-85 dark:opacity-95 transition-opacity duration-700"
        />
        {/* Light mode overlay — clear backdrop gradient */}
        <div
          className="absolute inset-0 dark:hidden"
          style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.65) 50%, rgba(255,255,255,0.25) 100%)" }}
        />
        {/* Dark mode overlay — cinematic dark gradient */}
        <div
          className="absolute inset-0 hidden dark:block"
          style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.2) 100%)" }}
        />
      </div>

      <div className="relative z-10 w-full pl-[6%] pr-6 md:pl-[8%]">
        <div className="max-w-[720px]">
          <div
            className="animate-fade-in text-[0.75rem] font-medium uppercase text-muted-foreground dark:text-white/60"
            style={{ letterSpacing: "0.25em", animationDuration: "0.8s" }}
          >
            {t("FINE LAND INTERNATIONAL · DUBAI")}
          </div>

          <h1
            className="font-display mt-6 font-bold leading-[1.08] tracking-[-0.02em]"
            style={{ fontSize: "clamp(2.6rem, 5.2vw, 4.8rem)" }}
          >
            <span
              className="block animate-fade-in text-foreground opacity-0 dark:text-white"
              style={{ animationDelay: "0.2s", animationFillMode: "forwards", animationDuration: "0.8s" }}
            >
              {title}
            </span>
          </h1>

          <p
            className="mt-6 max-w-[520px] animate-fade-in text-[1.05rem] leading-relaxed text-muted-foreground opacity-0 dark:text-white/70 md:text-[1.15rem]"
            style={{ animationDelay: "0.75s", animationFillMode: "forwards", animationDuration: "0.9s" }}
          >
            {subtitle}
          </p>

          <div
            className="mt-10 flex flex-wrap items-center gap-4 animate-fade-in opacity-0"
            style={{ animationDelay: "0.95s", animationFillMode: "forwards", animationDuration: "0.9s" }}
          >
            <Link to={ctaUrl as any} className={primaryBtn} style={primaryBtnStyle}>
              {ctaLabel}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <Link
              to="/vin"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-transparent px-8 py-4 text-sm font-semibold text-foreground transition-all duration-300 hover:border-primary/60 hover:bg-accent/40 dark:border-white/20 dark:text-white dark:hover:border-[#6366F1]/60 dark:hover:bg-white/[0.05]"
            >
              {t("Decode My VIN")}
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-8 z-10 flex flex-col items-center gap-2">
        <span className="text-[0.65rem] uppercase text-muted-foreground dark:text-white/40" style={{ letterSpacing: "0.35em" }}>
          {t("SCROLL")}
        </span>
        <ChevronDown className="h-4 w-4 animate-bounce text-muted-foreground dark:text-white/40" />
      </div>
    </section>
  );
}

/* ─────────────── 2. Brand Marquee ─────────────── */

function BrandMarquee({ t }: { t: T }) {
  const items = [...CAR_BRANDS, ...CAR_BRANDS];
  return (
    <section className="border-y border-border bg-surface py-14">
      <div className="mb-8 text-center">
        <span
          className="text-[0.7rem] font-medium uppercase text-muted-foreground"
          style={{ letterSpacing: "0.28em" }}
        >
          {t("AUTHORIZED OEM BRANDS")}
        </span>
      </div>
      <div className="relative w-full overflow-hidden">
        <div className="marquee-track flex w-max gap-16 whitespace-nowrap px-8">
          {items.map((b, i) => (
            <span
              key={`${b}-${i}`}
              className="cursor-default text-[1.25rem] font-light uppercase text-foreground opacity-40 transition-opacity duration-300 hover:opacity-100"
              style={{ letterSpacing: "0.2em" }}
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────── 3. Why Fine Land? ─────────────── */

const WHY_CARDS = [
  { icon: Shield, title: "VIN-Verified Fit", body: "Every part is cross-referenced against your vehicle's VIN number for guaranteed OEM compatibility. No guesswork." },
  { icon: Truck, title: "UAE-Wide Delivery", body: "Fast, reliable shipping across all Emirates — Dubai, Abu Dhabi, Sharjah & beyond. Same-day dispatch on in-stock items." },
  { icon: Award, title: "OEM & Aftermarket", body: "Genuine OEM parts from authorized sources alongside premium aftermarket alternatives at competitive prices." },
  { icon: Headphones, title: "Expert Support", body: "Our automotive specialists help you find the exact right part via WhatsApp, phone, or our AI-powered chatbot." },
] as const;

function WhyFineLand({ t }: { t: T }) {
  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="text-center">
          <div className="text-[0.75rem] font-medium uppercase text-muted-foreground" style={{ letterSpacing: "0.28em" }}>
            {t("WHY CHOOSE US")}
          </div>
          <h2 className="mt-3 text-[2.5rem] font-bold text-foreground">{t("Why Fine Land?")}</h2>
          <div
            className="mx-auto mt-4 h-[3px] w-[60px] rounded-full"
            style={{ background: "linear-gradient(90deg, #3B82F6, #6366F1)" }}
          />
        </div>

        <div
          className="mt-14 grid gap-6"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
        >
          {WHY_CARDS.map((c, i) => (
            <WhyCard key={c.title} card={c} index={i} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyCard({ card, index, t }: { card: typeof WHY_CARDS[number]; index: number; t: T }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const Icon = card.icon;
  return (
    <div
      ref={ref}
      className="group rounded-xl border border-border bg-card p-8 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-[0_20px_40px_-20px_rgba(59,130,246,0.35)]"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 0.6s ease-out ${index * 0.1}s, transform 0.6s ease-out ${index * 0.1}s, border-color 0.3s ease, box-shadow 0.3s ease`,
      }}
    >
      <div
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg"
        style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.15))" }}
      >
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="mt-6 text-[1.2rem] font-semibold text-foreground">{t(card.title)}</h3>
      <p className="mt-3 text-[0.9rem] leading-relaxed text-muted-foreground">{t(card.body)}</p>
    </div>
  );
}

/* ─────────────── 4. Shop by Brand ─────────────── */

function ShopByBrand({ t }: { t: T }) {
  const brandSlug = (n: string) => n.toLowerCase().replace(/\s+/g, "-");
  return (
    <section className="bg-surface py-24">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="text-center">
          <div className="text-[0.75rem] font-medium uppercase text-muted-foreground" style={{ letterSpacing: "0.28em" }}>
            {t("OUR CATALOG")}
          </div>
          <h2 className="mt-3 text-[2.5rem] font-bold text-foreground">{t("Shop by Brand")}</h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {CAR_BRANDS.map((b, i) => (
            <BrandCard key={b} name={b} slug={brandSlug(b)} index={i} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BrandCard({ name, slug, index, t }: { name: string; slug: string; index: number; t: T }) {
  const { ref, inView } = useInView<HTMLAnchorElement>();
  return (
    <Link
      ref={ref}
      to="/catalog/$brand"
      params={{ brand: slug }}
      className="group relative flex items-center justify-center overflow-hidden rounded-xl border border-border bg-card text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_40px_-20px_rgba(59,130,246,0.4)]"
      style={{
        aspectRatio: "16 / 10",
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(30px)",
        transition: `opacity 0.6s ease-out ${index * 0.08}s, transform 0.6s ease-out ${index * 0.08}s, border-color 0.3s ease, box-shadow 0.3s ease`,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center whitespace-nowrap font-bold uppercase text-foreground opacity-[0.04]"
        style={{ fontSize: "clamp(4rem, 12vw, 8rem)", letterSpacing: "-0.04em" }}
      >
        {name}
      </span>
      <div className="relative z-10 flex flex-col items-center gap-2">
        <span className="text-[1.5rem] font-semibold text-foreground">{name}</span>
        <span className="inline-flex items-center gap-1 text-[0.85rem] font-medium text-primary">
          {t("Browse Parts")} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

/* ─────────────── 5. VIN Decoder Banner ─────────────── */

function VinDecoderBanner({ t }: { t: T }) {
  return (
    <section className="relative w-full overflow-hidden bg-background py-28">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          opacity: 0.05,
          color: "var(--color-primary)",
        }}
      />
      <div className="relative z-10 mx-auto grid max-w-[1200px] items-center gap-14 px-6 md:grid-cols-2">
        <div>
          <div className="text-[0.75rem] font-medium uppercase text-primary" style={{ letterSpacing: "0.28em" }}>
            {t("VIN DECODER")}
          </div>
          <h2 className="mt-3 font-bold leading-[1.1] text-foreground" style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>
            {t("Know Your VIN?")}
          </h2>
          <p className="mt-5 max-w-[500px] text-[1rem] leading-relaxed text-muted-foreground">
            {t("Enter your 17-character Vehicle Identification Number and we'll instantly show you every compatible part from our catalog. Works for BMW, Mercedes-Benz, Honda, Rolls-Royce & MINI.")}
          </p>
          <Link to="/vin" className={`mt-8 ${primaryBtn}`} style={primaryBtnStyle}>
            {t("Decode VIN Now")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <Link
          to="/vin"
          className="relative hidden overflow-hidden rounded-xl border border-primary/30 bg-card p-6 md:block"
          style={{ animation: "vinGlowPulse 3s ease-in-out infinite" }}
        >
          <style>{`
            @keyframes vinGlowPulse {
              0%, 100% { box-shadow: 0 0 0 1px rgba(59,130,246,0.15), 0 10px 40px -10px rgba(59,130,246,0.15); }
              50% { box-shadow: 0 0 0 1px rgba(59,130,246,0.35), 0 10px 60px -10px rgba(59,130,246,0.35); }
            }
            @keyframes vinCaretBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
          `}</style>
          <div className="text-[0.7rem] font-medium uppercase text-muted-foreground" style={{ letterSpacing: "0.2em" }}>
            {t("Vehicle Identification Number")}
          </div>
          <div className="mt-3 flex items-center gap-1 font-mono text-[1.35rem] font-medium tracking-widest text-foreground">
            <span>WBAPH5C55BA</span>
            <span className="text-muted-foreground">••••••</span>
            <span
              className="ml-1 inline-block h-6 w-[2px] bg-primary"
              style={{ animation: "vinCaretBlink 1s steps(1) infinite" }}
            />
          </div>
          <div className="mt-4 flex items-center gap-2 text-[0.9rem] font-medium" style={{ color: "#22C55E" }}>
            <span>✓</span>
            <span>{t("Compatible parts found: 847")}</span>
          </div>
        </Link>
      </div>
    </section>
  );
}

/* ─────────────── 6. Catalog Preview ─────────────── */

const CATEGORY_PILLS = [
  "Engine Components",
  "Braking System",
  "Suspension & Steering",
  "Body & Exterior",
  "Electrical & Lighting",
  "Transmission & Drivetrain",
];

function CatalogPreview({ t }: { t: T }) {
  return (
    <section className="bg-surface py-24">
      <div className="mx-auto grid max-w-[1200px] items-center gap-14 px-6 md:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="text-[0.75rem] font-medium uppercase text-muted-foreground" style={{ letterSpacing: "0.28em" }}>
            {t("FULL CATALOG")}
          </div>
          <h2 className="mt-3 font-bold leading-[1.05] text-foreground" style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>
            {t("Every part,")}{" "}
            <span
              className="italic"
              style={{
                background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {t("all of it.")}
            </span>
          </h2>
          <p className="mt-5 max-w-[480px] text-muted-foreground">
            {t("Browse our full inventory of OEM and aftermarket spare parts across 5 premium brands.")}
          </p>
          <Link to="/products" className={`mt-8 ${primaryBtn}`} style={primaryBtnStyle}>
            {t("View All Products")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="flex flex-wrap gap-3">
          {CATEGORY_PILLS.map((c) => (
            <Link
              key={c}
              to="/catalog"
              className="rounded-full border border-border bg-card px-5 py-2.5 text-[0.85rem] font-medium text-foreground transition-all duration-300 hover:border-primary/50 hover:bg-primary/10"
            >
              {t(c)}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────── 7. Testimonials Carousel ─────────────── */

type TestimonialRow = {
  id: string;
  author_name: string;
  author_role: string | null;
  avatar_url: string | null;
  rating: number;
  quote: string;
  display_order: number;
};

function Testimonials({ t }: { t: T }) {
  const getTestimonialsFn = useServerFn(listActiveTestimonials);
  const { data = [] } = useQuery({ queryKey: ["home-testimonials"], queryFn: () => getTestimonialsFn() });
  const items = data as TestimonialRow[];
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = items.length;

  useEffect(() => {
    if (paused || n <= 1) return;
    const id = setInterval(() => setI((v) => (v + 1) % n), 5000);
    return () => clearInterval(id);
  }, [paused, n]);

  useEffect(() => { if (i >= n && n > 0) setI(0); }, [n, i]);

  if (n === 0) return null;

  const prev = () => setI((v) => (v - 1 + n) % n);
  const next = () => setI((v) => (v + 1) % n);

  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="text-center">
          <div className="text-[0.75rem] font-medium uppercase text-muted-foreground" style={{ letterSpacing: "0.28em" }}>
            {t("TESTIMONIALS")}
          </div>
          <h2 className="mt-3 text-[2.5rem] font-bold text-foreground">
            {t("Trusted by Garages & Owners Across the UAE")}
          </h2>
        </div>

        <div
          className="relative mt-14"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-700 ease-out"
              style={{ transform: `translateX(-${i * 100}%)` }}
            >
              {items.map((tm) => (
                <div key={tm.id} className="w-full flex-shrink-0 px-2 md:px-6">
                  <div className="relative mx-auto max-w-[780px] rounded-xl border border-border bg-card p-8 shadow-sm md:p-12">
                    <div className="pointer-events-none absolute left-6 top-2 font-serif text-[5rem] leading-none text-primary/15">
                      ❝
                    </div>
                    <p className="relative text-[1.1rem] italic leading-relaxed text-foreground">
                      {tm.quote}
                    </p>
                    <div className="mt-6 flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star
                          key={s}
                          className="h-4 w-4"
                          style={{
                            color: s < tm.rating ? "#F59E0B" : "var(--color-muted-foreground)",
                            fill: s < tm.rating ? "#F59E0B" : "transparent",
                            opacity: s < tm.rating ? 1 : 0.3,
                          }}
                        />
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      {tm.avatar_url && (
                        <img src={tm.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                      )}
                      <div>
                        <div className="text-[0.95rem] font-semibold text-foreground">{tm.author_name}</div>
                        {tm.author_role && <div className="text-[0.85rem] text-muted-foreground">{tm.author_role}</div>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {n > 1 && (
            <>
              <button
                onClick={prev}
                aria-label="Previous"
                className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full border border-border bg-card p-2.5 text-foreground shadow-sm transition hover:border-primary/60 hover:bg-accent"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={next}
                aria-label="Next"
                className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full border border-border bg-card p-2.5 text-foreground shadow-sm transition hover:border-primary/60 hover:bg-accent"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="mt-8 flex justify-center gap-2">
                {items.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setI(idx)}
                    aria-label={`Go to testimonial ${idx + 1}`}
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: idx === i ? 28 : 8,
                      background: idx === i ? "linear-gradient(90deg, #3B82F6, #6366F1)" : "var(--color-border)",
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─────────────── 8. Stats ─────────────── */

const STATS: { target: number; suffix?: string; display?: string; label: string }[] = [
  { target: 15000, suffix: "+", label: "Parts in Catalog" },
  { target: 3500, suffix: "+", label: "Happy Customers" },
  { target: 5, label: "Premium Brands" },
  { target: 0, display: "24hr", label: "Average Dispatch" },
];

function StatsCounters({ t }: { t: T }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <section className="relative w-full border-y border-border bg-primary/[0.03] py-20">
      <div ref={ref} className="mx-auto max-w-[1200px] px-6">
        <div className="grid grid-cols-2 gap-y-10 md:grid-cols-4 md:gap-y-0">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center border-border text-center md:border-r md:last:border-r-0"
            >
              <div className="font-bold leading-none text-foreground tabular-nums" style={{ fontSize: "clamp(2.25rem, 4.5vw, 3rem)" }}>
                {s.display ? (
                  <span
                    className="inline-block transition-opacity duration-1000"
                    style={{ opacity: inView ? 1 : 0 }}
                  >
                    {s.display}
                  </span>
                ) : (
                  <CountUp target={s.target} start={inView} suffix={s.suffix} />
                )}
              </div>
              <div
                className="mt-4 text-[0.8rem] font-medium uppercase text-muted-foreground"
                style={{ letterSpacing: "0.15em" }}
              >
                {t(s.label)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CountUp({ target, start, suffix = "" }: { target: number; start: boolean; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start) return;
    const duration = 2000;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.floor(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target]);
  return <span>{n.toLocaleString()}{suffix}</span>;
}

/* ─────────────── 9. Final CTA ─────────────── */

function FinalCta({ t }: { t: T }) {
  return (
    <section className="relative overflow-hidden bg-background py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full"
        style={{ background: "#3B82F6", opacity: 0.12, filter: "blur(120px)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full"
        style={{ background: "#8B5CF6", opacity: 0.12, filter: "blur(120px)" }}
      />
      <div className="relative z-10 mx-auto max-w-[600px] px-6 text-center">
        <h2 className="font-bold leading-tight text-foreground" style={{ fontSize: "clamp(2rem, 4vw, 2.5rem)" }}>
          {t("Ready to Find Your Part?")}
        </h2>
        <p className="mt-5 text-[1rem] leading-relaxed text-muted-foreground">
          {t("Explore our catalog of 15,000+ parts or let our VIN decoder find the perfect match for your vehicle.")}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link to="/catalog" className={primaryBtn} style={primaryBtnStyle}>
            {t("Enter the Catalog")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link to="/contact" className={secondaryBtn}>
            {t("Contact Us")}
          </Link>
        </div>
      </div>
    </section>
  );
}
