import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/payment/cancel")({
  head: () => ({ meta: [{ title: "Payment Cancelled — Car Parts Dubai" }] }),
  validateSearch: (s) => z.object({ order_id: z.string().optional() }).parse(s),
  component: PaymentCancel,
});

function PaymentCancel() {
  const { order_id } = Route.useSearch();
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <XCircle className="mx-auto h-16 w-16 text-destructive" />
      <h1 className="mt-4 text-3xl font-bold">Payment Cancelled</h1>
      <p className="mt-2 text-muted-foreground">
        Your payment was cancelled. Your cart is still saved — you can try again anytime.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to="/checkout" className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Back to Checkout
        </Link>
        {order_id && (
          <Link to="/orders/$id" params={{ id: order_id }} className="rounded-md border px-5 py-2.5 text-sm font-semibold hover:bg-muted">
            View Order
          </Link>
        )}
      </div>
    </div>
  );
}
