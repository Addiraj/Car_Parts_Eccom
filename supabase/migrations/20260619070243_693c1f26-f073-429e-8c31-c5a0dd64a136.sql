
-- enum
DO $$ BEGIN
  CREATE TYPE public.quotation_status AS ENUM ('draft','sent','approved','rejected','expired','converted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.quotation_discount_type AS ENUM ('percent','fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- sequence for quotation numbers
CREATE SEQUENCE IF NOT EXISTS public.quotation_number_seq START 1;

CREATE OR REPLACE FUNCTION public.next_quotation_number()
RETURNS text LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'Q-' || to_char(now(),'YYYYMM') || '-' || lpad(nextval('public.quotation_number_seq')::text, 5, '0')
$$;

-- quotations
CREATE TABLE IF NOT EXISTS public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number text NOT NULL UNIQUE DEFAULT public.next_quotation_number(),
  customer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.quotation_status NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'AED',
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount_type public.quotation_discount_type NOT NULL DEFAULT 'percent',
  discount_value numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 5,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  shipping_amount numeric(12,2) NOT NULL DEFAULT 0,
  grand_total numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  terms text,
  valid_until timestamptz,
  share_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16),'hex'),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  converted_at timestamptz,
  converted_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
GRANT ALL ON public.quotations TO service_role;
GRANT USAGE ON SEQUENCE public.quotation_number_seq TO authenticated, service_role;

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage quotations" ON public.quotations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER quotations_set_updated BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS quotations_customer_idx ON public.quotations(customer_id);
CREATE INDEX IF NOT EXISTS quotations_status_idx ON public.quotations(status);
CREATE INDEX IF NOT EXISTS quotations_created_idx ON public.quotations(created_at DESC);

-- items
CREATE TABLE IF NOT EXISTS public.quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  part_id uuid REFERENCES public.parts(id) ON DELETE SET NULL,
  part_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  custom_price numeric(12,2),
  line_discount numeric(12,2) NOT NULL DEFAULT 0,
  line_total numeric(12,2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_items TO authenticated;
GRANT ALL ON public.quotation_items TO service_role;

ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage quotation items" ON public.quotation_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS quotation_items_q_idx ON public.quotation_items(quotation_id);

-- events
CREATE TABLE IF NOT EXISTS public.quotation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.quotation_events TO authenticated;
GRANT ALL ON public.quotation_events TO service_role;

ALTER TABLE public.quotation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins view quotation events" ON public.quotation_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins insert quotation events" ON public.quotation_events
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS quotation_events_q_idx ON public.quotation_events(quotation_id, created_at DESC);
