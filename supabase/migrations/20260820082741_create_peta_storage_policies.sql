/*
# Storage policies for peta bucket

## Purpose
Set up RLS policies on the storage.objects table for the `peta` bucket so that:
- Anyone (anon + authenticated) can READ/download map files.
- Only authenticated users (admin) can UPLOAD files.
- Only authenticated users (admin) can UPDATE/REPLACE files.
- Only authenticated users (admin) can DELETE files.
*/

DROP POLICY IF EXISTS "anon_read_peta_bucket" ON storage.objects;
CREATE POLICY "anon_read_peta_bucket" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'peta');

DROP POLICY IF EXISTS "auth_insert_peta_bucket" ON storage.objects;
CREATE POLICY "auth_insert_peta_bucket" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'peta');

DROP POLICY IF EXISTS "auth_update_peta_bucket" ON storage.objects;
CREATE POLICY "auth_update_peta_bucket" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'peta') WITH CHECK (bucket_id = 'peta');

DROP POLICY IF EXISTS "auth_delete_peta_bucket" ON storage.objects;
CREATE POLICY "auth_delete_peta_bucket" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'peta');
