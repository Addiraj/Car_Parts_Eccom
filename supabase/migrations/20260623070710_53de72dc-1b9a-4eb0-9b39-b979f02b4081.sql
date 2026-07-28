
CREATE TEMP TABLE _part_keep AS
SELECT DISTINCT ON (part_number) id AS keep_id, part_number
FROM public.parts
ORDER BY part_number, updated_at DESC NULLS LAST, created_at DESC NULLS LAST;

CREATE TEMP TABLE _part_remap AS
SELECT p.id AS old_id, k.keep_id AS new_id
FROM public.parts p
JOIN _part_keep k ON k.part_number = p.part_number
WHERE p.id <> k.keep_id;

-- Effective part_id helper for each child table: COALESCE(remap.new_id, child.part_id)
-- For each user+effective_part_id, keep one row and delete the rest.

WITH eff AS (
  SELECT c.id, c.user_id, COALESCE(r.new_id, c.part_id) AS eff_part
  FROM public.cart_items c LEFT JOIN _part_remap r ON r.old_id = c.part_id
),
ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, eff_part ORDER BY id) rn FROM eff
)
DELETE FROM public.cart_items c USING ranked WHERE c.id = ranked.id AND ranked.rn > 1;
UPDATE public.cart_items SET part_id = r.new_id FROM _part_remap r WHERE cart_items.part_id = r.old_id;

WITH eff AS (
  SELECT w.id, w.user_id, COALESCE(r.new_id, w.part_id) AS eff_part
  FROM public.wishlist_items w LEFT JOIN _part_remap r ON r.old_id = w.part_id
),
ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, eff_part ORDER BY id) rn FROM eff
)
DELETE FROM public.wishlist_items w USING ranked WHERE w.id = ranked.id AND ranked.rn > 1;
UPDATE public.wishlist_items SET part_id = r.new_id FROM _part_remap r WHERE wishlist_items.part_id = r.old_id;

WITH eff AS (
  SELECT rv.id, rv.user_id, COALESCE(r.new_id, rv.part_id) AS eff_part
  FROM public.recently_viewed rv LEFT JOIN _part_remap r ON r.old_id = rv.part_id
),
ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, eff_part ORDER BY id) rn FROM eff
)
DELETE FROM public.recently_viewed rv USING ranked WHERE rv.id = ranked.id AND ranked.rn > 1;
UPDATE public.recently_viewed SET part_id = r.new_id FROM _part_remap r WHERE recently_viewed.part_id = r.old_id;

UPDATE public.order_items SET part_id = r.new_id FROM _part_remap r WHERE order_items.part_id = r.old_id;
UPDATE public.quotation_items SET part_id = r.new_id FROM _part_remap r WHERE quotation_items.part_id = r.old_id;

DELETE FROM public.alternative_parts ap USING _part_remap r
  WHERE ap.part_id = r.old_id OR ap.alternative_part_id = r.old_id;
DELETE FROM public.part_compatibility pc USING _part_remap r WHERE pc.part_id = r.old_id;
DELETE FROM public.special_offer_products sop USING _part_remap r WHERE sop.part_id = r.old_id;
DELETE FROM public.stock_levels sl USING _part_remap r WHERE sl.part_id = r.old_id;
DELETE FROM public.stock_movements sm USING _part_remap r WHERE sm.part_id = r.old_id;
DELETE FROM public.diagram_hotspots dh USING _part_remap r WHERE dh.part_id = r.old_id;

DELETE FROM public.parts p USING _part_remap r WHERE p.id = r.old_id;

ALTER TABLE public.parts DROP CONSTRAINT IF EXISTS parts_part_number_manufacturer_key;
CREATE UNIQUE INDEX IF NOT EXISTS parts_part_number_uq ON public.parts(part_number);

DROP POLICY IF EXISTS "Public read active banners" ON public.hero_banners;
CREATE POLICY "Public read active banners" ON public.hero_banners FOR SELECT TO anon USING (is_active = true);
GRANT SELECT ON public.hero_banners TO anon;

DROP POLICY IF EXISTS "Public read active promos" ON public.promo_sections;
CREATE POLICY "Public read active promos" ON public.promo_sections FOR SELECT TO anon USING (is_active = true);
GRANT SELECT ON public.promo_sections TO anon;

DROP POLICY IF EXISTS "Public read active testimonials" ON public.testimonials;
CREATE POLICY "Public read active testimonials" ON public.testimonials FOR SELECT TO anon USING (is_active = true);
GRANT SELECT ON public.testimonials TO anon;

DROP POLICY IF EXISTS "Public read footer settings" ON public.site_settings;
CREATE POLICY "Public read footer settings" ON public.site_settings FOR SELECT TO anon USING (id = 'footer');
GRANT SELECT ON public.site_settings TO anon;
