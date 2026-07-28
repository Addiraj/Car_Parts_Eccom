DROP POLICY IF EXISTS "Public can view active testimonials" ON public.testimonials;
CREATE POLICY "Public can view active testimonials"
  ON public.testimonials FOR SELECT TO anon
  USING (is_active = true);
GRANT SELECT ON public.testimonials TO anon;