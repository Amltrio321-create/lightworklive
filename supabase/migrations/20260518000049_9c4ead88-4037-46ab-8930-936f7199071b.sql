-- Add qualifications and driving licence to worker profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS qualifications text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS driving_licence text;

-- Update handle_new_user to capture new fields from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  values (new.id, coalesce((new.raw_user_meta_data->>'role')::app_role, 'worker'));
  return new;
end;
$function$;