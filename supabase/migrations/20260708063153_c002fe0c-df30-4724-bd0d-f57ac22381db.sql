ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'part_viewed';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'catalog_viewed';

ALTER TABLE public.admin_notifications
  ADD COLUMN IF NOT EXISTS salesman_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS admin_notifications_salesman_id_idx
  ON public.admin_notifications(salesman_id, created_at DESC);

ALTER TABLE public.admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_type_check;
ALTER TABLE public.admin_notifications
  ADD CONSTRAINT admin_notifications_type_check
  CHECK (type IN ('signup','order','quotation','lead','activity'));

DROP POLICY IF EXISTS "Salesman can read own notifications" ON public.admin_notifications;
CREATE POLICY "Salesman can read own notifications"
  ON public.admin_notifications FOR SELECT
  TO authenticated
  USING (salesman_id = auth.uid());
