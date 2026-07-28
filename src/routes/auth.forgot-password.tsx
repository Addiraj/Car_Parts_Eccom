import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — Car Parts Dubai" }] }),
  component: ForgotPassword,
});

const COOLDOWN_KEY = "pwreset_cooldown_until";

function ForgotPassword() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "sent">("email");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const until = Number(localStorage.getItem(COOLDOWN_KEY) ?? "0");
    if (until > Date.now()) setCooldown(Math.ceil((until - Date.now()) / 1000));
  }, []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const to = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(to);
  }, [cooldown]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email) return toast.error("Enter your email");
    if (cooldown > 0) return;
    setBusy(true);
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/auth/reset-password` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setBusy(false);
    if (error) return toast.error(error.message);
    const until = Date.now() + 60_000;
    localStorage.setItem(COOLDOWN_KEY, String(until));
    setCooldown(60);
    setStep("sent");
    toast.success("Reset link sent");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-secondary text-secondary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <Link to="/" className="relative font-bold">{t("dubaiParts")}</Link>
        <div className="relative">
          <div className="text-3xl font-bold leading-tight">Reset your<br /><span className="text-primary">password</span></div>
          <p className="mt-3 text-sm opacity-80">We'll email you a secure link to set a new password.</p>
        </div>
        <div className="relative text-xs opacity-60">© {t("dubaiParts")}</div>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {step === "email" ? (
            <form onSubmit={send}>
              <h1 className="text-2xl font-bold">Forgot your password?</h1>
              <p className="mt-1 text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider">Email</span>
                  <div className="relative mt-1">
                    <Mail className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-md border bg-surface px-3 py-2 ps-9 text-sm outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </label>
                <button disabled={busy || cooldown > 0} className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                  {busy ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Send Reset Link"}
                </button>
              </div>
              <p className="mt-6 text-center text-sm">
                <Link to="/auth/login" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-3 w-3" /> Back to Sign in
                </Link>
              </p>
            </form>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-bold">Reset link sent!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Check your email for a password reset link. If you don't see it, check your spam folder.
              </p>
              <button
                onClick={() => send()}
                disabled={cooldown > 0 || busy}
                className="mt-6 w-full rounded-md border bg-surface py-2 text-sm font-semibold hover:bg-accent disabled:opacity-50"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend link"}
              </button>
              <p className="mt-6 text-center text-sm">
                <Link to="/auth/login" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-3 w-3" /> Back to Sign in
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
