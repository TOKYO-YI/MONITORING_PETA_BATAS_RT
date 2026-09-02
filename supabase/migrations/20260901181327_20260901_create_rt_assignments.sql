/*
# Create rt_assignment table for multi-kampus per RT

1. Purpose
- Previously, each RT could only be linked to one kampus via columns on the `rt` table
  (kampus, kelompok_kkn, penanggung_jawab, link_kegiatan).
- This migration creates a separate `rt_assignment` table so that ONE RT can be worked on
  by MULTIPLE kampus/kelompok KKN simultaneously.
- The old columns on `rt` are kept for backward compatibility (not dropped).

2. New Tables
- `rt_assignment`
  - `id` (uuid, primary key)
  - `rt_id` (uuid, foreign key to rt.id, ON DELETE CASCADE)
  - `kampus` (text, not null — the university name)
  - `kelompok_kkn` (text, nullable — the KKN group name)
  - `penanggung_jawab` (text, nullable — the person responsible)
  - `link_kegiatan` (text, nullable — link to activity report)
  - `created_at` (timestamptz, default now())

3. Indexes
- `idx_rt_assignment_rt_id` on `rt_id` for fast lookups by RT.
- `idx_rt_assignment_kampus` on `kampus` for fast filtering by university.

4. Security (RLS)
- Enable RLS on `rt_assignment`.
- SELECT: public (anon + authenticated) — assignment data is shared/public like RT data.
- INSERT / UPDATE / DELETE: authenticated only — only logged-in admins can manage assignments.
- USING (true) / WITH CHECK (true) is acceptable here because assignment data is intentionally
  public/shared (same model as the existing `rt` and `peta` tables in this app).

5. Important Notes
- This migration is idempotent: uses IF NOT EXISTS and DROP POLICY IF EXISTS.
- The old `rt.kampus`, `rt.kelompok_kkn`, `rt.penanggung_jawab`, `rt.link_kegiatan` columns
  are NOT modified or dropped — they remain for backward compatibility.
*/

CREATE TABLE IF NOT EXISTS rt_assignment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rt_id uuid NOT NULL REFERENCES rt(id) ON DELETE CASCADE,
  kampus text NOT NULL,
  kelompok_kkn text,
  penanggung_jawab text,
  link_kegiatan text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rt_assignment ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rt_assignment_rt_id ON rt_assignment(rt_id);
CREATE INDEX IF NOT EXISTS idx_rt_assignment_kampus ON rt_assignment(kampus);

-- SELECT: public (anon + authenticated)
DROP POLICY IF EXISTS "anon_select_rt_assignment" ON rt_assignment;
CREATE POLICY "anon_select_rt_assignment" ON rt_assignment FOR SELECT
  TO anon, authenticated USING (true);

-- INSERT: authenticated only
DROP POLICY IF EXISTS "auth_insert_rt_assignment" ON rt_assignment;
CREATE POLICY "auth_insert_rt_assignment" ON rt_assignment FOR INSERT
  TO authenticated WITH CHECK (true);

-- UPDATE: authenticated only
DROP POLICY IF EXISTS "auth_update_rt_assignment" ON rt_assignment;
CREATE POLICY "auth_update_rt_assignment" ON rt_assignment FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- DELETE: authenticated only
DROP POLICY IF EXISTS "auth_delete_rt_assignment" ON rt_assignment;
CREATE POLICY "auth_delete_rt_assignment" ON rt_assignment FOR DELETE
  TO authenticated USING (true);
