
-- Track when invoice was sent
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS sent_at timestamptz;

-- Update handle_new_user to also persist utr_number
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, full_name, phone, company_name, company_address, worker_ref, trade, right_to_work, utr_number)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'company_name',
    new.raw_user_meta_data->>'company_address',
    new.raw_user_meta_data->>'worker_ref',
    new.raw_user_meta_data->>'trade',
    coalesce((new.raw_user_meta_data->>'right_to_work')::boolean, false),
    new.raw_user_meta_data->>'utr_number'
  );
  insert into public.user_roles (user_id, role)
  values (new.id, coalesce((new.raw_user_meta_data->>'role')::app_role, 'worker'));
  return new;
end;
$function$;
