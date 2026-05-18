-- Status enum
DO $$ BEGIN
  CREATE TYPE public.qualification_status AS ENUM ('pending','verified','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table
CREATE TABLE IF NOT EXISTS public.worker_qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  qualification text NOT NULL,
  photo_path text NOT NULL,
  status public.qualification_status NOT NULL DEFAULT 'pending',
  notes text,
  verified_by uuid,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (worker_id, qualification)
);

ALTER TABLE public.worker_qualifications ENABLE ROW LEVEL SECURITY;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_worker_qualifications()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_touch_worker_qualifications ON public.worker_qualifications;
CREATE TRIGGER trg_touch_worker_qualifications
  BEFORE UPDATE ON public.worker_qualifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_worker_qualifications();

-- RLS policies
CREATE POLICY "workers read own qualifications" ON public.worker_qualifications
  FOR SELECT TO authenticated USING (worker_id = auth.uid());

CREATE POLICY "workers insert own qualifications" ON public.worker_qualifications
  FOR INSERT TO authenticated WITH CHECK (worker_id = auth.uid());

-- Workers can replace their own pending/rejected entries (e.g. re-upload), but cannot set status
CREATE POLICY "workers update own pending qualifications" ON public.worker_qualifications
  FOR UPDATE TO authenticated
  USING (worker_id = auth.uid() AND status <> 'verified')
  WITH CHECK (worker_id = auth.uid() AND status = 'pending');

CREATE POLICY "workers delete own pending qualifications" ON public.worker_qualifications
  FOR DELETE TO authenticated
  USING (worker_id = auth.uid() AND status = 'pending');

CREATE POLICY "admins manage qualifications" ON public.worker_qualifications
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- Storage bucket for qualification photos (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('qualification-photos', 'qualification-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: worker can read/write own folder; admins read all
CREATE POLICY "workers upload own qualification photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'qualification-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "workers read own qualification photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'qualification-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "workers replace own qualification photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'qualification-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "workers delete own qualification photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'qualification-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "admins read all qualification photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'qualification-photos'
    AND private.has_role(auth.uid(), 'admin')
  );

-- Helper: worker has at least one verified qualification
CREATE OR REPLACE FUNCTION private.worker_has_verified_qualification(_worker_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.worker_qualifications
    WHERE worker_id = _worker_id AND status = 'verified'
  )
$$;

REVOKE ALL ON FUNCTION private.worker_has_verified_qualification(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.worker_has_verified_qualification(uuid) TO authenticated, service_role;

-- Trigger: block workers from setting a shift to 'active' without a verified qualification
CREATE OR REPLACE FUNCTION private.enforce_verified_qualification_on_shift_start()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS DISTINCT FROM 'active')
     AND auth.uid() = NEW.worker_id
     AND NOT private.has_role(auth.uid(), 'admin')
     AND NOT private.worker_has_verified_qualification(NEW.worker_id) THEN
    RAISE EXCEPTION 'You need at least one admin-verified qualification before starting a shift.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_verified_qual ON public.shifts;
CREATE TRIGGER trg_enforce_verified_qual
  BEFORE UPDATE OF status ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION private.enforce_verified_qualification_on_shift_start();