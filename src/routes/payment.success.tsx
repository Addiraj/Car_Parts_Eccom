import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { getOrderPaymentStatus } from "@/lib/stripe/stripe.functions";
import { formatAED } from "@/lib/format";
import { z } from "zod";

const searchSchema = z.object({
  session_id: z.string().optional(),
  order_id: z.string().optional(),
});

export const Route = createFileRoute("/payment/success")({
  head: () => ({ meta: [{ title: "Payment Successful — Car Parts Dubai" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: PaymentSuccess,
});

function PaymentSuccess() {
  const { session_id, order_id } = Route.useSearch();

  const { data: order, isLoading } = useQuery({
    queryKey: ["payment-status", session_id, order_id],
    queryFn: () => getOrderPaymentStatus({ data: { session_id, order_id } }),
    refetchInterval: (q) => {
      const d = q.state.data as any;
      return d?.payment_status === "paid" ? false : 2000;
    },
    enabled: Boolean(session_id || order_id),
  });

  const paid = (order as any)?.payment_status === "paid";

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      {paid ? (
        <>
          <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
          <h1 className="mt-4 text-3xl font-bold">Payment Successful</h1>
          <p className="mt-2 text-muted-foreground">
            Thank you! Order <span className="font-mono font-semibold">{(order as any)?.order_number}</span> is confirmed.
          </p>
          {(order as any)?.amount_paid && (
            <p className="mt-2 text-lg font-semibold">{formatAED(Number((order as any).amount_paid))}</p>
          )}
        </>
      ) : (
        <>
          <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
          <h1 className="mt-4 text-2xl font-bold">Confirming your payment…</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isLoading ? "Loading…" : "This usually takes just a few seconds."}
          </p>
        </>
      )}
      <div className="mt-8 flex justify-center gap-3">
        {(order as any)?.id && (
          <Link to="/orders/$id" params={{ id: (order as any).id }} className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            View Order
          </Link>
        )}
        <Link to="/" className="rounded-md border px-5 py-2.5 text-sm font-semibold hover:bg-muted">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
