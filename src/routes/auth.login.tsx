import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { login } from "@/lib/auth.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { ensureDemoAdmin, ensureDemoSuperAdmin } from "@/lib/demo.functions";
import { getMyRoleInfo } from "@/lib/admin.salesmen.functions";
import { logLogin } from "@/lib/security.functions";
import { useI18n } from "@/lib/i18n";
import { getSafeRedirect } from "@/lib/redirect";

const loginSearchSchema = z.object({
  redirect: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/auth/login")({
  validateSearch: zodValidator(loginSearchSchema),
  head: () => ({ meta: [{ title: "Sign in — Car Parts Dubai" }] }),
  component: Login,
});

function Login() {
  const { t } = useI18n();
  const { redirect: redirectRaw } = Route.useSearch();
  const redirectTo = getSafeRedirect(redirectRaw);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [superLoading, setSuperLoading] = useState(false);
  const [unverified, setUnverified] = useState<string | null>(null);
  const navigate = useNavigate();
  const ensureDemo = useServerFn(ensureDemoAdmin);
  const ensureSuper = useServerFn(ensureDemoSuperAdmin);
  const submitLogin = useServerFn(login);
  const { setAuth } = useAuth();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setUnverified(null);
    
    try {
      const result = await submitLogin({ data: { email, password } });
      setAuth(result.token, result.user);
    } catch (error: any) {
      setLoading(false);
      return toast.error(error.message || "Invalid email or password. Please try again.");
    }

    setLoading(false);
    try { await logLogin({ data: { method: "password" } }); } catch { /* ignore */ }
    toast.success(t("welcomeBack"));
    if (redirectTo) {
      navigate({ to: redirectTo });
      return;
    }
    try {
      const r = await getMyRoleInfo();
      if (r.isAdmin) navigate({ to: "/admin" });
      else if (r.isSalesman) navigate({ to: "/salesman" });
      else navigate({ to: "/account" });
    } catch {
      navigate({ to: "/account" });
    }
  };

  const demoAdminLogin = async () => {
    setDemoLoading(true);
    try {
      const creds = await ensureDemo();
      const result = await submitLogin({ data: { email: creds.email, password: creds.password } });
      setAuth(result.token, result.user);
      toast.success("Demo admin");
      navigate({ to: redirectTo ?? "/admin" });
    } catch (err: any) {
      toast.error(err.message ?? "Demo login failed");
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-secondary text-secondary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <Link to="/" className="relative font-bold">{t("dubaiParts")}</Link>
        <div className="relative">
          <div className="text-3xl font-bold leading-tight">{t("heroTitle1")}<br /><span className="text-primary">{t("heroTitle2")}</span></div>
          <p className="mt-3 text-sm opacity-80">{t("savedVehicles")}</p>
        </div>
        <div className="relative text-xs opacity-60">© {t("dubaiParts")}</div>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <form onSubmit={submit}>
            <h1 className="text-2xl font-bold">{t("signIn")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("welcomeBack")}</p>
            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider">{t("email")}</span>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider">{t("password")}</span>
                <div className="relative mt-1">
                  <input required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border bg-surface px-3 py-2 pe-10 text-sm outline-none focus:ring-2 focus:ring-ring" />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
              {unverified && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  Please verify your email first.
                </div>
              )}
              <div className="flex justify-end">
                <Link to="/auth/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">Forgot your password?</Link>
              </div>
              <button disabled={loading} className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {loading ? t("signingIn") : t("signIn")}
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t("noAccountQ")} <Link to="/auth/signup" search={{ redirect: redirectTo ?? "" }} className="font-semibold text-primary hover:underline">{t("createOne")}</Link>
            </p>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> Demo <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-2">
            <button type="button" onClick={demoAdminLogin} disabled={demoLoading}
              className="flex w-full items-center justify-center gap-2 rounded-md border bg-surface py-2 text-xs font-semibold hover:bg-accent disabled:opacity-50">
              <ShieldCheck size={14} /> {demoLoading ? t("loading") : "Continue as Demo Admin"}
            </button>
            <button type="button" disabled={superLoading}
              onClick={async () => {
                setSuperLoading(true);
                try {
                  const c = await ensureSuper();
                  const result = await submitLogin({ data: { email: c.email, password: c.password } });
                  setAuth(result.token, result.user);
                  toast.success("Demo Super Admin");
                  navigate({ to: redirectTo ?? "/admin" });
                } catch (e: any) { toast.error(e.message ?? "Super admin login failed"); }
                finally { setSuperLoading(false); }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-secondary py-2 text-xs font-bold uppercase tracking-wider text-secondary-foreground hover:opacity-90 disabled:opacity-50">
              <ShieldCheck size={14} /> {superLoading ? t("loading") : "Continue as Demo Super Admin"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
