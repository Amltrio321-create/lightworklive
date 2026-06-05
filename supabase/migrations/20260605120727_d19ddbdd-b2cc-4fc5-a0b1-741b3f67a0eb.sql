
REVOKE EXECUTE ON FUNCTION public.gps_hours_for_shift(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gps_hours_for_shift(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.assign_job_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_job_number() TO service_role;
