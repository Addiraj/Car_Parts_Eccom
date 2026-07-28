
create table public.ai_chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  guest_token text,
  title text not null default 'New conversation',
  vehicle_context jsonb not null default '{}'::jsonb,
  language text not null default 'en',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_chat_threads_user_idx on public.ai_chat_threads(user_id, last_message_at desc);
create index ai_chat_threads_guest_idx on public.ai_chat_threads(guest_token) where guest_token is not null;

grant select, insert, update, delete on public.ai_chat_threads to authenticated;
grant all on public.ai_chat_threads to service_role;

alter table public.ai_chat_threads enable row level security;

create policy "ai_threads_select" on public.ai_chat_threads
  for select to authenticated
  using (user_id = auth.uid()
    or public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'super_admin'::public.app_role)
    or exists (select 1 from public.customer_assignments ca
               where ca.customer_id = ai_chat_threads.user_id and ca.salesman_id = auth.uid()));
create policy "ai_threads_insert" on public.ai_chat_threads
  for insert to authenticated with check (user_id = auth.uid());
create policy "ai_threads_update" on public.ai_chat_threads
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ai_threads_delete" on public.ai_chat_threads
  for delete to authenticated using (user_id = auth.uid());

create trigger ai_chat_threads_updated_at before update on public.ai_chat_threads
  for each row execute function public.set_updated_at();

create table public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ai_chat_threads(id) on delete cascade,
  role text not null check (role in ('user','assistant','system','tool')),
  text text,
  parts jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  intent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index ai_chat_messages_thread_idx on public.ai_chat_messages(thread_id, created_at);

grant select, insert, update, delete on public.ai_chat_messages to authenticated;
grant all on public.ai_chat_messages to service_role;

alter table public.ai_chat_messages enable row level security;

create policy "ai_msgs_select" on public.ai_chat_messages
  for select to authenticated
  using (exists (select 1 from public.ai_chat_threads t where t.id = ai_chat_messages.thread_id
    and (t.user_id = auth.uid()
      or public.has_role(auth.uid(), 'admin'::public.app_role)
      or public.has_role(auth.uid(), 'super_admin'::public.app_role)
      or exists (select 1 from public.customer_assignments ca
                 where ca.customer_id = t.user_id and ca.salesman_id = auth.uid()))));
create policy "ai_msgs_insert" on public.ai_chat_messages
  for insert to authenticated
  with check (exists (select 1 from public.ai_chat_threads t where t.id = ai_chat_messages.thread_id and t.user_id = auth.uid()));
create policy "ai_msgs_delete" on public.ai_chat_messages
  for delete to authenticated
  using (exists (select 1 from public.ai_chat_threads t where t.id = ai_chat_messages.thread_id and t.user_id = auth.uid()));

create table public.ai_chat_events (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.ai_chat_threads(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index ai_chat_events_type_idx on public.ai_chat_events(event_type, created_at desc);
create index ai_chat_events_user_idx on public.ai_chat_events(user_id, created_at desc);

grant select, insert on public.ai_chat_events to authenticated;
grant all on public.ai_chat_events to service_role;

alter table public.ai_chat_events enable row level security;

create policy "ai_events_select" on public.ai_chat_events
  for select to authenticated
  using (user_id = auth.uid()
    or public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'super_admin'::public.app_role));
create policy "ai_events_insert" on public.ai_chat_events
  for insert to authenticated with check (user_id = auth.uid() or user_id is null);

create table public.ai_leads (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.ai_chat_threads(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  name text,
  phone text,
  email text,
  vehicle jsonb not null default '{}'::jsonb,
  reason text,
  status text not null default 'new' check (status in ('new','assigned','contacted','closed')),
  assigned_salesman_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_leads_status_idx on public.ai_leads(status, created_at desc);
create index ai_leads_salesman_idx on public.ai_leads(assigned_salesman_id);

grant select, insert, update, delete on public.ai_leads to authenticated;
grant all on public.ai_leads to service_role;

alter table public.ai_leads enable row level security;

create policy "ai_leads_select" on public.ai_leads
  for select to authenticated
  using (user_id = auth.uid()
    or public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'super_admin'::public.app_role)
    or assigned_salesman_id = auth.uid());
create policy "ai_leads_insert" on public.ai_leads
  for insert to authenticated with check (user_id = auth.uid() or user_id is null);
create policy "ai_leads_update" on public.ai_leads
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'super_admin'::public.app_role)
    or assigned_salesman_id = auth.uid());
create policy "ai_leads_delete" on public.ai_leads
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role) or public.has_role(auth.uid(), 'super_admin'::public.app_role));

create trigger ai_leads_updated_at before update on public.ai_leads
  for each row execute function public.set_updated_at();

create table public.vin_decode_cache (
  vin text primary key,
  payload jsonb not null,
  decoded_at timestamptz not null default now()
);

grant select on public.vin_decode_cache to authenticated;
grant all on public.vin_decode_cache to service_role;

alter table public.vin_decode_cache enable row level security;

create policy "vin_cache_read" on public.vin_decode_cache for select to authenticated using (true);
