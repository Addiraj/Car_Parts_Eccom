
-- Enums
CREATE TYPE public.followup_status AS ENUM ('pending','completed','cancelled');
CREATE TYPE public.followup_priority AS ENUM ('low','medium','high');
CREATE TYPE public.activity_type AS ENUM (
  'note_added','followup_created','followup_completed','followup_cancelled',
  'quotation_created','order_placed','customer_assigned','customer_reassigned',
  'customer_unassigned','status_changed','call_logged','email_sent'
);

-- Extend audit_logs with customer reference
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS customer_id uuid;
CREATE INDEX IF NOT EXISTS idx_audit_logs_customer ON public.audit_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- Customer Notes
CREATE TABLE public.customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  author_id uuid NOT NULL,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customer_notes_customer ON public.customer_notes(customer_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_notes TO authenticated;
GRANT ALL ON public.customer_notes TO service_role;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all notes" ON public.customer_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Salesmen read assigned customer notes" ON public.customer_notes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customer_assignments ca WHERE ca.customer_id = customer_notes.customer_id AND ca.salesman_id = auth.uid()));
CREATE POLICY "Salesmen write assigned customer notes" ON public.customer_notes FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.customer_assignments ca WHERE ca.customer_id = customer_notes.customer_id AND ca.salesman_id = auth.uid()));
CREATE POLICY "Authors update own notes" ON public.customer_notes FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors delete own notes" ON public.customer_notes FOR DELETE TO authenticated
  USING (author_id = auth.uid());

CREATE TRIGGER trg_customer_notes_updated BEFORE UPDATE ON public.customer_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Customer Follow-ups
CREATE TABLE public.customer_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  assigned_to uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_at timestamptz NOT NULL,
  status public.followup_status NOT NULL DEFAULT 'pending',
  priority public.followup_priority NOT NULL DEFAULT 'medium',
  completed_at timestamptz,
  completed_by uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_followups_assigned ON public.customer_followups(assigned_to, status, due_at);
CREATE INDEX idx_followups_customer ON public.customer_followups(customer_id, due_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_followups TO authenticated;
GRANT ALL ON public.customer_followups TO service_role;
ALTER TABLE public.customer_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all followups" ON public.customer_followups FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Assignee reads own followups" ON public.customer_followups FOR SELECT TO authenticated
  USING (assigned_to = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Assignee updates own followups" ON public.customer_followups FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid()) WITH CHECK (assigned_to = auth.uid());
CREATE POLICY "Salesmen create followups for assigned customers" ON public.customer_followups FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.customer_assignments ca WHERE ca.customer_id = customer_followups.customer_id AND ca.salesman_id = auth.uid()));

CREATE TRIGGER trg_followups_updated BEFORE UPDATE ON public.customer_followups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Customer Activities (append-only timeline)
CREATE TABLE public.customer_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  actor_id uuid,
  activity_type public.activity_type NOT NULL,
  entity_type text,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_activities_customer ON public.customer_activities(customer_id, created_at DESC);
GRANT SELECT, INSERT ON public.customer_activities TO authenticated;
GRANT ALL ON public.customer_activities TO service_role;
ALTER TABLE public.customer_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all activities" ON public.customer_activities FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Salesmen read assigned activities" ON public.customer_activities FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customer_assignments ca WHERE ca.customer_id = customer_activities.customer_id AND ca.salesman_id = auth.uid()));
CREATE POLICY "Authenticated insert activities" ON public.customer_activities FOR INSERT TO authenticated
  WITH CHECK (true);

-- Helper: log activity
CREATE OR REPLACE FUNCTION public.log_customer_activity(
  _customer_id uuid, _actor_id uuid, _type public.activity_type,
  _entity_type text, _entity_id text, _metadata jsonb
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  INSERT INTO public.customer_activities(customer_id, actor_id, activity_type, entity_type, entity_id, metadata)
  VALUES (_customer_id, _actor_id, _type, _entity_type, _entity_id, COALESCE(_metadata,'{}'::jsonb));
  UPDATE public.customer_assignments SET last_activity_at = now() WHERE customer_id = _customer_id;
$$;

-- Triggers: auto-log on quotations / orders
CREATE OR REPLACE FUNCTION public.trg_quotation_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    PERFORM public.log_customer_activity(NEW.customer_id, auth.uid(), 'quotation_created', 'quotation', NEW.id::text,
      jsonb_build_object('quotation_number', NEW.quotation_number, 'total', NEW.total));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_quotation_insert_activity AFTER INSERT ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.trg_quotation_activity();

CREATE OR REPLACE FUNCTION public.trg_order_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    PERFORM public.log_customer_activity(NEW.user_id, auth.uid(), 'order_placed', 'order', NEW.id::text,
      jsonb_build_object('order_number', NEW.order_number, 'total', NEW.total));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_order_insert_activity AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_order_activity();

-- Trigger: log assignment changes
CREATE OR REPLACE FUNCTION public.trg_assignment_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    PERFORM public.log_customer_activity(NEW.customer_id, auth.uid(), 'customer_assigned', 'salesman', NEW.salesman_id::text,
      jsonb_build_object('salesman_id', NEW.salesman_id));
  ELSIF TG_OP='UPDATE' AND OLD.salesman_id IS DISTINCT FROM NEW.salesman_id THEN
    PERFORM public.log_customer_activity(NEW.customer_id, auth.uid(), 'customer_reassigned', 'salesman', NEW.salesman_id::text,
      jsonb_build_object('from', OLD.salesman_id, 'to', NEW.salesman_id));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_assignment_activity_iu AFTER INSERT OR UPDATE ON public.customer_assignments
  FOR EACH ROW EXECUTE FUNCTION public.trg_assignment_activity();
