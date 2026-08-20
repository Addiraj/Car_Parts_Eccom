import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Search, ShoppingCart, User, Wrench, Heart, LayoutDashboard, Menu, X, Package, LogOut, Hash, Barcode, MessageCircle, Briefcase } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { LangToggle } from "@/components/lang-toggle";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

import { checkIsAdmin } from "@/lib/admin.functions";
import { getMyRoleInfo } from "@/lib/admin.salesmen.functions";
import { getMyCartCount, getMyWishlistCount } from "@/lib/account.functions";
import { getFooterSettings } from "@/lib/cms.functions";
import { cn } from "@/lib/utils";
import { useLoginLinkProps } from "@/lib/redirect";
import { WHATSAPP_NUMBER, getWhatsAppUrl } from "@/components/whatsapp-float";

const ease = [0.22, 1, 0.36, 1] as const;

function CountBadge({ n }: { n: number }) {
  const label = n > 9 ? "9+" : String(n);
  return (
    <span
      aria-label={`${n}`}
      className="pointer-events-none absolute -end-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-background"
    >
      {label}
    </span>
  );
}

const NAV_LINKS = [
  { to: "/catalog" as const, key: "catalog" as const },
  { to: "/products" as const, key: "products" as const },
  { to: "/vin" as const, key: "vinSearch" as const },
  { to: "/special-offers" as const, key: "specialOffers" as const },
  { to: "/garage" as const, key: "myGarage" as const },
  { to: "/contact" as const, key: "contact" as const },
];

