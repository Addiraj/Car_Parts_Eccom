import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet, Link, createRootRouteWithContext, useRouter, useRouterState,
  HeadContent, Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { FloatingThemeToggle } from "@/components/floating-theme-toggle";
import { AssistantLauncher } from "@/components/ai-assistant/assistant-launcher";
import { AvatarLauncher } from "@/components/ai-avatar/avatar-launcher";
import { OnboardingGuard } from "@/components/onboarding-guard";

import appCss from "../styles.css?url";
import { Header, Footer } from "@/components/shell";
import { SmoothScroll } from "@/components/smooth-scroll";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { ThemeProvider, useTheme, themeInitScript } from "@/lib/theme";
import { AuthProvider } from "@/hooks/use-auth";
import faviconAsset from "@/assets/favicon.png.asset.json";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Car Parts Dubai — OEM &amp; Aftermarket Spare Parts UAE" },
      { name: "description", content: "Find genuine OEM and aftermarket car parts in Dubai. VIN search, interactive parts diagrams, fast UAE shipping." },
      { property: "og:title", content: "Car Parts Dubai — OEM &amp; Aftermarket Spare Parts UAE" },
      { property: "og:description", content: "Find genuine OEM and aftermarket car parts in Dubai. VIN search, interactive parts diagrams, fast UAE shipping." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Car Parts Dubai — OEM &amp; Aftermarket Spare Parts UAE" },
      { name: "twitter:description", content: "Find genuine OEM and aftermarket car parts in Dubai. VIN search, interactive parts diagrams, fast UAE shipping." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/1b504ed2-e944-4af9-84a0-73924ef10b1d" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/1b504ed2-e944-4af9-84a0-73924ef10b1d" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: faviconAsset.url },
      { rel: "apple-touch-icon", href: faviconAsset.url },
      { rel: "preconnect", href: "https://api.fontshare.com" },
      { rel: "preconnect", href: "https://cdn.fontshare.com", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://images.unsplash.com" },
      { rel: "stylesheet", href: "https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&f[]=satoshi@400,500,700&display=swap" },
      { rel: "stylesheet", href: "https://api.fontshare.com/v2/css?f[]=neue-montreal@400,500,700&display=swap" },
      { rel: "stylesheet", href: "https://api.fontshare.com/v2/css?f[]=jetbrains-mono@400,500&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body className="overflow-x-hidden bg-background text-foreground" suppressHydrationWarning>{children}<Scripts /></body>
    </html>
  );
}

function HtmlDirSync() {
  const { locale, dir } = useI18n();
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = dir;
    }
  }, [locale, dir]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <HtmlDirSync />
            <InnerShell />
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function InnerShell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme } = useTheme();
  useEffect(() => {
    // Supabase auth listener removed. 
    // We now use global AuthProvider context.
  }, [router, queryClient]);
  const hideChrome = pathname.startsWith("/auth") || pathname === "/onboarding";
  const disableSmoothScroll = pathname.startsWith("/admin") || pathname.startsWith("/salesman");
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {!disableSmoothScroll && <SmoothScroll />}
      {!hideChrome && <Header />}
      <main className="flex-1">{!hideChrome && <div className="h-16 md:h-20" aria-hidden />}<Outlet /></main>
      {!hideChrome && <Footer />}
      <FloatingThemeToggle />
      <AssistantLauncher />
      <AvatarLauncher />
      <OnboardingGuard />

      <Toaster theme={theme} richColors position="bottom-center" />
    </div>
  );
}

