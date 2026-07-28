
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS payment_status text,
  ADD COLUMN IF NOT EXISTS amount_paid numeric,
  ADD COLUMN IF NOT EXISTS payment_currency text;

CREATE INDEX IF NOT EXISTS orders_stripe_session_id_idx ON public.orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS orders_stripe_payment_intent_id_idx ON public.orders(stripe_payment_intent_id);
