
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS worker_ref text,
  ADD COLUMN IF NOT EXISTS trade text,
  ADD COLUMN IF NOT EXISTS right_to_work boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS company_address text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, full_name, phone, company_name, company_address, worker_ref, trade, right_to_work)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'company_name',
    new.raw_user_meta_data->>'company_address',
    new.raw_user_meta_data->>'worker_ref',
    new.raw_user_meta_data->>'trade',
    coalesce((new.raw_user_meta_data->>'right_to_work')::boolean, false)
  );
  insert into public.user_roles (user_id, role)
  values (new.id, coalesce((new.raw_user_meta_data->>'role')::app_role, 'worker'));
  return new;
end;
$function$;
