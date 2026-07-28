import { useState } from "react";
import { ShoppingCart, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useIsStaff } from "@/hooks/use-is-staff";
import { useI18n } from "@/lib/i18n";
import { addToCart } from "@/lib/account.functions";
import { SignInDialog } from "@/components/sign-in-dialog";
import { useInventoryCheck } from "@/hooks/use-part-stock";

export interface AddToCartButtonProps {
  partId: string;
  initialStock?: number | null;
  quantity?: number;
  className?: string;
  iconOnly?: boolean;
  label?: string;
  onAdded?: () => void;
}

export function AddToCartButton({
  partId,
  initialStock,
  quantity = 1,
  className,
  iconOnly = false,
  label,
  onAdded,
}: AddToCartButtonProps) {
  const { user } = useAuth();
  const isStaff = useIsStaff();
  const { t } = useI18n();
  const qc = useQueryClient();
  const { stock, isOutOfStock, isLoading } = useInventoryCheck(partId, { initialStock });
  const [signInOpen, setSignInOpen] = useState(false);

  const mut = useMutation({
    mutationFn: () => addToCart({ data: { partId, quantity } }),
    onSuccess: () => {
      toast.success(t("addToCart"));
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["cart-count"] });
      qc.invalidateQueries({ queryKey: ["part-stock", partId] });
      onAdded?.();
    },
    onError: (e: any) => toast.error(e?.message || "Add to cart failed"),
  });

  const onClick = () => {
    if (!user) { setSignInOpen(true); return; }
    if (isOutOfStock) return;
    mut.mutate();
  };

  const disabled = isOutOfStock || mut.isPending || isLoading;
  const outLabel = isStaff ? t("outOfStock") : t("addToCart");
  const text = isOutOfStock ? outLabel : (label ?? t("addToCart"));

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-disabled={disabled}
        aria-label={text}
        title={isOutOfStock && isStaff ? t("outOfStock") : undefined}
        {...(isStaff ? { "data-stock": stock } : {})}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition",
          iconOnly ? "h-8 w-8" : "px-4 py-2 text-sm",
          isOutOfStock
            ? "cursor-not-allowed bg-muted text-muted-foreground opacity-60"
            : "bg-primary text-primary-foreground hover:opacity-90",
          mut.isPending && "opacity-70",
          className,
        )}
      >
        {mut.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ShoppingCart className="h-4 w-4" />
        )}
        {!iconOnly && <span>{text}</span>}
      </button>
      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} message={t("signInToAddCart")} />
    </>
  );
}

