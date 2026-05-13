
REVOKE EXECUTE ON FUNCTION public.generate_weekly_invoices(date, date) FROM anon, authenticated, public;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'generate-weekly-cis-invoices',
  '0 6 * * 1',
  $$ SELECT public.generate_weekly_invoices((current_date - interval '7 days')::date, (current_date - interval '1 day')::date); $$
);