export function Header() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const checkAdmin = useServerFn(checkIsAdmin);
  const { data: adminData } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: () => checkAdmin(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  const isAdmin = !!adminData?.isAdmin;
  const roleFn = useServerFn(getMyRoleInfo);
  const { data: roleInfo } = useQuery({
    queryKey: ["my-role-info", user?.id],
    queryFn: () => roleFn(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  const isSalesman = !!(roleInfo as any)?.isSalesman;

  const cartCountFn = useServerFn(getMyCartCount);
  const wishCountFn = useServerFn(getMyWishlistCount);
  const { data: cartCountData } = useQuery({
    queryKey: ["cart-count", user?.id],
    queryFn: () => cartCountFn(),
    enabled: !!user,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
  const { data: wishCountData } = useQuery({
    queryKey: ["wishlist-count", user?.id],
    queryFn: () => wishCountFn(),
    enabled: !!user,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
  const cartCount = Number((cartCountData as any)?.count ?? 0);
  const wishCount = Number((wishCountData as any)?.count ?? 0);

  const navigate = useNavigate();
  const loginLink = useLoginLinkProps();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); setSearchOpen(false); }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
      if (e.key === "Escape") { setSearchOpen(false); setMobileOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease }}
       // className={cn(
        //   "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        //   scrolled ? "glass-strong" : "bg-transparent",
        // )}
      className={cn(
  "fixed inset-x-0 top-0 z-50 transition-all duration-500 pt-[env(safe-area-inset-top,0px)]",
  scrolled ? "glass-strong" : "bg-transparent",
)}

      >
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-6 px-5 md:h-20 md:px-10">
          {/* Brand */}
          <Link to="/" className="group flex items-baseline gap-2">
            <span className="font-display text-base font-medium tracking-tight md:text-lg">FINE&nbsp;LAND</span>
            <span className="hidden text-[10px] uppercase tracking-[0.28em] text-muted-foreground transition group-hover:text-primary md:inline">International</span>
          </Link>

          {/* Centered nav */}
          <nav className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((l) => {
              const active = pathname.startsWith(l.to);
              return (
                <Link key={l.to} to={l.to} className="group relative text-[12px] uppercase tracking-[0.22em] text-foreground/80 transition hover:text-foreground">
                  {t(l.key)}
                  <span className={cn(
                    "absolute -bottom-1.5 left-0 h-px w-full origin-left bg-primary transition-transform duration-700",
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                  )} style={{ transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)" }} />
                </Link>
              );
            })}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label={t("search")}
              className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs text-muted-foreground transition hover:border-white/25 hover:text-foreground md:px-4"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("searchShort")}</span>
              <kbd className="ml-2 hidden rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline">⌘K</kbd>
            </button>

            <div className="hidden md:block"><LangToggle /></div>



            <Link to="/wishlist" aria-label={t("wishlist")} className="relative hidden h-10 w-10 items-center justify-center rounded-full text-foreground/80 hover:text-foreground md:inline-flex">
              <Heart className="h-4 w-4" />
              {wishCount > 0 && <CountBadge n={wishCount} />}
            </Link>
            <Link to="/cart" aria-label={t("cart")} className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 hover:text-foreground">
              <ShoppingCart className="h-4 w-4" />
              {cartCount > 0 && <CountBadge n={cartCount} />}
            </Link>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger aria-label={t("account")} className="hidden h-10 w-10 items-center justify-center rounded-full text-foreground/80 hover:text-foreground md:inline-flex">
                  <User className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate text-xs text-muted-foreground">{(user as any)?.email ?? t("account")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/account"><User className="me-2 h-4 w-4" /> {t("account")}</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/garage"><Wrench className="me-2 h-4 w-4" /> {t("myGarage")}</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/orders"><Package className="me-2 h-4 w-4" /> {t("orders")}</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/wishlist"><Heart className="me-2 h-4 w-4" /> {t("wishlist")}</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/cart"><ShoppingCart className="me-2 h-4 w-4" /> {t("cart")}</Link></DropdownMenuItem>
                  {(isAdmin || isSalesman) && <DropdownMenuSeparator />}
                  {isAdmin && (
                    <DropdownMenuItem asChild><Link to="/admin"><LayoutDashboard className="me-2 h-4 w-4" /> {t("admin.title")}</Link></DropdownMenuItem>
                  )}
                  {isSalesman && (
                    <DropdownMenuItem asChild><Link to="/salesman"><Briefcase className="me-2 h-4 w-4" /> {t("salesman.portal")}</Link></DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      logout();
                      toast.success(t("signOut"));
                      navigate({ to: "/" });
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="me-2 h-4 w-4" /> {t("signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link {...loginLink} className="hidden h-10 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-4 text-xs uppercase tracking-wider text-foreground/90 hover:border-primary hover:text-primary md:inline-flex">
                <User className="h-3.5 w-3.5" /> {t("signIn")}
              </Link>
            )}

            <button onClick={() => setMobileOpen(true)} aria-label="Menu" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 hover:text-foreground lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      </AnimatePresence>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && <MobileMenu onClose={() => setMobileOpen(false)} isAdmin={isAdmin} user={user} cartCount={cartCount} wishCount={wishCount} />}
      </AnimatePresence>
    </>
  );
}

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"vin" | "part">("part");
  const [value, setValue] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    if (mode === "vin") navigate({ to: "/vin", search: { vin: v } as any });
    else navigate({ to: "/search", search: { q: v } });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease }}
      className="fixed inset-0 z-[60] flex items-start justify-center bg-background/85 backdrop-blur-2xl"
      onClick={onClose}
    >
      <motion.form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
        transition={{ duration: 0.6, ease, delay: 0.05 }}
        className="mx-auto mt-32 w-full max-w-3xl px-6"
      >
        <div className="eyebrow mb-4 text-center">{t("findYourPart")}</div>

        <div className="mb-5 flex justify-center gap-2">
          <button type="button" onClick={() => setMode("part")}
            className={cn("inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.18em] transition",
              mode === "part" ? "border-primary bg-primary/10 text-primary" : "border-white/10 bg-white/[0.04] text-muted-foreground hover:text-foreground")}>
            <Barcode className="h-3.5 w-3.5" /> {t("searchByPart")}
          </button>
          <button type="button" onClick={() => setMode("vin")}
            className={cn("inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.18em] transition",
              mode === "vin" ? "border-primary bg-primary/10 text-primary" : "border-white/10 bg-white/[0.04] text-muted-foreground hover:text-foreground")}>
            <Hash className="h-3.5 w-3.5" /> {t("searchByVin")}
          </button>
        </div>

        <div className="flex items-center gap-4 border-b border-white/15 pb-4">
          <Search className="h-6 w-6 text-muted-foreground" />
          <input
            value={value} onChange={(e) => setValue(e.target.value)} autoFocus
            placeholder={mode === "vin" ? t("vinPlaceholder") : t("partPlaceholder")}
            className="flex-1 bg-transparent font-display text-2xl tracking-tight text-foreground outline-none placeholder:text-muted-foreground md:text-4xl"
          />
          <button type="button" onClick={onClose} className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">Esc</button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function MobileMenu({ onClose, isAdmin, user, cartCount, wishCount }: { onClose: () => void; isAdmin: boolean; user: unknown; cartCount: number; wishCount: number }) {
  const { t } = useI18n();
  const loginLink = useLoginLinkProps();
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease }}
      className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-2xl"
    >
      <div className="flex h-[calc(4rem+env(safe-area-inset-top,0px))] items-end justify-between px-5 pb-2 pt-[env(safe-area-inset-top,0px)]">
        <span className="font-display text-base">FINE LAND</span>
        <button onClick={onClose} className="h-10 w-10 rounded-full text-foreground/80 hover:text-foreground"><X className="mx-auto h-5 w-5" /></button>
      </div>
      <motion.nav
        initial="hidden" animate="show"
        variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } }}
        className="flex flex-col gap-2 px-5 pt-8"
      >
        {NAV_LINKS.map((l) => (
          <motion.div key={l.to}
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } }}>
            <Link to={l.to} className="block py-3 font-display text-4xl tracking-tight hover:text-primary" onClick={onClose}>{t(l.key)}</Link>
          </motion.div>
        ))}
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } }} className="mt-8 flex items-center gap-3 border-t border-white/10 pt-6">
          <LangToggle />

          <Link to="/wishlist" onClick={onClose} className="relative ms-auto inline-flex items-center gap-2 text-sm">
            <Heart className="h-4 w-4" /> {t("wishlist")}
            {wishCount > 0 && <CountBadge n={wishCount} />}
          </Link>
          <Link to="/cart" onClick={onClose} className="relative inline-flex items-center gap-2 text-sm">
            <ShoppingCart className="h-4 w-4" /> {t("cart")}
            {cartCount > 0 && <CountBadge n={cartCount} />}
          </Link>
          {user ? (
            <Link to="/account" onClick={onClose} className="inline-flex items-center gap-2 text-sm"><User className="h-4 w-4" /> {t("account")}</Link>
          ) : (
            <Link {...loginLink} onClick={onClose} className="inline-flex items-center gap-2 text-sm"><User className="h-4 w-4" /> {t("signIn")}</Link>
          )}
        </motion.div>
      </motion.nav>
    </motion.div>
  );
}

