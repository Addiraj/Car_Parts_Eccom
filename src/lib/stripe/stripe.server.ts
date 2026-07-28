// Server-only Stripe client factory. Lazy — only constructs when a key exists.
import Stripe from "stripe";
import { getStripeSecretKey } from "./config";

let _client: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  if (_client) return _client;
  const key = getStripeSecretKey();
  if (!key) return null;
  _client = new Stripe(key, { apiVersion: "2024-11-20.acacia" as any });
  return _client;
}
