
-- Helper functions to avoid RLS recursion between sites and shifts
create or replace function public.is_site_client(_site_id uuid, _user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.sites where id = _site_id and client_id = _user_id)
$$;

create or replace function public.worker_assigned_to_site(_site_id uuid, _user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.shifts where site_id = _site_id and worker_id = _user_id)
$$;

-- Replace recursive policy on shifts (was selecting from sites)
drop policy if exists "client reads shifts at own sites" on public.shifts;
create policy "client reads shifts at own sites" on public.shifts
  for select to authenticated
  using (public.is_site_client(site_id, auth.uid()));

-- Replace recursive policy on sites (was selecting from shifts)
drop policy if exists "workers read sites of their shifts" on public.sites;
create policy "workers read sites of their shifts" on public.sites
  for select to authenticated
  using (public.worker_assigned_to_site(id, auth.uid()));
