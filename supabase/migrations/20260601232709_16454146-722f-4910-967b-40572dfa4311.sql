-- Add agreement tracking columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agreements_version text,
  ADD COLUMN IF NOT EXISTS agreements_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS vehicle_policy_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS drug_alcohol_policy_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS working_time_optout_accepted_at timestamptz;

-- Update handle_new_user trigger to capture agreement acceptance from metadata
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
BEGIN
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'worker');

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

  INSERT INTO public.profiles (
    id, full_name, phone, worker_ref, trade, right_to_work,
    company_name, company_address, utr_number,
    qualifications, driving_licence,
    agreements_version, agreements_accepted_at,
    vehicle_policy_accepted_at, drug_alcohol_policy_accepted_at,
    working_time_optout_accepted_at
  )
  VALUES (
    NEW.id,
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
$$;
