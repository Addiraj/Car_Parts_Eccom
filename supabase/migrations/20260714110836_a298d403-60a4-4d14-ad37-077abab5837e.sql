
REVOKE EXECUTE ON FUNCTION public.wallet_debit(UUID,NUMERIC,UUID,TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.wallet_credit(UUID,NUMERIC,TEXT,TEXT,UUID,TEXT,TEXT,UUID,BOOLEAN) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.wallet_record_payment(UUID,NUMERIC,TEXT,TEXT,DATE,TEXT,UUID,UUID,TEXT,TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.wallet_check_and_freeze(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.next_statement_number() FROM PUBLIC, anon;

-- authenticated may execute; internal checks enforce ownership/role
GRANT EXECUTE ON FUNCTION public.wallet_debit(UUID,NUMERIC,UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_credit(UUID,NUMERIC,TEXT,TEXT,UUID,TEXT,TEXT,UUID,BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_record_payment(UUID,NUMERIC,TEXT,TEXT,DATE,TEXT,UUID,UUID,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_check_and_freeze(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_statement_number() TO authenticated;

-- Add auth guards
CREATE OR REPLACE FUNCTION public.wallet_debit(_user UUID, _amount NUMERIC, _order UUID, _order_number TEXT)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _w public.credit_wallets%ROWTYPE; _new NUMERIC;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> _user AND NOT public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT * INTO _w FROM public.credit_wallets WHERE user_id = _user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_WALLET'; END IF;
  IF NOT _w.is_active THEN RAISE EXCEPTION 'WALLET_FROZEN: %', COALESCE(_w.freeze_reason,'inactive'); END IF;
  IF _w.available_balance < _amount THEN RAISE EXCEPTION 'INSUFFICIENT_BALANCE: %', _w.available_balance; END IF;
  _new := _w.available_balance - _amount;
  UPDATE public.credit_wallets SET available_balance = _new, updated_at = now() WHERE id = _w.id;
  INSERT INTO public.credit_transactions(wallet_id, user_id, type, amount, balance_after, order_id, reason, remarks, updated_by, updated_by_name)
  VALUES (_w.id, _user, 'debit', _amount, _new, _order, 'Order payment',
          'Wallet debited, order ' || COALESCE(_order_number,''), NULL, 'System');
  RETURN _new;
END $$;

CREATE OR REPLACE FUNCTION public.wallet_credit(_wallet UUID, _amount NUMERIC, _reason TEXT, _remarks TEXT, _actor UUID, _actor_name TEXT, _actor_email TEXT, _order UUID, _uncap BOOLEAN DEFAULT false)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _w public.credit_wallets%ROWTYPE; _new NUMERIC;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT * INTO _w FROM public.credit_wallets WHERE id = _wallet FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_WALLET'; END IF;
  IF _uncap THEN _new := _w.available_balance + _amount;
  ELSE _new := LEAST(_w.available_balance + _amount, _w.credit_limit);
  END IF;
  UPDATE public.credit_wallets SET available_balance = _new, updated_at = now() WHERE id = _w.id;
  INSERT INTO public.credit_transactions(wallet_id, user_id, type, amount, balance_after, order_id, reason, remarks, updated_by, updated_by_name, updated_by_email)
  VALUES (_w.id, _w.user_id, 'credit', _amount, _new, _order, _reason, _remarks, _actor, _actor_name, _actor_email);
  RETURN _new;
END $$;

CREATE OR REPLACE FUNCTION public.wallet_record_payment(
  _wallet UUID, _amount NUMERIC, _method TEXT, _reference TEXT, _payment_date DATE,
  _notes TEXT, _statement UUID, _actor UUID, _actor_name TEXT, _actor_email TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _w public.credit_wallets%ROWTYPE; _new NUMERIC; _remarks TEXT; _st public.credit_billing_statements%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT * INTO _w FROM public.credit_wallets WHERE id = _wallet FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_WALLET'; END IF;

  INSERT INTO public.credit_payments(wallet_id, user_id, statement_id, amount, payment_method, payment_reference, payment_date, notes, recorded_by, recorded_by_name)
  VALUES (_w.id, _w.user_id, _statement, _amount, _method, _reference, COALESCE(_payment_date, current_date), _notes, _actor, _actor_name);

  _remarks := 'Payment recorded: ' || _method || COALESCE(' — Ref: ' || _reference, '');
  _new := public.wallet_credit(_w.id, _amount, 'Customer payment received', _remarks, _actor, _actor_name, _actor_email, NULL, false);

  IF _statement IS NOT NULL THEN
    UPDATE public.credit_billing_statements SET amount_paid = amount_paid + _amount WHERE id = _statement;
    SELECT * INTO _st FROM public.credit_billing_statements WHERE id = _statement;
    IF _st.amount_paid >= _st.outstanding_amount THEN
      UPDATE public.credit_billing_statements SET status='paid' WHERE id = _statement;
    ELSIF _st.amount_paid > 0 THEN
      UPDATE public.credit_billing_statements SET status='partially_paid' WHERE id = _statement;
    END IF;
  END IF;

  IF NOT _w.is_active AND _w.freeze_reason ILIKE 'Auto-frozen%' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.credit_billing_statements
      WHERE wallet_id = _w.id AND status IN ('unpaid','partially_paid') AND due_date < current_date
    ) THEN
      UPDATE public.credit_wallets SET is_active=true, frozen_at=NULL, freeze_reason=NULL WHERE id = _w.id;
    END IF;
  END IF;

  RETURN jsonb_build_object('new_balance', _new);
END $$;

CREATE OR REPLACE FUNCTION public.wallet_check_and_freeze(_user UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _w public.credit_wallets%ROWTYPE; _ovs RECORD; _name TEXT;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> _user AND NOT public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT * INTO _w FROM public.credit_wallets WHERE user_id = _user FOR UPDATE;
  IF NOT FOUND OR NOT _w.auto_freeze_on_overdue OR NOT _w.is_active THEN RETURN false; END IF;
  SELECT statement_number, due_date, outstanding_amount - amount_paid AS remaining INTO _ovs
  FROM public.credit_billing_statements
  WHERE wallet_id = _w.id AND status IN ('unpaid','partially_paid') AND due_date < current_date
  ORDER BY due_date ASC LIMIT 1;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.credit_wallets SET is_active=false, frozen_at=now(),
    freeze_reason='Auto-frozen: Overdue statement ' || _ovs.statement_number || ' (due ' || to_char(_ovs.due_date,'DD Mon YYYY') || ')'
    WHERE id = _w.id;
  SELECT COALESCE(NULLIF(full_name,''), company_name, 'Customer') INTO _name FROM public.profiles WHERE id = _user;
  INSERT INTO public.admin_notifications(type, title, body, entity_type, entity_id, metadata)
  VALUES ('credit_freeze','Credit Wallet Frozen',
    _name || ' wallet frozen: overdue statement ' || _ovs.statement_number,
    'wallet', _w.id::text,
    jsonb_build_object('user_id',_user,'statement_number',_ovs.statement_number,'remaining',_ovs.remaining));
  RETURN true;
END $$;
