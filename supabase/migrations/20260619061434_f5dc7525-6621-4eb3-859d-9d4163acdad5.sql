
-- Hero banners
CREATE TABLE public.hero_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text NOT NULL,
  cta_label text,
  cta_url text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hero_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hero_banners TO authenticated;
GRANT ALL ON public.hero_banners TO service_role;
ALTER TABLE public.hero_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active banners" ON public.hero_banners FOR SELECT USING (is_active = true);
CREATE POLICY "super admin manage banners" ON public.hero_banners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_hero_banners_updated BEFORE UPDATE ON public.hero_banners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Promo sections
CREATE TABLE public.promo_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot text NOT NULL,
  title text NOT NULL,
  description text,
  image_url text,
  link_url text,
  badge text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promo_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_sections TO authenticated;
GRANT ALL ON public.promo_sections TO service_role;
ALTER TABLE public.promo_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active promos" ON public.promo_sections FOR SELECT USING (is_active = true);
CREATE POLICY "super admin manage promos" ON public.promo_sections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_promo_sections_updated BEFORE UPDATE ON public.promo_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Testimonials
CREATE TABLE public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  author_role text,
  avatar_url text,
  rating int NOT NULL DEFAULT 5,
  quote text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.testimonials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active testimonials" ON public.testimonials FOR SELECT USING (is_active = true);
CREATE POLICY "super admin manage testimonials" ON public.testimonials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_testimonials_updated BEFORE UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Footer settings (single row keyed by id='footer')
CREATE TABLE public.site_settings (
  id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "super admin manage settings" ON public.site_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_site_settings_updated BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.site_settings (id, data) VALUES
  ('footer', jsonb_build_object(
    'about', 'UAE''s trusted source for genuine and OEM auto parts.',
    'phone', '+971 4 000 0000',
    'email', 'support@example.com',
    'address', 'Dubai, UAE',
    'columns', jsonb_build_array(
      jsonb_build_object('title','Shop','links', jsonb_build_array(
        jsonb_build_object('label','All Parts','url','/parts'),
        jsonb_build_object('label','Brands','url','/brands')
      )),
      jsonb_build_object('title','Help','links', jsonb_build_array(
        jsonb_build_object('label','Contact','url','/contact'),
        jsonb_build_object('label','Returns','url','/page/returns')
      ))
    ),
    'social', jsonb_build_object('facebook','','instagram','','twitter','','linkedin','')
  ))
ON CONFLICT (id) DO NOTHING;

-- CMS pages
CREATE TABLE public.cms_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  meta_title text,
  meta_description text,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cms_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_pages TO authenticated;
GRANT ALL ON public.cms_pages TO service_role;
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published pages" ON public.cms_pages FOR SELECT USING (is_published = true);
CREATE POLICY "super admin manage pages" ON public.cms_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_cms_pages_updated BEFORE UPDATE ON public.cms_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
