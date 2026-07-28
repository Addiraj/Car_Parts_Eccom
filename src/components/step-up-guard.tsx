import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { OtpInput } from "@/components/otp-input";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

const KEY = "stepup_verified_at";
const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2h

function isFresh() {
  if (typeof window === "undefined") return false;
  const ts = Number(localStorage.getItem(KEY) ?? "0");
  return ts > 0 && Date.now() - ts < MAX_AGE_MS;
}

export function StepUpGuard({ children, label }: { children: React.ReactNode; label?: string }) {
  const { user, loading } = useAuth();
  const [ok, setOk] = useState<boolean>(false);
  const [stage, setStage] = useState<"idle" | "sent">("idle");
  const [otp, setOtp] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => { setOk(isFresh()); }, []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (ok) return <>{children}</>;

  const sendCode = async () => {
    if (!user?.email) return toast.error("No email on account");
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: user.email,
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setStage("sent");
    setCooldown(60);
    toast.success("Verification code sent to your email");
  };

  const verify = async (code: string) => {
    if (!user?.email || code.length !== 6) return;
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email: user.email, token: code, type: "email",
    });
    setBusy(false);
    if (error) {
      setInvalid(true);
      setTimeout(() => setInvalid(false), 500);
      toast.error("Invalid code");
      setOtp("");
      return;
    }
    localStorage.setItem(KEY, String(Date.now()));
    setOk(true);
    toast.success("Verified");
  };

  return (
    <div className="mx-auto max-w-md p-8">
      <div className="rounded-xl border bg-surface p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">Additional verification required</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {label ?? "Please verify your identity to access this area."} A 6-digit code will be sent to <span className="font-medium text-foreground">{user?.email}</span>.
        </p>
        {stage === "idle" ? (
          <button
            onClick={sendCode}
            disabled={busy}
            className="mt-5 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Send verification code"}
          </button>
        ) : (
          <div className="mt-5 space-y-3">
            <div className="flex justify-center">
              <OtpInput value={otp} onChange={setOtp} onComplete={verify} invalid={invalid} disabled={busy} />
            </div>
            <button
              onClick={sendCode}
              disabled={cooldown > 0 || busy}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
