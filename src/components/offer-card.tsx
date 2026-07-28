import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { addToCart } from "@/lib/account.functions";
import { formatAED } from "@/lib/format";
import { SignInDialog } from "@/components/sign-in-dialog";
import { Countdown } from "@/components/countdown";
import type { OfferedPart } from "@/lib/offers.functions";
import { PartThumb } from "@/components/part-thumb";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { useInventoryCheck } from "@/hooks/use-part-stock";

export function OfferCard({ p }: { p: OfferedPart }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { isOutOfStock } = useInventoryCheck(p.id, { initialStock: p.stock });
  const qc = useQueryClient();
  const [signInOpen, setSignInOpen] = useState(false);
  const [signInMsg, setSignInMsg] = useState<string | undefined>();

  const addMut = useMutation({
    mutationFn: () => addToCart({ data: { partId: p.id, quantity: 1 } }),
    onSuccess: () => { toast.success(t("addToCart")); qc.invalidateQueries({ queryKey: ["cart"] }); qc.invalidateQueries({ queryKey: ["cart-count"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const onBuyNow = () => {
    if (!user) {
      setSignInMsg(t("signInToAddCart"));
      setSignInOpen(true);
      return;
    }
    addMut.mutate(undefined, {
      onSuccess: () => { window.location.href = "/checkout"; },
    });
  };

  return (
    <>
      <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_20px_60px_-30px_rgba(59,130,246,0.45)]">
        <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-destructive px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-destructive-foreground shadow-lg">
          −{p.discount_pct}%
        </div>
        <Link to="/parts/$id" params={{ id: p.id }} className="relative block aspect-square overflow-hidden bg-surface-2">
          <PartThumb
            src={p.images?.[0]}
            alt={p.name}
            imgClassName="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        </Link>

        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="font-mono">{p.part_number}</span>
            {p.manufacturer && <span className="truncate">{p.manufacturer}</span>}
          </div>
          <Link to="/parts/$id" params={{ id: p.id }} className="mt-1 line-clamp-2 text-sm font-medium leading-tight hover:text-primary">
            {p.name}
          </Link>

          <div className="mt-3 space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-primary">{formatAED(p.final_price)}</span>
              <span className="text-xs text-muted-foreground line-through">{formatAED(p.original_price)}</span>
            </div>
            <div className="text-[11px] font-semibold text-success">
              You save {formatAED(p.savings)}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Ends in</span>
            <Countdown endIso={p.offer.end_date} compact />
          </div>

          <div className="mt-3 flex gap-2">
            <AddToCartButton
              partId={p.id}
              initialStock={p.stock}
              className="flex-1 py-2 text-xs uppercase tracking-wider"
            />
            <button onClick={onBuyNow} disabled={addMut.isPending || isOutOfStock}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
              <Zap className="h-3.5 w-3.5" /> {isOutOfStock ? t("outOfStock") : "Buy now"}
            </button>
          </div>
        </div>
      </div>

      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} message={signInMsg} />
    </>
  );
}
