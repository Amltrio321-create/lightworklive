
-- 1. job_number on shifts
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS job_number text UNIQUE;

-- 2. GPS hours helper
CREATE OR REPLACE FUNCTION public.gps_hours_for_shift(_shift_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_seconds numeric := 0;
  prev_at timestamptz;
  cur_at timestamptz;
  gap_seconds numeric;
BEGIN
  FOR cur_at IN
    SELECT recorded_at FROM public.location_pings
    WHERE shift_id = _shift_id
    ORDER BY recorded_at ASC
  LOOP
    IF prev_at IS NOT NULL THEN
      gap_seconds := EXTRACT(EPOCH FROM (cur_at - prev_at));
      -- Ignore gaps over 20 min (worker likely offline / left site)
      IF gap_seconds <= 1200 THEN
        total_seconds := total_seconds + gap_seconds;
      END IF;
    END IF;
    prev_at := cur_at;
  END LOOP;
  RETURN round((total_seconds / 3600.0)::numeric, 2);
END;
$$;

GRANT EXECUTE ON FUNCTION public.gps_hours_for_shift(uuid) TO authenticated, service_role;

-- 3. Auto-assign job_number when shift ends
CREATE OR REPLACE FUNCTION public.assign_job_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'ended' AND NEW.job_number IS NULL THEN
    NEW.job_number := 'JOB-' || to_char(coalesce(NEW.ended_at, now()), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shifts_assign_job_number ON public.shifts;
CREATE TRIGGER shifts_assign_job_number
BEFORE INSERT OR UPDATE OF status ON public.shifts
FOR EACH ROW EXECUTE FUNCTION public.assign_job_number();

-- Backfill existing ended shifts
UPDATE public.shifts
SET job_number = 'JOB-' || to_char(coalesce(ended_at, created_at), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
WHERE status = 'ended' AND job_number IS NULL;

-- 4. Invoice item check columns
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS job_number text,
  ADD COLUMN IF NOT EXISTS gps_hours numeric,
  ADD COLUMN IF NOT EXISTS variance_pct numeric,
  ADD COLUMN IF NOT EXISTS check_status text DEFAULT 'ok';

-- 5. Rewrite generator to include GPS checks
CREATE OR REPLACE FUNCTION private.generate_weekly_invoices(_period_start date, _period_end date)
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
  gps_h numeric(10,2);
  variance numeric(6,2);
  chk text;
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
             s.job_number,
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
      gps_h := public.gps_hours_for_shift(rec.shift_id);
      IF gps_h IS NULL OR gps_h = 0 THEN
        chk := 'missing_gps';
        variance := NULL;
      ELSE
        variance := round((((hrs - gps_h) / NULLIF(hrs,0)) * 100)::numeric, 2);
        IF abs(variance) > 10 THEN chk := 'warning'; ELSE chk := 'ok'; END IF;
      END IF;

      INSERT INTO invoice_items (invoice_id, shift_id, hours, hourly_rate, amount, job_number, gps_hours, variance_pct, check_status)
      VALUES (inv_id, rec.shift_id, hrs, rec.hourly_rate, amt, rec.job_number, gps_h, variance, chk);
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
