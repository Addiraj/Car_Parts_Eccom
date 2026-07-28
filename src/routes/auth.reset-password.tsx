import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PasswordStrength, scorePassword } from "@/components/password-strength";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({ meta: [{ title: "Set a new password — Car Parts Dubai" }, { name: "robots", content: "noindex" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [ready, setReady] = useState<null | boolean>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) { setReady(true); return; }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        setReady(true);
      }
    });
    const to = setTimeout(() => setReady((r) => (r === null ? false : r)), 4000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(to); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    if (scorePassword(pw) < 2) return toast.error("Please choose a stronger password");
    if (pw !== pw2) return toast.error("Passwords don't match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated successfully!");
    await supabase.auth.signOut();
    navigate({ to: "/auth/login" });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-secondary text-secondary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <Link to="/" className="relative font-bold">{t("dubaiParts")}</Link>
        <div className="relative">
          <div className="text-3xl font-bold leading-tight">Set a new<br /><span className="text-primary">password</span></div>
          <p className="mt-3 text-sm opacity-80">Choose a strong password you'll remember.</p>
        </div>
        <div className="relative text-xs opacity-60">© {t("dubaiParts")}</div>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {ready === false ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold">Invalid or expired link</h1>
              <p className="mt-2 text-sm text-muted-foreground">This password reset link is no longer valid. Request a new one.</p>
              <Link to="/auth/forgot-password" className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                Request new link
              </Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h1 className="text-2xl font-bold">Set a new password</h1>
              <p className="mt-1 text-sm text-muted-foreground">Enter your new password below.</p>
              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider">New password</span>
                  <div className="relative mt-1">
                    <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input required type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)}
                      className="w-full rounded-md border bg-surface px-3 py-2 ps-9 pe-10 text-sm outline-none focus:ring-2 focus:ring-ring" />
                    <button type="button" onClick={() => setShow((s) => !s)} className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                      {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
                <PasswordStrength password={pw} />
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider">Confirm new password</span>
                  <div className="relative mt-1">
                    <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input required type={show ? "text" : "password"} value={pw2} onChange={(e) => setPw2(e.target.value)}
                      className="w-full rounded-md border bg-surface px-3 py-2 ps-9 text-sm outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </label>
                <button disabled={busy || ready !== true} className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                  {busy ? "Updating…" : "Update Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
