-- 1. Private schema for internal SECURITY DEFINER helpers (not exposed to PostgREST)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

-- 2. Recreate helper functions in `private`
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

CREATE OR REPLACE FUNCTION private.get_primary_role(_user_id uuid)
RETURNS public.app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  select role from public.user_roles where user_id = _user_id
  order by case role when 'admin' then 1 when 'client' then 2 when 'worker' then 3 end
  limit 1
$$;

CREATE OR REPLACE FUNCTION private.is_shift_client(_shift_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  select exists (
    select 1 from public.shifts s
    join public.sites si on si.id = s.site_id
    where s.id = _shift_id and si.client_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION private.is_site_client(_site_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  select exists (select 1 from public.sites where id = _site_id and client_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION private.worker_assigned_to_site(_site_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  select exists (select 1 from public.shifts where site_id = _site_id and worker_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
begin
  insert into public.profiles (
    id, full_name, phone, company_name, company_address,
    worker_ref, trade, right_to_work, utr_number,
    qualifications, driving_licence
  )
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'company_name',
    new.raw_user_meta_data->>'company_address',
    new.raw_user_meta_data->>'worker_ref',
    new.raw_user_meta_data->>'trade',
    coalesce((new.raw_user_meta_data->>'right_to_work')::boolean, false),
    new.raw_user_meta_data->>'utr_number',
    coalesce(
      (select array_agg(value::text) from jsonb_array_elements_text(
        coalesce(new.raw_user_meta_data->'qualifications', '[]'::jsonb)
      ) as value),
      '{}'
    ),
    new.raw_user_meta_data->>'driving_licence'
  );
  insert into public.user_roles (user_id, role)
  values (new.id, coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'worker'));
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION private.generate_weekly_invoices(_period_start date, _period_end date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  rec record;
  inv_id uuid;
  inv_no text;
  hrs numeric(10,2);
  amt numeric(12,2);
  total_hrs numeric(10,2);
  total_amt numeric(12,2);
  cis numeric(5,2);
  cis_amt numeric(12,2);
  created_count integer := 0;
  current_worker uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can generate invoices';
  END IF;

  FOR current_worker IN
    SELECT DISTINCT s.worker_id
    FROM shifts s
    LEFT JOIN invoice_items ii ON ii.shift_id = s.id
    WHERE s.status = 'ended'
      AND s.ended_at IS NOT NULL AND s.started_at IS NOT NULL
      AND s.hourly_rate IS NOT NULL
      AND s.ended_at::date >= _period_start
      AND s.ended_at::date <= _period_end
      AND ii.id IS NULL
  LOOP
    inv_no := 'INV-' || to_char(_period_end, 'YYYYMMDD') || '-' || substr(current_worker::text, 1, 8);
    SELECT coalesce(cis_rate, 20.00) INTO cis FROM profiles WHERE id = current_worker;
    cis := coalesce(cis, 20.00);

    INSERT INTO invoices (worker_id, invoice_number, period_start, period_end, cis_rate, status)
    VALUES (current_worker, inv_no, _period_start, _period_end, cis, 'draft')
    ON CONFLICT (worker_id, period_start, period_end) DO UPDATE SET cis_rate = EXCLUDED.cis_rate
    RETURNING id INTO inv_id;

    total_hrs := 0; total_amt := 0;
    FOR rec IN
      SELECT s.id AS shift_id,
             EXTRACT(EPOCH FROM (s.ended_at - s.started_at))/3600.0 AS hrs,
             s.hourly_rate
      FROM shifts s
      LEFT JOIN invoice_items ii ON ii.shift_id = s.id
      WHERE s.worker_id = current_worker
        AND s.status = 'ended'
        AND s.ended_at::date >= _period_start
        AND s.ended_at::date <= _period_end
        AND s.hourly_rate IS NOT NULL
        AND ii.id IS NULL
    LOOP
      hrs := round(rec.hrs::numeric, 2);
      amt := round((hrs * rec.hourly_rate)::numeric, 2);
      INSERT INTO invoice_items (invoice_id, shift_id, hours, hourly_rate, amount)
      VALUES (inv_id, rec.shift_id, hrs, rec.hourly_rate, amt);
      total_hrs := total_hrs + hrs;
      total_amt := total_amt + amt;
    END LOOP;

    cis_amt := round((total_amt * cis / 100.0)::numeric, 2);
    UPDATE invoices
    SET total_hours = total_hrs, gross_amount = total_amt,
        cis_deduction = cis_amt, net_amount = total_amt - cis_amt
    WHERE id = inv_id;
    created_count := created_count + 1;
  END LOOP;

  RETURN created_count;
END;
$$;

-- Lock down private function execution
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO postgres, service_role;

-- 3. Move trigger to private.handle_new_user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

-- 4. Recreate all RLS policies that referenced the public.* helpers to use private.*
-- profiles
DROP POLICY IF EXISTS "admins read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins manage profiles" ON public.profiles;
CREATE POLICY "admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- user_roles
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- sites
DROP POLICY IF EXISTS "admins read all sites" ON public.sites;
DROP POLICY IF EXISTS "admins manage sites" ON public.sites;
DROP POLICY IF EXISTS "workers read sites of their shifts" ON public.sites;
CREATE POLICY "admins read all sites" ON public.sites
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage sites" ON public.sites
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "workers read sites of their shifts" ON public.sites
  FOR SELECT TO authenticated USING (private.worker_assigned_to_site(id, auth.uid()));

-- shifts
DROP POLICY IF EXISTS "admins read all shifts" ON public.shifts;
DROP POLICY IF EXISTS "admins manage shifts" ON public.shifts;
DROP POLICY IF EXISTS "client reads shifts at own sites" ON public.shifts;
CREATE POLICY "admins read all shifts" ON public.shifts
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage shifts" ON public.shifts
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "client reads shifts at own sites" ON public.shifts
  FOR SELECT TO authenticated USING (private.is_site_client(site_id, auth.uid()));

-- location_pings
DROP POLICY IF EXISTS "client reads pings for shifts at own sites" ON public.location_pings;
DROP POLICY IF EXISTS "admins read all pings" ON public.location_pings;
CREATE POLICY "client reads pings for shifts at own sites" ON public.location_pings
  FOR SELECT TO authenticated USING (private.is_shift_client(shift_id, auth.uid()));
CREATE POLICY "admins read all pings" ON public.location_pings
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

-- photo_updates
DROP POLICY IF EXISTS "client reads photos for shifts at own sites" ON public.photo_updates;
DROP POLICY IF EXISTS "admins read all photos" ON public.photo_updates;
CREATE POLICY "client reads photos for shifts at own sites" ON public.photo_updates
  FOR SELECT TO authenticated USING (private.is_shift_client(shift_id, auth.uid()));
CREATE POLICY "admins read all photos" ON public.photo_updates
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

-- invoices / invoice_items
DROP POLICY IF EXISTS "admins manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "admins manage invoice items" ON public.invoice_items;
CREATE POLICY "admins manage invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage invoice items" ON public.invoice_items
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- storage.objects policy referenced public.has_role too
DROP POLICY IF EXISTS "admins read all shift photos" ON storage.objects;
CREATE POLICY "admins read all shift photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'shift-photos' AND private.has_role(auth.uid(), 'admin'));

-- 5. Drop the now-unused public helpers (CASCADE not needed: policies above were recreated)
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_shift_client(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_site_client(uuid, uuid);
DROP FUNCTION IF EXISTS public.worker_assigned_to_site(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_primary_role(uuid);
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.generate_weekly_invoices(date, date);

-- 6. Recreate thin SECURITY INVOKER wrappers in public for the two RPC-called functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$ SELECT private.has_role(_user_id, _role) $$;

CREATE OR REPLACE FUNCTION public.generate_weekly_invoices(_period_start date, _period_end date)
RETURNS integer LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT private.generate_weekly_invoices(_period_start, _period_end) $$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.generate_weekly_invoices(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_weekly_invoices(date, date) TO authenticated, service_role;

-- 7. Allow the private SECURITY DEFINER funcs to be invoked transitively from the wrappers.
-- (SECURITY DEFINER body runs as owner, but the caller still needs EXECUTE on the function itself.)
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.generate_weekly_invoices(date, date) TO authenticated;