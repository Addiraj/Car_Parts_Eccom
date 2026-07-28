
-- Warehouses
CREATE TABLE public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  address text,
  city text,
  country text,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warehouses TO authenticated;
GRANT ALL ON public.warehouses TO service_role;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage warehouses" ON public.warehouses FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Auth can read warehouses" ON public.warehouses FOR SELECT TO authenticated USING (true);
CREATE TRIGGER warehouses_updated BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Per-warehouse stock levels
CREATE TABLE public.stock_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  reorder_point integer NOT NULL DEFAULT 0,
  bin_location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(part_id, warehouse_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_levels TO authenticated;
GRANT ALL ON public.stock_levels TO service_role;
ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage stock levels" ON public.stock_levels FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER stock_levels_updated BEFORE UPDATE ON public.stock_levels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_stock_levels_part ON public.stock_levels(part_id);
CREATE INDEX idx_stock_levels_warehouse ON public.stock_levels(warehouse_id);

-- Stock movements (audit trail)
CREATE TYPE public.stock_movement_type AS ENUM ('IN','OUT','ADJUST','TRANSFER','SALE','RETURN');

CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  to_warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  movement_type public.stock_movement_type NOT NULL,
  quantity integer NOT NULL,
  reference text,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage stock movements" ON public.stock_movements FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_stock_movements_part ON public.stock_movements(part_id, created_at DESC);
CREATE INDEX idx_stock_movements_wh ON public.stock_movements(warehouse_id, created_at DESC);

-- Low stock threshold on parts
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 5;

-- Seed default warehouse
INSERT INTO public.warehouses(code, name, city, country, is_default)
  VALUES ('MAIN','Main Warehouse','Dubai','UAE', true)
  ON CONFLICT (code) DO NOTHING;
