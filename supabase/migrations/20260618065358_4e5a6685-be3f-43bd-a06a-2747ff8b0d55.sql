
-- Customer type enum and additive pricing columns
do $$ begin
  create type public.customer_type as enum ('IND','GAR','EXP');
exception when duplicate_object then null; end $$;

alter table public.profiles
  add column if not exists customer_type public.customer_type not null default 'IND';

alter table public.parts
  add column if not exists ind_price numeric(12,2),
  add column if not exists gar_price numeric(12,2),
  add column if not exists export_price numeric(12,2);

-- Backfill ind_price from existing price when null
update public.parts set ind_price = price where ind_price is null;

alter table public.orders
  add column if not exists customer_type public.customer_type;

alter table public.order_items
  add column if not exists customer_type public.customer_type,
  add column if not exists price_tier text;

-- Helper to read caller's tier (used inside server fns via supabase RPC if needed)
create or replace function public.get_user_customer_type(_uid uuid)
returns public.customer_type
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select customer_type from public.profiles where id = _uid), 'IND'::public.customer_type);
$$;

grant execute on function public.get_user_customer_type(uuid) to authenticated, anon;

-- Update signup trigger to capture customer_type from raw_user_meta_data
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ct public.customer_type;
begin
  begin
    ct := coalesce(nullif(new.raw_user_meta_data->>'customer_type','')::public.customer_type, 'IND');
  exception when others then
    ct := 'IND';
  end;

  insert into public.profiles (id, full_name, customer_type)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), ct);

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer');

  return new;
end;
$$;

-- Admin can update profiles (for changing customer_type)
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "profiles admin select" on public.profiles;
create policy "profiles admin select" on public.profiles
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
