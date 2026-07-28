
-- Helper: resolve salesman for a customer
CREATE OR REPLACE FUNCTION public._salesman_for(_customer_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT salesman_id FROM public.customer_assignments WHERE customer_id = _customer_id LIMIT 1 $$;

-- Cart activity + salesman notification
CREATE OR REPLACE FUNCTION public.trg_cart_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _sm uuid; _pn text; _nm text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_customer_activity(NEW.user_id, NEW.user_id, 'cart_item_added', 'part', NEW.part_id::text,
      jsonb_build_object('quantity', NEW.quantity));
    _sm := public._salesman_for(NEW.user_id);
    IF _sm IS NOT NULL THEN
      SELECT part_number, name INTO _pn, _nm FROM public.parts WHERE id = NEW.part_id;
      INSERT INTO public.admin_notifications(type, title, body, entity_type, entity_id, salesman_id, metadata)
      VALUES ('cart', 'Assigned customer added to cart',
        coalesce(_pn,'') || ' ' || coalesce(_nm,'') || ' x' || NEW.quantity,
        'part', NEW.part_id::text, _sm,
        jsonb_build_object('customer_id', NEW.user_id, 'part_id', NEW.part_id, 'quantity', NEW.quantity));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_customer_activity(OLD.user_id, OLD.user_id, 'cart_item_removed', 'part', OLD.part_id::text, '{}'::jsonb);
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_cart_activity ON public.cart_items;
CREATE TRIGGER trg_cart_activity
  AFTER INSERT OR DELETE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_cart_activity();

-- Wishlist activity
CREATE OR REPLACE FUNCTION public.trg_wishlist_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.log_customer_activity(NEW.user_id, NEW.user_id, 'wishlist_added', 'part', NEW.part_id::text, '{}'::jsonb);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_wishlist_activity ON public.wishlist_items;
CREATE TRIGGER trg_wishlist_activity
  AFTER INSERT ON public.wishlist_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_wishlist_activity();

-- AI chat prompt activity + salesman notification (only for signed-in user messages)
CREATE OR REPLACE FUNCTION public.trg_ai_prompt_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid; _sm uuid; _kind public.activity_type := 'ai_prompt'; _title text; _snippet text;
BEGIN
  IF NEW.role <> 'user' THEN RETURN NEW; END IF;
  SELECT user_id INTO _uid FROM public.ai_chat_threads WHERE id = NEW.thread_id;
  IF _uid IS NULL THEN RETURN NEW; END IF;

  _snippet := left(coalesce(NEW.text, ''), 200);
  IF _snippet ~* '\m[A-HJ-NPR-Z0-9]{17}\M' THEN _kind := 'ai_vin_asked';
  ELSIF _snippet ~* '\m[A-Z0-9][A-Z0-9\-]{4,}\M' AND _snippet ~* '(part|oem|number|#)' THEN _kind := 'ai_part_asked';
  END IF;

  PERFORM public.log_customer_activity(_uid, _uid, _kind, 'ai_thread', NEW.thread_id::text,
    jsonb_build_object('snippet', _snippet, 'intent', NEW.intent));

  _sm := public._salesman_for(_uid);
  IF _sm IS NOT NULL THEN
    _title := CASE _kind
      WHEN 'ai_vin_asked' THEN 'Assigned customer asked AI about a VIN'
      WHEN 'ai_part_asked' THEN 'Assigned customer asked AI about a part'
      ELSE 'Assigned customer sent an AI message' END;
    INSERT INTO public.admin_notifications(type, title, body, entity_type, entity_id, salesman_id, metadata)
    VALUES ('ai_lead', _title, _snippet, 'ai_thread', NEW.thread_id::text, _sm,
      jsonb_build_object('customer_id', _uid, 'thread_id', NEW.thread_id, 'kind', _kind));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ai_prompt_activity ON public.ai_chat_messages;
CREATE TRIGGER trg_ai_prompt_activity
  AFTER INSERT ON public.ai_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_ai_prompt_activity();

-- Salesman notification on assignment
CREATE OR REPLACE FUNCTION public.trg_notify_salesman_on_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _name text;
BEGIN
  SELECT coalesce(nullif(full_name,''), company_name, 'A customer') INTO _name FROM public.profiles WHERE id = NEW.customer_id;
  INSERT INTO public.admin_notifications(type, title, body, entity_type, entity_id, salesman_id, metadata)
  VALUES ('assignment', 'New customer assigned to you', _name, 'user', NEW.customer_id::text, NEW.salesman_id,
    jsonb_build_object('customer_id', NEW.customer_id));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_salesman_on_assignment ON public.customer_assignments;
CREATE TRIGGER trg_notify_salesman_on_assignment
  AFTER INSERT ON public.customer_assignments
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_salesman_on_assignment();

-- Salesman notification on order (in addition to admin notification)
CREATE OR REPLACE FUNCTION public.trg_notify_salesman_on_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _sm uuid;
BEGIN
  _sm := public._salesman_for(NEW.user_id);
  IF _sm IS NOT NULL THEN
    INSERT INTO public.admin_notifications(type, title, body, entity_type, entity_id, salesman_id, metadata)
    VALUES ('order', 'Assigned customer placed an order',
      'Order ' || coalesce(NEW.order_number,'') || ' · AED ' || coalesce(NEW.total::text,'0'),
      'order', NEW.id::text, _sm,
      jsonb_build_object('customer_id', NEW.user_id, 'order_number', NEW.order_number, 'total', NEW.total));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_salesman_on_order ON public.orders;
CREATE TRIGGER trg_notify_salesman_on_order
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_salesman_on_order();
