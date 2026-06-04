
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT, INSERT ON public.location_pings TO authenticated;
GRANT SELECT, INSERT ON public.photo_updates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_qualifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.sites, public.shifts, public.profiles, public.user_roles, public.location_pings, public.photo_updates, public.worker_qualifications, public.invoices, public.invoice_items TO service_role;
