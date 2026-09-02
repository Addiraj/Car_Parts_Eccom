import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useState, useEffect, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { useServerFn } from "@tanstack/react-start";
import { login, sendOtp } from "@/lib/auth.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ArrowLeft, Loader2, KeyRound } from "lucide-react";
import { getMyRoleInfo } from "@/lib/admin.salesmen.functions";
import { logLogin } from "@/lib/security.functions";
import { useI18n } from "@/lib/i18n";
import { getSafeRedirect } from "@/lib/redirect";

const loginSearchSchema = z.object({
  redirect: fallback(z.string(), "").default(""),
  reason: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/auth/login")({
  validateSearch: zodValidator(loginSearchSchema),
  head: () => ({ meta: [{ title: "Sign in — Car Parts Dubai" }] }),
  component: Login,
});

function Login() {
  const { t } = useI18n();
  const { redirect: redirectRaw, reason } = Route.useSearch();
  const redirectTo = getSafeRedirect(redirectRaw);
  
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "";

  const navigate = useNavigate();
  const submitLogin = useServerFn(login);
  const triggerSendOtp = useServerFn(sendOtp);
  const { setAuth } = useAuth();

  const isAdminEmail = email === "admin" || email === "superadmin";

  useEffect(() => {
    if (reason === "inactivity") {
      toast.error("Session expired due to inactivity. Please log in again.");
    }
  }, [reason]);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !email.includes("@")) {
      return toast.error("Please enter a valid email address");
    }
    if (!recaptchaToken) {
      return toast.error("Please complete the CAPTCHA");
    }
    setLoading(true);
    try {
      await triggerSendOtp({ data: { email, recaptchaToken } });
      setStep("otp");
      setCountdown(60);
      toast.success("OTP sent to your email");
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const data: any = { email, recaptchaToken };
      if (isAdminEmail) data.password = password;
      else data.otp = otp;

      const result = await submitLogin({ data });
      setAuth(result.token, result.user);
      
      try { await logLogin({ data: { method: isAdminEmail ? "password" : "otp" } }); } catch { /* ignore */ }
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

    } catch (error: any) {
      toast.error(error.message || "Invalid credentials. Please try again.");
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
    } finally {
      setLoading(false);
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
          {step === "email" ? (
            <form onSubmit={isAdminEmail ? submit : handleSendOtp}>
              <h1 className="text-2xl font-bold">{t("signIn")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("welcomeBack")}</p>
              
              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider">{t("email")} / Username</span>
                  <input required type="text" value={email} onChange={(e) => setEmail(e.target.value.trim().toLowerCase())} className="mt-1 w-full rounded-md border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" autoCapitalize="none" autoCorrect="off" placeholder="Enter your email" />
                </label>

                {isAdminEmail && (
                  <label className="block animate-in fade-in slide-in-from-top-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">{t("password")}</span>
                    <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-md border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                  </label>
                )}

                <div className="flex justify-center my-4">
                  <ReCAPTCHA
                    sitekey={recaptchaSiteKey}
                    ref={recaptchaRef}
                    onChange={(token) => setRecaptchaToken(token)}
                    onErrored={() => setRecaptchaToken(null)}
                    onExpired={() => setRecaptchaToken(null)}
                  />
                </div>
                <button disabled={loading || !recaptchaToken} className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground flex justify-center items-center gap-2 disabled:opacity-50">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isAdminEmail ? t("signIn") : "Continue"}
                </button>
              </div>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {t("noAccountQ")} <Link to="/auth/signup" search={{ redirect: redirectTo ?? "" }} className="font-semibold text-primary hover:underline">{t("createOne")}</Link>
              </p>
            </form>
          ) : (
            <form onSubmit={submit} className="animate-in fade-in slide-in-from-right-4">
              <button type="button" onClick={() => setStep("email")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
              <h1 className="text-2xl font-bold">Verify OTP</h1>
              <p className="mt-1 text-sm text-muted-foreground">We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>.</p>
              
              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider">6-Digit OTP</span>
                  <input required type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.trim())} className="mt-1 w-full rounded-md border bg-surface px-3 py-2 text-sm tracking-widest text-center outline-none focus:ring-2 focus:ring-ring" placeholder="------" />
                </label>

                <button disabled={loading || otp.length !== 6} className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground flex justify-center items-center gap-2 disabled:opacity-50">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Verify & Sign In
                </button>

                <div className="text-center mt-4">
                  <button type="button" disabled={countdown > 0 || loading} onClick={handleSendOtp} className="text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed">
                    {countdown > 0 ? `Resend OTP in ${countdown}s` : "Resend OTP"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
