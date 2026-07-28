ALTER TABLE public.avatar_providers DROP CONSTRAINT IF EXISTS avatar_providers_provider_check;
ALTER TABLE public.avatar_providers ADD CONSTRAINT avatar_providers_provider_check CHECK (provider = ANY (ARRAY['3d'::text, 'did'::text, 'simli'::text]));
INSERT INTO public.avatar_providers (provider, is_enabled, is_default) VALUES ('3d', true, false) ON CONFLICT (provider) DO NOTHING;
-- Allow public (anon + authenticated) to read just the visibility flags so the frontend can filter
CREATE POLICY "Anyone can read avatar provider visibility" ON public.avatar_providers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins can view avatar providers" ON public.avatar_providers;
GRANT SELECT ON public.avatar_providers TO anon;