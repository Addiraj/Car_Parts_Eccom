
-- ===== ADDRESSES =====
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  full_name text not null,
  phone text not null,
  emirate text not null,
  area text not null,
  street text not null,
  building text,
  landmark text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.addresses enable row level security;
create policy "address owner all" on public.addresses for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger trg_addr_updated before update on public.addresses
  for each row execute function public.set_updated_at();

-- ===== SHIPPING ZONES =====
create table public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  emirate text not null unique,
  fee numeric not null default 0,
  free_over numeric,
  eta_days_min int not null default 1,
  eta_days_max int not null default 3
);
alter table public.shipping_zones enable row level security;
create policy "public read shipping_zones" on public.shipping_zones for select to anon, authenticated using (true);
create policy "admin write shipping_zones" on public.shipping_zones for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

insert into public.shipping_zones (emirate, fee, free_over, eta_days_min, eta_days_max) values
  ('Dubai', 25, 300, 1, 2),
  ('Abu Dhabi', 35, 500, 1, 3),
  ('Sharjah', 30, 400, 1, 2),
  ('Ajman', 35, 400, 1, 3),
  ('Umm Al Quwain', 40, 500, 2, 4),
  ('Ras Al Khaimah', 45, 500, 2, 4),
  ('Fujairah', 50, 500, 2, 5);

-- ===== COUPONS =====
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric not null,
  min_order numeric not null default 0,
  max_uses int,
  used_count int not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.coupons enable row level security;
create policy "public read coupons" on public.coupons for select to anon, authenticated using (true);
create policy "admin write coupons" on public.coupons for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

insert into public.coupons (code, discount_type, discount_value, min_order) values
  ('DUBAI10', 'percent', 10, 200),
  ('WELCOME50', 'fixed', 50, 300);

-- ===== ORDERS =====
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('CPD-' || to_char(now(),'YYMMDD') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6)),
  user_id uuid not null,
  status text not null default 'placed' check (status in ('placed','confirmed','packed','shipped','delivered','cancelled')),
  payment_method text not null default 'cod' check (payment_method in ('cod','quote')),
  subtotal numeric not null default 0,
  vat numeric not null default 0,
  shipping_fee numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null default 0,
  currency text not null default 'AED',
  coupon_code text,
  shipping_address jsonb not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;
create policy "order owner select" on public.orders for select to authenticated
  using (auth.uid() = user_id or has_role(auth.uid(),'admin'));
create policy "order owner insert" on public.orders for insert to authenticated
  with check (auth.uid() = user_id);
create policy "admin update orders" on public.orders for update to authenticated
  using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
create trigger trg_order_updated before update on public.orders
  for each row execute function public.set_updated_at();
create index idx_orders_user on public.orders(user_id, created_at desc);

-- ===== ORDER ITEMS =====
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  part_id uuid,
  part_number text not null,
  name text not null,
  manufacturer text,
  image_url text,
  unit_price numeric not null,
  quantity int not null,
  line_total numeric not null
);
alter table public.order_items enable row level security;
create policy "order items via order" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or has_role(auth.uid(),'admin'))));
create policy "order items insert via own order" on public.order_items for insert to authenticated
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create index idx_order_items_order on public.order_items(order_id);

-- ===== ORDER EVENTS =====
create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);
alter table public.order_events enable row level security;
create policy "order events read via order" on public.order_events for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or has_role(auth.uid(),'admin'))));
create policy "order events admin write" on public.order_events for all to authenticated
  using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
create policy "order events owner insert on create" on public.order_events for insert to authenticated
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- ===== RECENTLY VIEWED =====
create table public.recently_viewed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  part_id uuid not null,
  viewed_at timestamptz not null default now(),
  unique (user_id, part_id)
);
alter table public.recently_viewed enable row level security;
create policy "rv owner all" on public.recently_viewed for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index idx_rv_user on public.recently_viewed(user_id, viewed_at desc);
