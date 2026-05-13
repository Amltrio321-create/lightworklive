
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS hourly_rate numeric(10,2);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cis_rate numeric(5,2) NOT NULL DEFAULT 20.00;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS utr_number text;

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  invoice_number text NOT NULL UNIQUE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_hours numeric(10,2) NOT NULL DEFAULT 0,
  gross_amount numeric(12,2) NOT NULL DEFAULT 0,
  cis_rate numeric(5,2) NOT NULL DEFAULT 20.00,
  cis_deduction numeric(12,2) NOT NULL DEFAULT 0,
  net_amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(worker_id, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL UNIQUE REFERENCES public.shifts(id) ON DELETE CASCADE,
  hours numeric(10,2) NOT NULL,
  hourly_rate numeric(10,2) NOT NULL,
  amount numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workers read own invoices" ON public.invoices
  FOR SELECT TO authenticated USING (worker_id = auth.uid());
CREATE POLICY "admins manage invoices" ON public.invoices
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "workers read own invoice items" ON public.invoice_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id AND i.worker_id = auth.uid())
  );
CREATE POLICY "admins manage invoice items" ON public.invoice_items
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Function: generate weekly invoices for all workers' ended shifts in a period
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
BEGIN
  FOR rec IN
    SELECT s.worker_id
    FROM shifts s
    LEFT JOIN invoice_items ii ON ii.shift_id = s.id
    WHERE s.status = 'ended'
      AND s.ended_at IS NOT NULL
      AND s.started_at IS NOT NULL
      AND s.hourly_rate IS NOT NULL
      AND s.ended_at::date >= _period_start
      AND s.ended_at::date <= _period_end
      AND ii.id IS NULL
    GROUP BY s.worker_id
  LOOP
    inv_no := 'INV-' || to_char(_period_end, 'YYYYMMDD') || '-' || substr(rec.worker_id::text, 1, 8);

    SELECT coalesce(cis_rate, 20.00) INTO cis FROM profiles WHERE id = rec.worker_id;
    cis := coalesce(cis, 20.00);

    INSERT INTO invoices (worker_id, invoice_number, period_start, period_end, cis_rate, status)
    VALUES (rec.worker_id, inv_no, _period_start, _period_end, cis, 'draft')
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
      WHERE s.worker_id = (SELECT worker_id FROM invoices WHERE id = inv_id)
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
