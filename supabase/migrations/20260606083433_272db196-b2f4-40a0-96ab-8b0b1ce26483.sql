
-- 1. Add super_admin enum value (safe in tx since not referenced as literal in this migration's DDL)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 2. Tenants table
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  primary_color text NOT NULL DEFAULT '#f97316',
  accent_color text NOT NULL DEFAULT '#facc15',
  contact_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 3. Tenant members
CREATE TABLE public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT ON public.tenant_members TO authenticated;
GRANT ALL ON public.tenant_members TO service_role;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- 4. Seed default tenant
INSERT INTO public.tenants (id, name, slug, primary_color, accent_color)
VALUES ('00000000-0000-0000-0000-000000000001', 'Light Work Live', 'lightworklive', '#f97316', '#facc15')
ON CONFLICT (slug) DO NOTHING;

-- 5. Backfill tenant_members for every existing user
INSERT INTO public.tenant_members (tenant_id, user_id)
SELECT '00000000-0000-0000-0000-000000000001', u.id
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

-- 6. Add tenant_id to data tables (nullable first, backfill, then NOT NULL)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.location_pings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.photo_updates ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.worker_qualifications ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

UPDATE public.profiles SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.sites SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.shifts SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.location_pings SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.photo_updates SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.worker_qualifications SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.invoices SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.invoice_items SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

ALTER TABLE public.profiles ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.sites ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.shifts ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.location_pings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.photo_updates ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.worker_qualifications ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.invoice_items ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_tenant_idx ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS sites_tenant_idx ON public.sites(tenant_id);
CREATE INDEX IF NOT EXISTS shifts_tenant_idx ON public.shifts(tenant_id);
CREATE INDEX IF NOT EXISTS location_pings_tenant_idx ON public.location_pings(tenant_id);
CREATE INDEX IF NOT EXISTS photo_updates_tenant_idx ON public.photo_updates(tenant_id);
CREATE INDEX IF NOT EXISTS worker_qualifications_tenant_idx ON public.worker_qualifications(tenant_id);
CREATE INDEX IF NOT EXISTS invoices_tenant_idx ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS invoice_items_tenant_idx ON public.invoice_items(tenant_id);

-- 7. Helpers
CREATE OR REPLACE FUNCTION private.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$ SELECT private.current_tenant_id() $$;

CREATE OR REPLACE FUNCTION private.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN private.has_role(_user_id, 'super_admin'::public.app_role);
END;
$$;

CREATE OR REPLACE FUNCTION private.is_tenant_admin(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.has_role(_user_id, 'admin'::public.app_role)
     AND EXISTS (SELECT 1 FROM public.tenant_members WHERE user_id=_user_id AND tenant_id=_tenant_id)
$$;

-- 8. RESTRICTIVE tenant-scope policies on data tables.
-- (Permissive role/owner policies already exist; restrictive policy enforces tenant boundary on top.)
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['profiles','sites','shifts','location_pings','photo_updates','worker_qualifications','invoices','invoice_items'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_scope ON public.%I', t);
    EXECUTE format($q$
      CREATE POLICY tenant_scope ON public.%I
      AS RESTRICTIVE
      FOR ALL
      TO authenticated
      USING (tenant_id = private.current_tenant_id() OR private.is_super_admin(auth.uid()))
      WITH CHECK (tenant_id = private.current_tenant_id() OR private.is_super_admin(auth.uid()))
    $q$, t);
  END LOOP;
END $$;

-- 9. Tenants & tenant_members policies
CREATE POLICY "members read own tenant" ON public.tenants
  FOR SELECT TO authenticated
  USING (id = private.current_tenant_id() OR private.is_super_admin(auth.uid()));

CREATE POLICY "tenant admins update own tenant" ON public.tenants
  FOR UPDATE TO authenticated
  USING (private.is_tenant_admin(auth.uid(), id) OR private.is_super_admin(auth.uid()))
  WITH CHECK (private.is_tenant_admin(auth.uid(), id) OR private.is_super_admin(auth.uid()));

CREATE POLICY "super admins manage tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (private.is_super_admin(auth.uid()))
  WITH CHECK (private.is_super_admin(auth.uid()));

CREATE POLICY "users read own membership" ON public.tenant_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_super_admin(auth.uid()));

CREATE POLICY "super admins manage memberships" ON public.tenant_members
  FOR ALL TO authenticated
  USING (private.is_super_admin(auth.uid()))
  WITH CHECK (private.is_super_admin(auth.uid()));

-- 10. updated_at trigger for tenants
CREATE OR REPLACE FUNCTION public.touch_tenants()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS tenants_touch ON public.tenants;
CREATE TRIGGER tenants_touch BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.touch_tenants();

-- 11. Update handle_new_user to assign tenant + auto-set tenant_id on profile
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_role public.app_role;
  v_quals text[];
  v_accept_ts timestamptz;
  v_tenant_id uuid;
  v_tenant_slug text;
BEGIN
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'worker');
  v_tenant_slug := COALESCE(NEW.raw_user_meta_data->>'tenant_slug', 'lightworklive');
  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = v_tenant_slug LIMIT 1;
  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'lightworklive' LIMIT 1;
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
    working_time_optout_accepted_at
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
    CASE WHEN (NEW.raw_user_meta_data->>'working_time_optout_accepted')::boolean IS TRUE THEN now() END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 12. Auto-fill tenant_id on inserts into data tables (so existing app code doesn't need to pass it)
CREATE OR REPLACE FUNCTION private.set_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := private.current_tenant_id();
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['sites','shifts','location_pings','photo_updates','worker_qualifications','invoices','invoice_items'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_tenant_id ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_tenant_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION private.set_tenant_id()', t);
  END LOOP;
END $$;
