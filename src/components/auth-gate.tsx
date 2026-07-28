import { useAuth } from "@/hooks/use-auth";
import { SignInDialog } from "@/components/sign-in-dialog";
import { Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function AuthGate({ children, message }: { children: React.ReactNode; message?: string }) {
  const { user, loading } = useAuth();
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] px-5 py-24 md:px-10">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-5 py-24 text-center">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-full border bg-surface">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-medium tracking-tight">{t("signInRequired") ?? "Sign in required"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {message ?? "Please sign in or create an account to continue."}
          </p>
        </div>
        <SignInDialog open={true} onOpenChange={() => {}} message={message} />
      </>
    );
  }

  return <>{children}</>;
}
