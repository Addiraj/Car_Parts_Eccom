
-- Extensions
create extension if not exists "pg_trgm";
create extension if not exists "unaccent";

-- ===== ROLES =====
create type public.app_role as enum ('admin', 'customer');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create policy "users view own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "admins view all roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ===== PROFILES =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles select own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert to authenticated with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  insert into public.user_roles (user_id, role) values (new.id, 'customer');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ===== CATALOG =====
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  logo_url text,
  country text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  slug text not null,
  name text not null,
  image_url text,
  created_at timestamptz not null default now(),
  unique (brand_id, slug)
);
create index on public.models(brand_id);

create table public.model_years (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  year int not null,
  unique (model_id, year)
);
create index on public.model_years(model_id);

create table public.engines (
  id uuid primary key default gen_random_uuid(),
  model_year_id uuid not null references public.model_years(id) on delete cascade,
  code text not null,
  name text not null,
  fuel_type text,
  displacement text,
  unique (model_year_id, code)
);
create index on public.engines(model_year_id);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete cascade,
  slug text not null,
  name text not null,
  icon text,
  display_order int not null default 0,
  unique (parent_id, slug)
);
create index on public.categories(parent_id);

create table public.parts (
  id uuid primary key default gen_random_uuid(),
  part_number text not null,
  oem_number text,
  name text not null,
  description text,
  specs jsonb not null default '{}'::jsonb,
  price numeric(12,2) not null default 0,
  currency text not null default 'AED',
  stock int not null default 0,
  brand_id uuid references public.brands(id) on delete set null,
  manufacturer text,
  is_oem boolean not null default true,
  category_id uuid references public.categories(id) on delete set null,
  images text[] not null default '{}',
  search_vec tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (part_number, manufacturer)
);
create index parts_search_vec_idx on public.parts using gin(search_vec);
create index parts_name_trgm_idx on public.parts using gin(name gin_trgm_ops);
create index parts_partnum_trgm_idx on public.parts using gin(part_number gin_trgm_ops);
create index parts_oem_trgm_idx on public.parts using gin(oem_number gin_trgm_ops);
create index on public.parts(category_id);
create index on public.parts(brand_id);

create or replace function public.parts_search_trigger()
returns trigger language plpgsql as $$
begin
  new.search_vec :=
    setweight(to_tsvector('simple', unaccent(coalesce(new.part_number,''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.oem_number,''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.name,''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.description,''))), 'C') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.manufacturer,''))), 'C');
  new.updated_at = now();
  return new;
end;
$$;
create trigger parts_search_vec_update before insert or update on public.parts
  for each row execute function public.parts_search_trigger();

create table public.part_compatibility (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.parts(id) on delete cascade,
  engine_id uuid not null references public.engines(id) on delete cascade,
  unique (part_id, engine_id)
);
create index on public.part_compatibility(part_id);
create index on public.part_compatibility(engine_id);

create table public.diagrams (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  engine_id uuid references public.engines(id) on delete cascade,
  title text not null,
  image_url text not null,
  width int not null default 1200,
  height int not null default 800,
  created_at timestamptz not null default now()
);
create index on public.diagrams(category_id);
create index on public.diagrams(engine_id);

create table public.diagram_hotspots (
  id uuid primary key default gen_random_uuid(),
  diagram_id uuid not null references public.diagrams(id) on delete cascade,
  part_id uuid not null references public.parts(id) on delete cascade,
  callout_number int not null,
  x numeric(6,4) not null,
  y numeric(6,4) not null,
  w numeric(6,4) not null default 0.04,
  h numeric(6,4) not null default 0.04,
  unique (diagram_id, callout_number)
);
create index on public.diagram_hotspots(diagram_id);
create index on public.diagram_hotspots(part_id);

create table public.alternative_parts (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.parts(id) on delete cascade,
  alternative_part_id uuid not null references public.parts(id) on delete cascade,
  unique (part_id, alternative_part_id),
  check (part_id <> alternative_part_id)
);

create table public.synonyms (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  canonical text not null,
  unique (term)
);

-- Public read for catalog
alter table public.brands enable row level security;
alter table public.models enable row level security;
alter table public.model_years enable row level security;
alter table public.engines enable row level security;
alter table public.categories enable row level security;
alter table public.parts enable row level security;
alter table public.part_compatibility enable row level security;
alter table public.diagrams enable row level security;
alter table public.diagram_hotspots enable row level security;
alter table public.alternative_parts enable row level security;
alter table public.synonyms enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array['brands','models','model_years','engines','categories','parts','part_compatibility','diagrams','diagram_hotspots','alternative_parts','synonyms'])
  loop
    execute format('create policy "public read %I" on public.%I for select to anon, authenticated using (true)', t, t);
    execute format('create policy "admin write %I" on public.%I for all to authenticated using (public.has_role(auth.uid(), ''admin'')) with check (public.has_role(auth.uid(), ''admin''))', t, t);
  end loop;
end$$;

-- ===== GARAGE =====
create table public.garages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text,
  vin text,
  brand_id uuid references public.brands(id) on delete set null,
  model_id uuid references public.models(id) on delete set null,
  model_year_id uuid references public.model_years(id) on delete set null,
  engine_id uuid references public.engines(id) on delete set null,
  brand_name text,
  model_name text,
  year int,
  engine_name text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.garages(user_id);
alter table public.garages enable row level security;
create policy "garage owner all" on public.garages for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===== CART & WISHLIST =====
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  part_id uuid not null references public.parts(id) on delete cascade,
  quantity int not null default 1 check (quantity > 0),
  added_at timestamptz not null default now(),
  unique (user_id, part_id)
);
create index on public.cart_items(user_id);
alter table public.cart_items enable row level security;
create policy "cart owner all" on public.cart_items for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  part_id uuid not null references public.parts(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (user_id, part_id)
);
create index on public.wishlist_items(user_id);
alter table public.wishlist_items enable row level security;
create policy "wishlist owner all" on public.wishlist_items for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
