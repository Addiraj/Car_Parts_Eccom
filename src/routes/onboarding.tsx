import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2, Lock, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { PasswordStrength, scorePassword } from "@/components/password-strength";
import { checkProfileComplete } from "@/lib/onboarding";
import { completeOnboarding } from "@/lib/security.functions";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  beforeLoad: async () => {
    // handled inside component to use localStorage
    return {};
  },
  head: () => ({ meta: [{ title: "Complete your profile — Car Parts Dubai" }] }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const submit = useServerFn(completeOnboarding);
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem("jwt_token");
    if (!token) {
      navigate({ to: "/auth/login", search: { redirect: "/onboarding" } });
      return;
    }
    
    // We parse token just to get userId, but since checkProfileComplete requires user id,
    // actually checkProfileComplete uses the serverFn which uses the auth middleware, 
    // we don't need to pass user.id! Wait, checkProfileComplete(user.id) ? 
    // Let's modify onboarding.tsx to call needsOnboarding instead.
    
    import("@/lib/security.functions").then(m => {
      m.needsOnboarding().then((res) => {
        if (cancelled) return;
        if (!res.needs) navigate({ to: "/", replace: true });
        else setChecking(false);
      });
    });
    
    return () => { cancelled = true; };
  }, [navigate]);


  const passwordValid = pw.length >= 8 && scorePassword(pw) >= 4;
  const formValid = useMemo(() => {
    return (
      name.trim().length >= 2 &&
      passwordValid &&
      pw === pw2
    );
  }, [name, passwordValid, pw, pw2]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) return toast.error("Please complete all required fields");
    setBusy(true);
    try {
      await submit({
        data: {
          full_name: name.trim(),
          customer_type: "IND", // Default all new accounts to IND
          phone: phone.trim() || null,
          company_name: null,
          password: pw,
        },
      });
      toast.success("Welcome aboard!");
      navigate({ to: "/", replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
          <UserCircle className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Welcome to Fine Land International! 🎉</h1>
          <p className="text-xs text-muted-foreground">Let's set up your account in 30 seconds.</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-5">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider">Full name</span>
          <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider">Phone number <span className="ms-1 font-normal normal-case text-muted-foreground">(optional)</span></span>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-md border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </label>
        {/* Customer type and Company name removed. All new accounts default to Individual (IND). Superadmin can change this later from the Admin dashboard. */}
        <div className="rounded-md border bg-surface/50 p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider">Set your password</div>
          <div className="space-y-3">
            <div className="relative">
              <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input required type={show ? "text" : "password"} placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 ps-9 pe-10 text-sm outline-none focus:ring-2 focus:ring-ring" />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1} aria-label={show ? "Hide password" : "Show password"}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <PasswordStrength password={pw} />
            <div className="relative">
              <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input required type={show ? "text" : "password"} placeholder="Confirm password" value={pw2} onChange={(e) => setPw2(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 ps-9 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
        </div>
        <button disabled={busy || !formValid} className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {busy ? "Saving…" : "Complete Setup"}
        </button>
      </form>
    </div>
  );
}
