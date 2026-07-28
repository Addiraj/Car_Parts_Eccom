// Stripe configuration. Reads env vars only — never throws at import time.
// Add these secrets when ready:
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, VITE_STRIPE_PUBLISHABLE_KEY

export const STRIPE_CURRENCY = (process.env.STRIPE_CURRENCY || "aed").toLowerCase();

export function getStripeSecretKey(): string | null {
  return process.env.STRIPE_SECRET_KEY || null;
}

export function getStripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}

export function getStripePublishableKey(): string | null {
  // Server-side reader; client uses import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY directly.
  return process.env.VITE_STRIPE_PUBLISHABLE_KEY || null;
}

export function isStripeConfigured(): boolean {
  return Boolean(getStripeSecretKey() && getStripePublishableKey());
}
