
-- Roles
create type public.app_role as enum ('admin', 'worker', 'client');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  company_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.get_primary_role(_user_id uuid)
returns app_role
language sql stable security definer set search_path = public
as $$
  select role from public.user_roles where user_id = _user_id
  order by case role when 'admin' then 1 when 'client' then 2 when 'worker' then 3 end
  limit 1
$$;

-- Sites (owned by a client user)
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  address text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);
alter table public.sites enable row level security;

-- Shifts: a worker assigned to a site
create type public.shift_status as enum ('scheduled', 'active', 'ended');

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  status shift_status not null default 'scheduled',
  notes text,
  created_at timestamptz not null default now()
);
alter table public.shifts enable row level security;
create index shifts_worker_idx on public.shifts(worker_id, status);
create index shifts_site_idx on public.shifts(site_id, status);

-- Location pings (continuous)
create table public.location_pings (
  id bigserial primary key,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  worker_id uuid not null references auth.users(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision,
  recorded_at timestamptz not null default now()
);
alter table public.location_pings enable row level security;
create index location_pings_shift_idx on public.location_pings(shift_id, recorded_at desc);

-- Photo updates (hourly)
create table public.photo_updates (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  worker_id uuid not null references auth.users(id) on delete cascade,
  photo_path text not null,
  caption text,
  latitude double precision,
  longitude double precision,
  taken_at timestamptz not null default now()
);
alter table public.photo_updates enable row level security;
create index photo_updates_shift_idx on public.photo_updates(shift_id, taken_at desc);

-- Helper: is this user the client owner of the shift's site?
create or replace function public.is_shift_client(_shift_id uuid, _user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.shifts s
    join public.sites si on si.id = s.site_id
    where s.id = _shift_id and si.client_id = _user_id
  )
$$;

-- ===== RLS Policies =====

-- profiles
create policy "users read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "admins read all profiles" on public.profiles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "users update own profile" on public.profiles for update to authenticated using (id = auth.uid());
create policy "users insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "admins manage profiles" on public.profiles for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- user_roles
create policy "users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "admins manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- sites
create policy "client reads own sites" on public.sites for select to authenticated using (client_id = auth.uid());
create policy "admins read all sites" on public.sites for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "workers read sites of their shifts" on public.sites for select to authenticated using (
  exists (select 1 from public.shifts s where s.site_id = sites.id and s.worker_id = auth.uid())
);
create policy "admins manage sites" on public.sites for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "clients manage own sites" on public.sites for all to authenticated using (client_id = auth.uid()) with check (client_id = auth.uid());

-- shifts
create policy "worker reads own shifts" on public.shifts for select to authenticated using (worker_id = auth.uid());
create policy "client reads shifts at own sites" on public.shifts for select to authenticated using (
  exists (select 1 from public.sites si where si.id = shifts.site_id and si.client_id = auth.uid())
);
create policy "admins read all shifts" on public.shifts for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "worker updates own shift status" on public.shifts for update to authenticated using (worker_id = auth.uid()) with check (worker_id = auth.uid());
create policy "admins manage shifts" on public.shifts for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- location_pings
create policy "worker inserts own pings" on public.location_pings for insert to authenticated with check (worker_id = auth.uid());
create policy "worker reads own pings" on public.location_pings for select to authenticated using (worker_id = auth.uid());
create policy "client reads pings for shifts at own sites" on public.location_pings for select to authenticated using (public.is_shift_client(shift_id, auth.uid()));
create policy "admins read all pings" on public.location_pings for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- photo_updates
create policy "worker inserts own photos" on public.photo_updates for insert to authenticated with check (worker_id = auth.uid());
create policy "worker reads own photos" on public.photo_updates for select to authenticated using (worker_id = auth.uid());
create policy "client reads photos for shifts at own sites" on public.photo_updates for select to authenticated using (public.is_shift_client(shift_id, auth.uid()));
create policy "admins read all photos" on public.photo_updates for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, company_name)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'company_name'
  );
  -- default role: worker (admin can change later)
  insert into public.user_roles (user_id, role)
  values (new.id, coalesce((new.raw_user_meta_data->>'role')::app_role, 'worker'));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Realtime
alter publication supabase_realtime add table public.location_pings;
alter publication supabase_realtime add table public.photo_updates;
alter publication supabase_realtime add table public.shifts;

-- Storage: photos bucket (private, signed URLs via RLS)
insert into storage.buckets (id, name, public) values ('shift-photos', 'shift-photos', false)
on conflict (id) do nothing;

create policy "workers upload to own folder" on storage.objects for insert to authenticated
with check (bucket_id = 'shift-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "workers read own photos" on storage.objects for select to authenticated
using (bucket_id = 'shift-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "admins read all shift photos" on storage.objects for select to authenticated
using (bucket_id = 'shift-photos' and public.has_role(auth.uid(), 'admin'));

create policy "clients read photos for their sites" on storage.objects for select to authenticated
using (
  bucket_id = 'shift-photos'
  and exists (
    select 1 from public.photo_updates pu
    join public.shifts s on s.id = pu.shift_id
    join public.sites si on si.id = s.site_id
    where pu.photo_path = storage.objects.name and si.client_id = auth.uid()
  )
);
