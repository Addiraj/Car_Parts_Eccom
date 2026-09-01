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
  const [type, setType] = useState<"IND" | "GAR" | "EXP">("IND");
  const [company, setCompany] = useState("");
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

  const roleOptions = [
    { value: "IND" as const, title: "Individual Customer", desc: "Personal vehicle owners — retail pricing." },
    { value: "GAR" as const, title: "Garage / Workshop", desc: "Service centres & mechanics — workshop pricing." },
    { value: "EXP" as const, title: "Export / Bulk Buyer", desc: "Wholesale & export volumes — export pricing." },
  ];

  const requiresCompany = type === "GAR" || type === "EXP";
  const passwordValid = pw.length >= 8 && scorePassword(pw) >= 4;
  const formValid = useMemo(() => {
    return (
      name.trim().length >= 2 &&
      passwordValid &&
      pw === pw2 &&
      (!requiresCompany || company.trim().length > 0)
    );
  }, [company, name, passwordValid, pw, pw2, requiresCompany]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) return toast.error("Please complete all required fields");
    setBusy(true);
    try {
      await submit({
        data: {
          full_name: name.trim(),
          customer_type: type,
          phone: phone.trim() || null,
          company_name: requiresCompany ? company.trim() : null,
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
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider">Customer type</span>
          <div className="mt-2 grid gap-2">
            {roleOptions.map((opt) => {
              const active = type === opt.value;
              return (
                <label key={opt.value} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition ${active ? "border-primary bg-primary/5" : "hover:border-primary/40"}`}>
                  <input type="radio" name="ct" value={opt.value} checked={active} onChange={() => setType(opt.value)} className="mt-1" />
                  <div>
                    <div className="font-semibold">{opt.title} <span className="ms-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">{opt.value}</span></div>
                    <div className="text-xs text-muted-foreground">{opt.desc}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
        {requiresCompany && (
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider">Company name</span>
            <input required value={company} onChange={(e) => setCompany(e.target.value)}
              className="mt-1 w-full rounded-md border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </label>
        )}
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
