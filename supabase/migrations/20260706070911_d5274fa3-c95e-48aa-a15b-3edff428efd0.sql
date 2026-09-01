
-- Admin notifications history
CREATE TABLE public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('signup','order','quotation')),
  title text not null,
  body text,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

GRANT SELECT ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read notifications"
  ON public.admin_notifications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Per-admin read state
CREATE TABLE public.admin_notification_reads (
  notification_id uuid not null references public.admin_notifications(id) on delete cascade,
  admin_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, admin_id)
);

GRANT SELECT, INSERT, DELETE ON public.admin_notification_reads TO authenticated;
GRANT ALL ON public.admin_notification_reads TO service_role;

ALTER TABLE public.admin_notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read own reads"
  ON public.admin_notification_reads FOR SELECT
  TO authenticated
  USING (admin_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert own reads"
  ON public.admin_notification_reads FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete own reads"
  ON public.admin_notification_reads FOR DELETE
  TO authenticated
  USING (admin_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;

-- Trigger: new customer signup (profile insert)
CREATE OR REPLACE FUNCTION public.notify_admin_new_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_addr text;
BEGIN
  SELECT email INTO email_addr FROM public.users WHERE id = NEW.id;
  INSERT INTO public.admin_notifications (type, title, body, entity_type, entity_id, metadata)
  VALUES (
    'signup',
    'New ' || coalesce(NEW.customer_type::text, 'IND') || ' customer signed up',
    coalesce(nullif(NEW.full_name, ''), email_addr, 'New customer'),
    'user',
    NEW.id::text,
    jsonb_build_object(
      'user_id', NEW.id,
      'full_name', NEW.full_name,
      'email', email_addr,
      'customer_type', NEW.customer_type,
      'status', NEW.status
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admin_new_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_signup();

-- Trigger: new order
CREATE OR REPLACE FUNCTION public.notify_admin_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, body, entity_type, entity_id, metadata)
  VALUES (
    'order',
    'New order ' || coalesce(NEW.order_number, ''),
    'Total AED ' || coalesce(NEW.total::text, '0'),
    'order',
    NEW.id::text,
    jsonb_build_object('order_number', NEW.order_number, 'total', NEW.total, 'user_id', NEW.user_id, 'status', NEW.status)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admin_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_order();

-- Trigger: new quotation
CREATE OR REPLACE FUNCTION public.notify_admin_new_quotation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, body, entity_type, entity_id, metadata)
  VALUES (
    'quotation',
    'New quotation ' || coalesce(NEW.quotation_number, ''),
    'Total AED ' || coalesce(NEW.total::text, '0'),
    'quotation',
    NEW.id::text,
    jsonb_build_object('quotation_number', NEW.quotation_number, 'total', NEW.total, 'customer_id', NEW.customer_id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admin_new_quotation
  AFTER INSERT ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_quotation();
