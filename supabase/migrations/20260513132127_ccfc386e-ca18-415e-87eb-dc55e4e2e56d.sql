
CREATE OR REPLACE FUNCTION public.generate_weekly_invoices(_period_start date, _period_end date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  -- Allow service_role / superuser (cron) OR admin users
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can generate invoices';
  END IF;

  FOR current_worker IN
    SELECT DISTINCT s.worker_id
    FROM shifts s
    LEFT JOIN invoice_items ii ON ii.shift_id = s.id
    WHERE s.status = 'ended'
      AND s.ended_at IS NOT NULL
      AND s.started_at IS NOT NULL
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

    total_hrs := 0;
    total_amt := 0;

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
    SET total_hours = total_hrs,
        gross_amount = total_amt,
        cis_deduction = cis_amt,
        net_amount = total_amt - cis_amt
    WHERE id = inv_id;

    created_count := created_count + 1;
  END LOOP;

  RETURN created_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_weekly_invoices(date, date) TO authenticated;
