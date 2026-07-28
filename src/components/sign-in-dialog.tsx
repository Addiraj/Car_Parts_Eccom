import { Link } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { useCurrentHref } from "@/lib/redirect";

export function SignInDialog({
  open,
  onOpenChange,
  message,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  message?: string;
}) {
  const { t } = useI18n();
  const href = useCurrentHref();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("signInRequired")}</DialogTitle>
          <DialogDescription>{message ?? t("signInToContinue")}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
          >
            {t("cancel")}
          </button>
          <Link
            to="/auth/login"
            search={{ redirect: href }}
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <LogIn className="h-4 w-4" /> {t("signIn")}
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
