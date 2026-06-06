
ALTER TABLE public.profiles ALTER COLUMN tenant_id SET DEFAULT private.current_tenant_id();
ALTER TABLE public.sites ALTER COLUMN tenant_id SET DEFAULT private.current_tenant_id();
ALTER TABLE public.shifts ALTER COLUMN tenant_id SET DEFAULT private.current_tenant_id();
ALTER TABLE public.location_pings ALTER COLUMN tenant_id SET DEFAULT private.current_tenant_id();
ALTER TABLE public.photo_updates ALTER COLUMN tenant_id SET DEFAULT private.current_tenant_id();
ALTER TABLE public.worker_qualifications ALTER COLUMN tenant_id SET DEFAULT private.current_tenant_id();
ALTER TABLE public.invoices ALTER COLUMN tenant_id SET DEFAULT private.current_tenant_id();
ALTER TABLE public.invoice_items ALTER COLUMN tenant_id SET DEFAULT private.current_tenant_id();
