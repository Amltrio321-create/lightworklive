
CREATE POLICY "client reads invoices for shifts at own sites"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoice_items ii
    JOIN public.shifts s ON s.id = ii.shift_id
    JOIN public.sites st ON st.id = s.site_id
    WHERE ii.invoice_id = invoices.id AND st.client_id = auth.uid()
  )
);

CREATE POLICY "client reads invoice items for shifts at own sites"
ON public.invoice_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shifts s
    JOIN public.sites st ON st.id = s.site_id
    WHERE s.id = invoice_items.shift_id AND st.client_id = auth.uid()
  )
);
