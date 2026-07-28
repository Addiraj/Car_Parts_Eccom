
ALTER TABLE public.ai_prompts ADD COLUMN IF NOT EXISTS reference_text text;

CREATE TABLE public.wa_chat_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_user_id text NOT NULL,
  user_locale text,
  user_message text NOT NULL,
  bot_response text NOT NULL,
  intent text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wa_chat_logs TO authenticated;
GRANT ALL ON public.wa_chat_logs TO service_role;
ALTER TABLE public.wa_chat_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read wa_chat_logs" ON public.wa_chat_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX wa_chat_logs_occurred_at_idx ON public.wa_chat_logs (occurred_at DESC);
CREATE INDEX wa_chat_logs_user_idx ON public.wa_chat_logs (whatsapp_user_id);

CREATE TABLE public.wa_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_user_id text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('vin_search','part_search')),
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wa_analytics_events TO authenticated;
GRANT ALL ON public.wa_analytics_events TO service_role;
ALTER TABLE public.wa_analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read wa_analytics_events" ON public.wa_analytics_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX wa_analytics_events_occurred_at_idx ON public.wa_analytics_events (occurred_at DESC);
CREATE INDEX wa_analytics_events_type_time_idx ON public.wa_analytics_events (event_type, occurred_at DESC);
