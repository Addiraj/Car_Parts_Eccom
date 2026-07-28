
-- Extend orders payment_method to include wallet + stripe
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method = ANY (ARRAY['cod','quote','stripe','wallet']::text[]));

-- ============ credit_wallets ============
CREATE TABLE public.credit_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (credit_limit >= 0),
  available_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'AED',
  is_active BOOLEAN NOT NULL DEFAULT true,
  payment_terms_days INTEGER NOT NULL DEFAULT 30,
  auto_freeze_on_overdue BOOLEAN NOT NULL DEFAULT true,
  frozen_at TIMESTAMPTZ,
  freeze_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_wallets TO authenticated;
GRANT ALL ON public.credit_wallets TO service_role;
ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer read own wallet" ON public.credit_wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage wallets" ON public.credit_wallets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_credit_wallets_updated BEFORE UPDATE ON public.credit_wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ credit_transactions ============
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.credit_wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  type TEXT NOT NULL CHECK (type IN ('credit','debit')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  balance_after NUMERIC(12,2) NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  reason TEXT,
  remarks TEXT,
  updated_by UUID,
  updated_by_name TEXT,
  updated_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_credit_tx_wallet ON public.credit_transactions(wallet_id, created_at DESC);
CREATE INDEX ix_credit_tx_user ON public.credit_transactions(user_id, created_at DESC);
GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer read own tx" ON public.credit_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage tx" ON public.credit_transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ billing statements ============
CREATE SEQUENCE IF NOT EXISTS public.statement_number_seq;

CREATE OR REPLACE FUNCTION public.next_statement_number()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT 'SOA-' || to_char(now(),'YYYY-MM') || '-' || lpad(nextval('public.statement_number_seq')::text,5,'0')
$$;

CREATE TABLE public.credit_billing_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_number TEXT NOT NULL UNIQUE,
  wallet_id UUID NOT NULL REFERENCES public.credit_wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  opening_balance NUMERIC(12,2) NOT NULL,
  total_debits NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_credits NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(12,2) NOT NULL,
  outstanding_amount NUMERIC(12,2) NOT NULL,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','partially_paid','paid','overdue')),
  notes TEXT,
  generated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_stmts_wallet ON public.credit_billing_statements(wallet_id, period_end DESC);
GRANT SELECT ON public.credit_billing_statements TO authenticated;
GRANT ALL ON public.credit_billing_statements TO service_role;
ALTER TABLE public.credit_billing_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer read own stmts" ON public.credit_billing_statements FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage stmts" ON public.credit_billing_statements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ credit_payments ============
CREATE TABLE public.credit_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.credit_wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  statement_id UUID REFERENCES public.credit_billing_statements(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer','cash','cheque','card','other')),
  payment_reference TEXT,
  payment_date DATE NOT NULL DEFAULT current_date,
  notes TEXT,
  recorded_by UUID NOT NULL,
  recorded_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_pay_wallet ON public.credit_payments(wallet_id, payment_date DESC);
GRANT SELECT ON public.credit_payments TO authenticated;
GRANT ALL ON public.credit_payments TO service_role;
ALTER TABLE public.credit_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer read own pay" ON public.credit_payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage pay" ON public.credit_payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ payment_settings ============
CREATE TABLE public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_settings TO authenticated;
GRANT ALL ON public.payment_settings TO service_role;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "any authed read settings" ON public.payment_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write settings" ON public.payment_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.payment_settings(setting_key, setting_value, description) VALUES
('cod_limits',
 '{"IND":{"enabled":true,"max_amount":5000},"GAR":{"enabled":true,"max_amount":20000},"EXP":{"enabled":false,"max_amount":0}}'::jsonb,
 'Maximum order value allowed for Cash on Delivery per customer type');

-- ============ helper functions ============

-- Wallet debit (atomic). Raises exception on any failure.
CREATE OR REPLACE FUNCTION public.wallet_debit(_user UUID, _amount NUMERIC, _order UUID, _order_number TEXT)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _w public.credit_wallets%ROWTYPE; _new NUMERIC;
BEGIN
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

-- Wallet credit (cap at credit_limit unless _uncap true)
CREATE OR REPLACE FUNCTION public.wallet_credit(_wallet UUID, _amount NUMERIC, _reason TEXT, _remarks TEXT, _actor UUID, _actor_name TEXT, _actor_email TEXT, _order UUID, _uncap BOOLEAN DEFAULT false)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _w public.credit_wallets%ROWTYPE; _new NUMERIC;
BEGIN
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

-- Auto-freeze on overdue
CREATE OR REPLACE FUNCTION public.wallet_check_and_freeze(_user UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _w public.credit_wallets%ROWTYPE; _ovs RECORD; _name TEXT;
BEGIN
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

-- Record a customer payment
CREATE OR REPLACE FUNCTION public.wallet_record_payment(
  _wallet UUID, _amount NUMERIC, _method TEXT, _reference TEXT, _payment_date DATE,
  _notes TEXT, _statement UUID, _actor UUID, _actor_name TEXT, _actor_email TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _w public.credit_wallets%ROWTYPE; _new NUMERIC; _remarks TEXT; _st_paid NUMERIC; _st public.credit_billing_statements%ROWTYPE;
BEGIN
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

  -- Auto-unfreeze if no more overdue statements
  IF NOT _w.is_active AND _w.freeze_reason ILIKE 'Auto-frozen%' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.credit_billing_statements
      WHERE wallet_id = _w.id AND status IN ('unpaid','partially_paid') AND due_date < current_date
    ) THEN
      UPDATE public.credit_wallets SET is_active=true, frozen_at=NULL, freeze_reason=NULL WHERE id = _w.id;
      INSERT INTO public.credit_transactions(wallet_id, user_id, type, amount, balance_after, reason, remarks, updated_by, updated_by_name)
      VALUES (_w.id, _w.user_id, 'credit', 0, _new, 'Wallet reactivated — overdue payment settled', 'Auto-unfreeze', _actor, _actor_name);
    END IF;
  END IF;

  RETURN jsonb_build_object('new_balance', _new);
END $$;
