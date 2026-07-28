UPDATE public.parts
SET
  ind_price = COALESCE(NULLIF(ind_price, 0), (specs->>'rate_price')::numeric, (specs->>'Rate Price')::numeric, price),
  gar_price = COALESCE(NULLIF(gar_price, 0), (specs->>'garage_price')::numeric, (specs->>'Garage Price')::numeric),
  export_price = COALESCE(NULLIF(export_price, 0), (specs->>'export_price')::numeric, (specs->>'Export Price')::numeric),
  price = COALESCE(NULLIF(price, 0), (specs->>'rate_price')::numeric, (specs->>'Rate Price')::numeric, price)
WHERE specs IS NOT NULL
  AND (
    specs ? 'rate_price' OR specs ? 'garage_price' OR specs ? 'export_price'
    OR specs ? 'Rate Price' OR specs ? 'Garage Price' OR specs ? 'Export Price'
  );