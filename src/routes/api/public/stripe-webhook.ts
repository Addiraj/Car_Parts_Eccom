import { createFileRoute } from "@tanstack/react-router";
import { getStripeWebhookSecret, isStripeConfigured } from "@/lib/stripe/config";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, stripe-signature",
};

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      POST: async ({ request }) => {
        if (!isStripeConfigured()) {
          return new Response(JSON.stringify({ error: "Stripe not configured" }), {
            status: 503, headers: { "Content-Type": "application/json", ...CORS },
          });
        }
        const secret = getStripeWebhookSecret();
        if (!secret) {
          return new Response(JSON.stringify({ error: "Webhook secret missing" }), {
            status: 503, headers: { "Content-Type": "application/json", ...CORS },
          });
        }

        const sig = request.headers.get("stripe-signature");
        if (!sig) return new Response("Missing signature", { status: 400, headers: CORS });

        const rawBody = await request.text();

        const { getStripeClient } = await import("@/lib/stripe/stripe.server");
        const stripe = getStripeClient();
        if (!stripe) return new Response("Stripe unavailable", { status: 503, headers: CORS });

        let event: any;
        try {
          event = stripe.webhooks.constructEvent(rawBody, sig, secret);
        } catch (err: any) {
          console.error("[stripe-webhook] Signature verification failed:", err.message);
          return new Response(`Webhook Error: ${err.message}`, { status: 400, headers: CORS });
        }

        try {
          const { models } = await import("@/lib/db/index.server");
          
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as any;
              const orderId = session.metadata?.order_id;
              if (!orderId) break;
              await models.orders.update({
                payment_status: "paid",
                status: "processing",
                stripe_payment_intent_id: session.payment_intent ?? null,
                amount_paid: session.amount_total ? session.amount_total / 100 : null,
                payment_currency: session.currency?.toUpperCase() ?? null,
                paid_at: new Date().toISOString(),
              }, { where: { id: orderId } });
              
              await models.order_events.create({
                order_id: orderId, status: "paid", note: `Stripe payment received (${session.id})`,
              });
              break;
            }
            case "payment_intent.succeeded": {
              const pi = event.data.object as any;
              const orderId = pi.metadata?.order_id;
              if (!orderId) break;
              // Idempotent — only update if not already paid
              const curRow = await models.orders.findOne({
                attributes: ["payment_status"],
                where: { id: orderId }
              });
              const cur = curRow ? curRow.get({ plain: true }) : null;
              
              if (cur?.payment_status !== "paid") {
                await models.orders.update({
                  payment_status: "paid",
                  status: "processing",
                  stripe_payment_intent_id: pi.id,
                  amount_paid: pi.amount_received ? pi.amount_received / 100 : null,
                  payment_currency: pi.currency?.toUpperCase() ?? null,
                  paid_at: new Date().toISOString(),
                }, { where: { id: orderId } });
                
                await models.order_events.create({
                  order_id: orderId, status: "paid", note: `Payment intent succeeded (${pi.id})`,
                });
              }
              break;
            }
            case "payment_intent.payment_failed": {
              const pi = event.data.object as any;
              const orderId = pi.metadata?.order_id;
              if (!orderId) break;
              
              await models.orders.update({
                payment_status: "failed",
                status: "payment_failed",
                stripe_payment_intent_id: pi.id,
              }, { where: { id: orderId } });
              
              await models.order_events.create({
                order_id: orderId, status: "payment_failed",
                note: `Payment failed: ${pi.last_payment_error?.message ?? "unknown error"}`,
              });
              break;
            }
            default:
              // Ignore other events
              break;
          }
        } catch (err: any) {
          console.error("[stripe-webhook] Handler error:", err);
          // Return 200 anyway to prevent Stripe retries on our internal errors — logged for review
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200, headers: { "Content-Type": "application/json", ...CORS },
        });
      },
    },
  },
});