export function Footer() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const currentPath = pathname + searchStr;
  const loginHref = currentPath && !currentPath.startsWith("/auth")
    ? `/auth/login?redirect=${encodeURIComponent(currentPath)}`
    : "/auth/login";
  const { data: cms } = useQuery({
    queryKey: ["cms-footer"],
    queryFn: () => getFooterSettings(),
    staleTime: 60_000,
  });
  const f: any = cms ?? {};
  const brandName = f.brand_name ?? "Fine Land International";
  const tagline = f.tagline ?? t("footerTagline");
  const address = f.address ?? "Dubai, United Arab Emirates";
  const email = f.email ?? "support@fineland.ae";
  const phone = f.phone ?? WHATSAPP_NUMBER;
  const copyright = f.copyright ?? `© ${new Date().getFullYear()} Fine Land International — Dubai Parts OEM Catalog UAE.`;
  const shopLinks = Array.isArray(f.shop_links) && f.shop_links.length
    ? f.shop_links
    : [
        { to: "/catalog", label: t("catalog") },
        { to: "/vin", label: t("vinSearch") },
        { to: "/garage", label: t("myGarage") },
      ];
  const accountLinksRaw: { to: string; label: string }[] = Array.isArray(f.account_links) && f.account_links.length
    ? f.account_links
    : [
        { to: "/auth/login", label: t("signIn") },
        { to: "/cart", label: t("cart") },
        { to: "/wishlist", label: t("wishlist") },
      ];
  const accountLinks = accountLinksRaw.map((l) =>
    l.to === "/auth/login" ? { ...l, to: loginHref } : l,
  );
  return (
    <footer className="relative mt-32 border-t border-white/5 bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="mx-auto max-w-[1400px] px-5 pt-16 pb-10 md:px-10">
        <div className="grid gap-12 md:grid-cols-[1.4fr,2fr]">
          <div>
            <div className="eyebrow">{t("oemCatalog")}</div>
            <div className="mt-3 font-display text-3xl tracking-tight md:text-4xl">{brandName}</div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">{tagline}</p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <FooterCol title={t("footerShop")} links={shopLinks} />
            <FooterCol title={t("footerAccount")} links={accountLinks} />
            <div>
              <div className="eyebrow">{t("footerSupport")}</div>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li><Link to="/contact" className="link-underline text-foreground/85 hover:text-foreground">{t("contactUs")}</Link></li>
                <li>{address}</li>
                <li>{email}</li>
                <li><a href={`tel:${String(phone).replace(/\s/g, "")}`} className="hover:text-foreground">{phone}</a></li>
                <li>
                  <a
                    href={getWhatsAppUrl("Hi, I have an enquiry.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(getWhatsAppUrl("Hi, I have an enquiry."), "_blank", "noopener,noreferrer");
                      e.preventDefault();
                    }}
                    className="relative z-10 inline-flex cursor-pointer items-center gap-1.5 text-[#25D366] hover:text-[#25D366]/80"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> {t("Chat on WhatsApp")}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-6 border-t border-white/5 pt-8 text-xs text-muted-foreground md:flex-row md:items-center">
          <div>{copyright}</div>
          <div className="font-mono uppercase tracking-[0.22em]">Crafted in Dubai · {t("rightsReserved")}</div>
        </div>
      </div>

      <div className="relative overflow-hidden">
        <div aria-hidden className="select-none whitespace-nowrap font-display text-[18vw] font-medium leading-[0.85] tracking-tighter text-foreground/[0.04]">
          {brandName.toUpperCase()}
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <div className="eyebrow">{title}</div>
      <ul className="mt-4 space-y-3 text-sm">
        {links.map((l, i) => (
          <li key={`${l.to}-${i}`}>
            <a href={l.to} className="link-underline text-foreground/85 hover:text-foreground">{l.label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

