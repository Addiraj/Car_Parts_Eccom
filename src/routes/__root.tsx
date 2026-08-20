import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet, Link, createRootRouteWithContext, useRouter, useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { FloatingThemeToggle } from "@/components/floating-theme-toggle";
import { AssistantLauncher } from "@/components/ai-assistant/assistant-launcher";
import { AvatarLauncher } from "@/components/ai-avatar/avatar-launcher";
import { OnboardingGuard } from "@/components/onboarding-guard";
import { Header, Footer } from "@/components/shell";
import { SmoothScroll } from "@/components/smooth-scroll";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { AuthProvider } from "@/hooks/use-auth";

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
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

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
  
  const hideChrome = pathname.startsWith("/auth") || pathname === "/onboarding";
  const disableSmoothScroll = pathname.startsWith("/admin") || pathname.startsWith("/salesman");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {!disableSmoothScroll && <SmoothScroll />}
      
      {/* {!hideChrome && <Header />}
      
      <main className="flex-1">
        {!hideChrome && <div className="h-16 md:h-20" aria-hidden />}
        <Outlet />
      </main> */}



{!hideChrome && <Header />}
<main className="flex-1">
  {!hideChrome && (
    <div
      className="h-[calc(4rem+env(safe-area-inset-top,0px))] md:h-[calc(5rem+env(safe-area-inset-top,0px))]"
      aria-hidden
    />
  )}

  <div className={!hideChrome ? "relative z-0" : ""}>
    <Outlet />
  </div>
</main>
{/* <main className="flex-1">
  {!hideChrome && (
    <div
      className="h-[calc(4rem+env(safe-area-inset-top))] md:h-[calc(5rem+env(safe-area-inset-top))]"
      aria-hidden
    />
  )}
  <Outlet />
</main> */}

      {!hideChrome && <Footer />}
      <FloatingThemeToggle />
      <AssistantLauncher />
      <AvatarLauncher />
      <OnboardingGuard />
      <Toaster theme={theme} richColors position="bottom-center" />
    </div>
  );
}
