CREATE TABLE public.avatar_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('did','simli')),
  face_id text,
  voice_id text,
  model text CHECK (model IN ('trinity','legacy')),
  avatar_image_url text,
  avatar_image_path text,
  is_default boolean NOT NULL DEFAULT false,
  is_enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.avatar_providers TO authenticated;
GRANT ALL ON public.avatar_providers TO service_role;

ALTER TABLE public.avatar_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view avatar providers"
  ON public.avatar_providers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert avatar providers"
  ON public.avatar_providers FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update avatar providers"
  ON public.avatar_providers FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete avatar providers"
  ON public.avatar_providers FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER avatar_providers_set_updated_at
  BEFORE UPDATE ON public.avatar_providers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed D-ID default row so the existing behavior keeps working unchanged.
INSERT INTO public.avatar_providers (provider, is_default, is_enabled)
VALUES ('did', true, true)
ON CONFLICT (provider) DO NOTHING;