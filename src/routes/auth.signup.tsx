import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useState, useEffect, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { useServerFn } from "@tanstack/react-start";
import { register, sendOtp } from "@/lib/auth.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Mail, User, Phone, ArrowLeft, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getSafeRedirect } from "@/lib/redirect";

const signupSearchSchema = z.object({
  redirect: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/auth/signup")({
  validateSearch: zodValidator(signupSearchSchema),
  head: () => ({ meta: [{ title: "Create account — Car Parts Dubai" }] }),
  component: Signup,
});

function Signup() {
  const { t } = useI18n();
  const { redirect: redirectRaw } = Route.useSearch();
  const redirectTo = getSafeRedirect(redirectRaw) ?? "";
  const navigate = useNavigate();

  const [step, setStep] = useState<"details" | "otp">("details");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "";

  const submitRegister = useServerFn(register);
  const triggerSendOtp = useServerFn(sendOtp);
  const { setAuth } = useAuth();

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !fullName || !phone) {
      return toast.error("Please fill in all required fields including your phone number");
    }
    if (!recaptchaToken) {
      return toast.error("Please complete the CAPTCHA");
    }
    setBusy(true);
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
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return toast.error("Please enter the OTP");
    setBusy(true);

    try {
      const result = await submitRegister({ 
        data: { email, otp, full_name: fullName, phone } 
      });
      setAuth(result.token, result.user);
      toast.success("Account created successfully!");
      navigate({ to: redirectTo || "/account" });
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-secondary text-secondary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <Link to="/" className="relative font-bold">{t("dubaiParts")}</Link>
        <div className="relative">
          <div className="text-3xl font-bold leading-tight">{t("heroTitle1")}<br /><span className="text-primary">{t("heroTitle2")}</span></div>
          <p className="mt-3 text-sm opacity-80">Create an account to track orders and save your garage.</p>
        </div>
        <div className="relative text-xs opacity-60">© {t("dubaiParts")}</div>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {step === "details" ? (
            <form onSubmit={handleSendOtp}>
              <h1 className="text-2xl font-bold">Create your account</h1>
              <p className="mt-1 text-sm text-muted-foreground">Sign up to get started.</p>
              
              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider">Full Name</span>
                  <div className="relative mt-1">
                    <User className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      required type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-md border bg-surface px-3 py-2 ps-9 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </label>
                
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider">Email</span>
                  <div className="relative mt-1">
                    <Mail className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-md border bg-surface px-3 py-2 ps-9 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </label>
                
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider">Phone Number <span className="text-destructive">*</span></span>
                  <div className="relative mt-1">
                    <Phone className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-md border bg-surface px-3 py-2 ps-9 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </label>

                <div className="flex justify-center my-4">
                  <ReCAPTCHA
                    sitekey={recaptchaSiteKey}
                    ref={recaptchaRef}
                    onChange={(token) => setRecaptchaToken(token)}
                    onErrored={() => setRecaptchaToken(null)}
                    onExpired={() => setRecaptchaToken(null)}
                  />
                </div>

                <button disabled={busy || !recaptchaToken} className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground flex justify-center items-center gap-2 disabled:opacity-50">
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  Continue
                </button>
              </div>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account? <Link to="/auth/login" search={{ redirect: redirectTo }} className="font-semibold text-primary hover:underline">Sign in</Link>
              </p>
            </form>
          ) : (
            <form onSubmit={submit} className="animate-in fade-in slide-in-from-right-4">
              <button type="button" onClick={() => setStep("details")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
              <h1 className="text-2xl font-bold">Verify OTP</h1>
              <p className="mt-1 text-sm text-muted-foreground">We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>.</p>
              
              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider">6-Digit OTP</span>
                  <input required type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.trim())} className="mt-1 w-full rounded-md border bg-surface px-3 py-2 text-sm tracking-widest text-center outline-none focus:ring-2 focus:ring-ring" placeholder="------" />
                </label>

                <button disabled={busy || otp.length !== 6} className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground flex justify-center items-center gap-2 disabled:opacity-50">
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  Verify & Create Account
                </button>

                <div className="text-center mt-4">
                  <button type="button" disabled={countdown > 0 || busy} onClick={handleSendOtp} className="text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed">
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
