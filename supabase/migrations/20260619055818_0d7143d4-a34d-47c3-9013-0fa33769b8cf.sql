
CREATE TYPE public.customer_status AS ENUM ('pending','active','suspended');

ALTER TABLE public.profiles
  ADD COLUMN status public.customer_status NOT NULL DEFAULT 'active',
  ADD COLUMN admin_notes text,
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN approved_by uuid,
  ADD COLUMN company_name text,
  ADD COLUMN trade_license text,
  ADD COLUMN vat_number text,
  ADD COLUMN credit_limit numeric NOT NULL DEFAULT 0;

UPDATE public.profiles SET status = 'active' WHERE status IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  ct public.customer_type;
  st public.customer_status;
begin
  begin
    ct := coalesce(nullif(new.raw_user_meta_data->>'customer_type','')::public.customer_type, 'IND');
  exception when others then
    ct := 'IND';
  end;

  st := case when ct = 'IND' then 'active'::public.customer_status else 'pending'::public.customer_status end;

  insert into public.profiles (id, full_name, customer_type, status, approved_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    ct,
    st,
    case when st = 'active' then now() else null end
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer');

  return new;
end;
$function$;
