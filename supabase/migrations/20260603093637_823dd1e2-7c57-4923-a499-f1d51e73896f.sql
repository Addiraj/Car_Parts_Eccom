-- Rebrand brands (UUIDs preserved so FKs stay intact)
UPDATE public.brands SET name = 'Rolls-Royce', slug = 'rolls-royce', country = 'United Kingdom'
  WHERE slug = 'nissan';
UPDATE public.brands SET name = 'Honda', slug = 'honda', country = 'Japan'
  WHERE slug = 'lexus';
UPDATE public.brands SET name = 'MINI', slug = 'mini', country = 'United Kingdom'
  WHERE slug = 'toyota';

-- Replace models under the renamed brands
DELETE FROM public.models WHERE brand_id IN (
  SELECT id FROM public.brands WHERE slug IN ('rolls-royce','mini','honda')
);

INSERT INTO public.models (brand_id, name, slug)
SELECT id, 'Cooper', 'cooper' FROM public.brands WHERE slug = 'mini'
UNION ALL
SELECT id, 'Countryman', 'countryman' FROM public.brands WHERE slug = 'mini'
UNION ALL
SELECT id, 'Phantom', 'phantom' FROM public.brands WHERE slug = 'rolls-royce'
UNION ALL
SELECT id, 'Civic', 'civic' FROM public.brands WHERE slug = 'honda'
UNION ALL
SELECT id, 'Accord', 'accord' FROM public.brands WHERE slug = 'honda';