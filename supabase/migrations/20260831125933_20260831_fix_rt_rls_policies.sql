/*
# Fix RLS policies for rt table

1. Problem
- The original migration (20260820082720) only created a SELECT policy for the `rt` table.
- There was NO UPDATE or INSERT policy, so all `supabase.from('rt').update({...})`
  calls from the frontend (editing kampus, kelompok_kkn, penanggung_jawab, link_kegiatan)
  failed silently — the data never reached the database.

2. Changes
- Adds an UPDATE policy (`auth_update_rt`) scoped to `authenticated` users so
  logged-in admins can update RT metadata (kampus, kelompok_kkn, penanggung_jawab,
  link_kegiatan). USING (true) + WITH CHECK (true) because all RT rows are shared
  public data — any authenticated admin may edit any RT.
- Adds an INSERT policy (`auth_insert_rt`) scoped to `authenticated` users for
  future admin seeding of new RT rows. WITH CHECK (true) for the same reason.

3. Security
- SELECT remains open to anon + authenticated (existing policy unchanged).
- UPDATE and INSERT are restricted to authenticated users only (admins who have
  logged in). Non-authenticated visitors cannot modify RT data.
- No DELETE policy is added in this migration — deletion of RT rows is not
  currently needed by the application.

4. Important Notes
- This migration is idempotent: DROP POLICY IF EXISTS before each CREATE POLICY.
- Safe to re-run if a timeout occurs.
*/

-- Allow authenticated users to UPDATE rt table
DROP POLICY IF EXISTS "auth_update_rt" ON rt;
CREATE POLICY "auth_update_rt" ON rt FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Allow authenticated users to INSERT into rt table (for future admin seeding)
DROP POLICY IF EXISTS "auth_insert_rt" ON rt;
CREATE POLICY "auth_insert_rt" ON rt FOR INSERT
  TO authenticated WITH CHECK (true);
