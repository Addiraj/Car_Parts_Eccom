import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { register } from "@/lib/auth.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, User, Phone } from "lucide-react";
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const submitRegister = useServerFn(register);
  const { setAuth } = useAuth();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName || !phone) return toast.error("Please fill in all required fields including your phone number");
    setBusy(true);

    try {
      const result = await submitRegister({ 
        data: { email, password, full_name: fullName, phone } 
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
          <form onSubmit={submit}>
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
                    placeholder="+971 50 123 4567"
                    className="w-full rounded-md border bg-surface px-3 py-2 ps-9 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider">Password</span>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border bg-surface px-3 py-2 pe-10 ps-9 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
              <button disabled={busy} className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {busy ? "Creating Account…" : "Create Account"}
              </button>
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t("haveAccountQ")} <Link to="/auth/login" search={{ redirect: redirectTo }} className="font-semibold text-primary hover:underline">{t("signIn")}</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
