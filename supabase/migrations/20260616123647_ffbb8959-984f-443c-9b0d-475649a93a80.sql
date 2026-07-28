
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS category_tag text;
CREATE INDEX IF NOT EXISTS parts_category_tag_idx ON public.parts(category_tag);
CREATE INDEX IF NOT EXISTS parts_created_at_idx ON public.parts(created_at DESC);

CREATE TABLE IF NOT EXISTS public.csv_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  total_rows integer NOT NULL DEFAULT 0,
  processed_rows integer NOT NULL DEFAULT 0,
  inserted_rows integer NOT NULL DEFAULT 0,
  updated_rows integer NOT NULL DEFAULT 0,
  failed_rows integer NOT NULL DEFAULT 0,
  error_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.csv_imports TO authenticated;
GRANT ALL ON public.csv_imports TO service_role;

ALTER TABLE public.csv_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read csv_imports" ON public.csv_imports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins write csv_imports" ON public.csv_imports
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER csv_imports_updated_at BEFORE UPDATE ON public.csv_imports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
