-- Add required qualifications to shifts
ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS required_qualifications text[] NOT NULL DEFAULT '{}';

-- Update enforcement: if shift specifies required quals, worker must have at least one verified
-- matching one of those; otherwise (empty) fall back to "any verified qualification".
CREATE OR REPLACE FUNCTION private.enforce_verified_qualification_on_shift_start()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ok boolean;
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS DISTINCT FROM 'active')
     AND auth.uid() = NEW.worker_id
     AND NOT private.has_role(auth.uid(), 'admin') THEN

    IF NEW.required_qualifications IS NULL OR array_length(NEW.required_qualifications, 1) IS NULL THEN
      ok := private.worker_has_verified_qualification(NEW.worker_id);
      IF NOT ok THEN
        RAISE EXCEPTION 'You need at least one admin-verified qualification before starting a shift.'
          USING ERRCODE = 'check_violation';
      END IF;
    ELSE
      SELECT EXISTS (
        SELECT 1 FROM public.worker_qualifications
        WHERE worker_id = NEW.worker_id
          AND status = 'verified'
          AND qualification = ANY (NEW.required_qualifications)
      ) INTO ok;
      IF NOT ok THEN
        RAISE EXCEPTION 'You need a verified qualification matching this shift''s requirements: %.',
          array_to_string(NEW.required_qualifications, ', ')
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;