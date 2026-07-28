
CREATE TABLE public.user_login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  location TEXT,
  login_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.user_login_history TO authenticated;
GRANT ALL ON public.user_login_history TO service_role;

ALTER TABLE public.user_login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own login history" ON public.user_login_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own login history" ON public.user_login_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX user_login_history_user_time_idx ON public.user_login_history (user_id, login_time DESC);
CREATE UNIQUE INDEX user_login_history_user_session_uniq ON public.user_login_history (user_id, session_id) WHERE session_id IS NOT NULL;
