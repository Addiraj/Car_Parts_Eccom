
-- Enums
do $$ begin
  create type public.offer_discount_type as enum ('percentage','fixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.offer_status as enum ('active','scheduled','expired','disabled');
exception when duplicate_object then null; end $$;

-- Main table
create table if not exists public.special_offers (
  id uuid primary key default gen_random_uuid(),
  offer_name text not null,
  description text,
  discount_type public.offer_discount_type not null,
  discount_value numeric(12,2) not null check (discount_value >= 0),
  start_date timestamptz not null,
  end_date timestamptz not null,
  status public.offer_status not null default 'scheduled',
  max_discount_amount numeric(12,2),
  min_order_value numeric(12,2),
  allow_stacking boolean not null default false,
  eligible_customer_types text[] not null default array['IND','GAR','EXP']::text[],
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.special_offers to anon;
grant select, insert, update, delete on public.special_offers to authenticated;
grant all on public.special_offers to service_role;
alter table public.special_offers enable row level security;

create policy "offers_public_read_active" on public.special_offers for select
  to anon, authenticated
  using (status = 'active' and now() between start_date and end_date);

create policy "offers_admin_read_all" on public.special_offers for select
  to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "offers_admin_insert" on public.special_offers for insert
  to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "offers_admin_update" on public.special_offers for update
  to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "offers_admin_delete" on public.special_offers for delete
  to authenticated using (public.has_role(auth.uid(),'admin'));

create trigger trg_special_offers_updated
  before update on public.special_offers
  for each row execute function public.set_updated_at();

create index if not exists special_offers_status_idx on public.special_offers(status);
create index if not exists special_offers_dates_idx on public.special_offers(start_date, end_date);

-- Join: offer <-> parts
create table if not exists public.special_offer_products (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.special_offers(id) on delete cascade,
  part_id uuid not null references public.parts(id) on delete cascade,
  unique (offer_id, part_id)
);
grant select on public.special_offer_products to anon;
grant select, insert, update, delete on public.special_offer_products to authenticated;
grant all on public.special_offer_products to service_role;
alter table public.special_offer_products enable row level security;
create policy "sop_public_read" on public.special_offer_products for select to anon, authenticated
  using (exists (select 1 from public.special_offers o where o.id = offer_id and o.status='active' and now() between o.start_date and o.end_date)
         or public.has_role(auth.uid(),'admin'));
create policy "sop_admin_write" on public.special_offer_products for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create index if not exists sop_offer_idx on public.special_offer_products(offer_id);
create index if not exists sop_part_idx on public.special_offer_products(part_id);

-- Join: offer <-> brands
create table if not exists public.special_offer_brands (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.special_offers(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  unique (offer_id, brand_id)
);
grant select on public.special_offer_brands to anon;
grant select, insert, update, delete on public.special_offer_brands to authenticated;
grant all on public.special_offer_brands to service_role;
alter table public.special_offer_brands enable row level security;
create policy "sob_public_read" on public.special_offer_brands for select to anon, authenticated
  using (exists (select 1 from public.special_offers o where o.id = offer_id and o.status='active' and now() between o.start_date and o.end_date)
         or public.has_role(auth.uid(),'admin'));
create policy "sob_admin_write" on public.special_offer_brands for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create index if not exists sob_offer_idx on public.special_offer_brands(offer_id);
create index if not exists sob_brand_idx on public.special_offer_brands(brand_id);

-- Join: offer <-> categories
create table if not exists public.special_offer_categories (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.special_offers(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  unique (offer_id, category_id)
);
grant select on public.special_offer_categories to anon;
grant select, insert, update, delete on public.special_offer_categories to authenticated;
grant all on public.special_offer_categories to service_role;
alter table public.special_offer_categories enable row level security;
create policy "soc_public_read" on public.special_offer_categories for select to anon, authenticated
  using (exists (select 1 from public.special_offers o where o.id = offer_id and o.status='active' and now() between o.start_date and o.end_date)
         or public.has_role(auth.uid(),'admin'));
create policy "soc_admin_write" on public.special_offer_categories for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create index if not exists soc_offer_idx on public.special_offer_categories(offer_id);
create index if not exists soc_category_idx on public.special_offer_categories(category_id);

-- Function: refresh statuses based on date window
create or replace function public.refresh_offer_statuses()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.special_offers
    set status = 'expired'
    where status in ('active','scheduled')
      and end_date < now();
  update public.special_offers
    set status = 'active'
    where status = 'scheduled'
      and start_date <= now()
      and end_date >= now();
end;
$$;

-- Schedule via pg_cron (every 5 minutes)
create extension if not exists pg_cron;
do $$ begin
  perform cron.unschedule('refresh-offer-statuses');
exception when others then null; end $$;
select cron.schedule('refresh-offer-statuses', '*/5 * * * *', $$ select public.refresh_offer_statuses(); $$);

-- Helper: get best active offer for a single part (returns one row or none)
create or replace function public.get_active_offer_for_part(_part_id uuid)
returns table (
  offer_id uuid,
  offer_name text,
  discount_type public.offer_discount_type,
  discount_value numeric,
  max_discount_amount numeric,
  end_date timestamptz,
  start_date timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with p as (
    select id, brand_id, category_id from public.parts where id = _part_id
  ),
  candidates as (
    select o.*, 1 as priority
      from public.special_offers o
      join public.special_offer_products sop on sop.offer_id = o.id and sop.part_id = _part_id
      where o.status='active' and now() between o.start_date and o.end_date
    union all
    select o.*, 2 as priority
      from public.special_offers o
      join public.special_offer_categories soc on soc.offer_id = o.id
      join p on p.category_id = soc.category_id
      where o.status='active' and now() between o.start_date and o.end_date
    union all
    select o.*, 3 as priority
      from public.special_offers o
      join public.special_offer_brands sob on sob.offer_id = o.id
      join p on p.brand_id = sob.brand_id
      where o.status='active' and now() between o.start_date and o.end_date
  )
  select id, offer_name, discount_type, discount_value, max_discount_amount, end_date, start_date
    from candidates
    order by priority asc, discount_value desc
    limit 1;
$$;

grant execute on function public.get_active_offer_for_part(uuid) to anon, authenticated;
grant execute on function public.refresh_offer_statuses() to authenticated, service_role;
