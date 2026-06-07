
-- 1. New columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS client_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS client_id uuid,
  ADD COLUMN IF NOT EXISTS client_logo_url text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_client_code_format CHECK (client_code IS NULL OR client_code ~ '^\d{4}$');

CREATE INDEX IF NOT EXISTS idx_profiles_client_id ON public.profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_profiles_client_code ON public.profiles(client_code);

-- 2. Client-approval on invoice items
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS client_approval text NOT NULL DEFAULT 'pending'
    CHECK (client_approval IN ('pending','approved','rejected'));

-- 3. Helper: generate unique 4-digit client code
CREATE OR REPLACE FUNCTION private.generate_client_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
  tries int := 0;
BEGIN
  LOOP
    code := lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE client_code = code) THEN
      RETURN code;
    END IF;
    tries := tries + 1;
    IF tries > 100 THEN
      RAISE EXCEPTION 'Could not generate unique client code';
    END IF;
  END LOOP;
END $$;

-- 4. Backfill codes for any existing clients
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.id FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'client'
    WHERE p.client_code IS NULL
  LOOP
    UPDATE public.profiles SET client_code = private.generate_client_code() WHERE id = r.id;
  END LOOP;
END $$;

-- 5. Rewrite handle_new_user to assign client_code (clients) and resolve client_id (workers)
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
  v_quals text[];
  v_accept_ts timestamptz;
  v_tenant_id uuid;
  v_tenant_slug text;
  v_client_code text;
  v_client_id uuid;
  v_new_client_code text;
BEGIN
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'worker');
  v_tenant_slug := COALESCE(NEW.raw_user_meta_data->>'tenant_slug', 'lightworklive');
  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = v_tenant_slug LIMIT 1;
  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'lightworklive' LIMIT 1;
  END IF;

  -- Workers: validate client code
  IF v_role = 'worker' THEN
    v_client_code := NEW.raw_user_meta_data->>'client_code';
    IF v_client_code IS NULL OR v_client_code !~ '^\d{4}$' THEN
      RAISE EXCEPTION 'A valid 4-digit Client ID is required to sign up as an operative.';
    END IF;
    SELECT id INTO v_client_id FROM public.profiles WHERE client_code = v_client_code LIMIT 1;
    IF v_client_id IS NULL THEN
      RAISE EXCEPTION 'Client ID % does not match any client.', v_client_code;
    END IF;
  END IF;

  -- Clients: generate unique 4-digit code
  IF v_role = 'client' THEN
    v_new_client_code := private.generate_client_code();
  END IF;

  BEGIN
    SELECT COALESCE(array_agg(value), '{}')
      INTO v_quals
      FROM jsonb_array_elements_text(COALESCE(NEW.raw_user_meta_data->'qualifications', '[]'::jsonb)) AS value;
  EXCEPTION WHEN others THEN
    v_quals := '{}';
  END;

  v_accept_ts := CASE
    WHEN (NEW.raw_user_meta_data->>'agreements_accepted')::boolean IS TRUE THEN now()
    ELSE NULL
  END;

  INSERT INTO public.tenant_members (tenant_id, user_id)
  VALUES (v_tenant_id, NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.profiles (
    id, tenant_id, full_name, phone, worker_ref, trade, right_to_work,
    company_name, company_address, utr_number,
    qualifications, driving_licence,
    agreements_version, agreements_accepted_at,
    vehicle_policy_accepted_at, drug_alcohol_policy_accepted_at,
    working_time_optout_accepted_at,
    client_code, client_id
  )
  VALUES (
    NEW.id, v_tenant_id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'worker_ref',
    NEW.raw_user_meta_data->>'trade',
    COALESCE((NEW.raw_user_meta_data->>'right_to_work')::boolean, false),
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'company_address',
    NEW.raw_user_meta_data->>'utr_number',
    v_quals,
    NEW.raw_user_meta_data->>'driving_licence',
    NEW.raw_user_meta_data->>'agreements_version',
    v_accept_ts,
    CASE WHEN (NEW.raw_user_meta_data->>'vehicle_policy_accepted')::boolean IS TRUE THEN now() END,
    CASE WHEN (NEW.raw_user_meta_data->>'drug_alcohol_policy_accepted')::boolean IS TRUE THEN now() END,
    CASE WHEN (NEW.raw_user_meta_data->>'working_time_optout_accepted')::boolean IS TRUE THEN now() END,
    v_new_client_code, v_client_id
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END $$;

-- 6. Helper: is a worker linked to a given client?
CREATE OR REPLACE FUNCTION private.worker_belongs_to_client(_worker_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _worker_id AND client_id = _client_id)
$$;

-- 7. New RLS policies on shifts: clients can manage shifts at their sites for their workers
DROP POLICY IF EXISTS "clients manage shifts at own sites" ON public.shifts;
CREATE POLICY "clients manage shifts at own sites" ON public.shifts
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = shifts.site_id AND s.client_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = shifts.site_id AND s.client_id = auth.uid())
  AND private.worker_belongs_to_client(shifts.worker_id, auth.uid())
);

-- 8. Clients can read profiles of their own operatives
DROP POLICY IF EXISTS "clients read own operatives" ON public.profiles;
CREATE POLICY "clients read own operatives" ON public.profiles
FOR SELECT TO authenticated
USING (client_id = auth.uid());

-- 9. Clients can update invoice item approval for shifts at their sites
DROP POLICY IF EXISTS "clients approve invoice items at own sites" ON public.invoice_items;
CREATE POLICY "clients approve invoice items at own sites" ON public.invoice_items
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shifts s JOIN public.sites st ON st.id = s.site_id
    WHERE s.id = invoice_items.shift_id AND st.client_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shifts s JOIN public.sites st ON st.id = s.site_id
    WHERE s.id = invoice_items.shift_id AND st.client_id = auth.uid()
  )
);

-- 10. Storage: clients can manage their own logo folder in tenant-branding
DROP POLICY IF EXISTS "clients manage own logo" ON storage.objects;
CREATE POLICY "clients manage own logo" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'tenant-branding'
  AND (storage.foldername(name))[1] = 'clients'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'tenant-branding'
  AND (storage.foldername(name))[1] = 'clients'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow workers/clients to read logo files for their linked client
DROP POLICY IF EXISTS "members read client logo" ON storage.objects;
CREATE POLICY "members read client logo" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'tenant-branding'
  AND (storage.foldername(name))[1] = 'clients'
);
