CREATE OR REPLACE FUNCTION public.search_parts_normalized(_q text, _brand text DEFAULT NULL, _limit int DEFAULT 25)
RETURNS TABLE (id uuid, part_number text, name text, manufacturer text, price numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.part_number, p.name, p.manufacturer, p.price
  FROM public.parts p
  WHERE (_brand IS NULL OR _brand = '' OR p.manufacturer = _brand)
    AND (
      _q IS NULL OR _q = '' OR
      p.name ILIKE '%' || _q || '%' OR
      p.manufacturer ILIKE '%' || _q || '%' OR
      regexp_replace(coalesce(p.part_number,''), '[^A-Za-z0-9]', '', 'g') ILIKE '%' || regexp_replace(_q, '[^A-Za-z0-9]', '', 'g') || '%' OR
      regexp_replace(coalesce(p.oem_number,''), '[^A-Za-z0-9]', '', 'g') ILIKE '%' || regexp_replace(_q, '[^A-Za-z0-9]', '', 'g') || '%'
    )
  ORDER BY p.created_at DESC
  LIMIT LEAST(coalesce(_limit, 25), 100);
$$;
GRANT EXECUTE ON FUNCTION public.search_parts_normalized(text, text, int) TO authenticated, service_role;