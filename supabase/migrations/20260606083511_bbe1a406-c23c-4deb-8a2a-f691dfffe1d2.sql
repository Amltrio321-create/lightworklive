
CREATE POLICY "anyone reads tenant branding" ON storage.objects
  FOR SELECT TO authenticated, anon
  USING (bucket_id = 'tenant-branding');

CREATE POLICY "tenant admins upload branding" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-branding'
    AND (
      private.is_super_admin(auth.uid())
      OR private.is_tenant_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
    )
  );

CREATE POLICY "tenant admins update branding" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'tenant-branding'
    AND (
      private.is_super_admin(auth.uid())
      OR private.is_tenant_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
    )
  );

CREATE POLICY "tenant admins delete branding" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'tenant-branding'
    AND (
      private.is_super_admin(auth.uid())
      OR private.is_tenant_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
    )
  );
