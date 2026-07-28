CREATE POLICY "salesman read assigned carts" ON public.cart_items
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'salesman'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.customer_assignments ca
    WHERE ca.customer_id = cart_items.user_id
      AND ca.salesman_id = auth.uid()
  )
);