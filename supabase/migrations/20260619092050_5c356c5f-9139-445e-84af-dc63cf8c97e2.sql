DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'salesman_status') THEN
    CREATE TYPE public.salesman_status AS ENUM ('active','inactive');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.salesmen (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id text UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  photo_url text,
  territory text,
  status public.salesman_status NOT NULL DEFAULT 'active',
  joining_date date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.salesmen TO authenticated;
GRANT ALL ON public.salesmen TO service_role;

ALTER TABLE public.salesmen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage salesmen" ON public.salesmen
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "salesman read own row" ON public.salesmen
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE TRIGGER trg_salesmen_updated_at BEFORE UPDATE ON public.salesmen
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.customer_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  salesman_id uuid NOT NULL REFERENCES public.salesmen(id) ON DELETE CASCADE,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_salesman ON public.customer_assignments(salesman_id);

GRANT SELECT ON public.customer_assignments TO authenticated;
GRANT ALL ON public.customer_assignments TO service_role;

ALTER TABLE public.customer_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage assignments" ON public.customer_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "salesman read own assignments" ON public.customer_assignments
  FOR SELECT TO authenticated
  USING (salesman_id = auth.uid());

CREATE TRIGGER trg_assignments_updated_at BEFORE UPDATE ON public.customer_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_salesman(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT public.has_role(_uid, 'salesman'::public.app_role) $$;