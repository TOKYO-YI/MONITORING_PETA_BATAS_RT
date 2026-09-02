/*
# Add kampus, kelompok_kkn, and penanggung_jawab columns to rt table

1. Changes
- Adds `kampus` (text, nullable) to the `rt` table — records the university/campus origin of the KKN group assigned to this RT.
- Adds `kelompok_kkn` (text, nullable) to the `rt` table — records the KKN group name assigned to this RT.
- Adds `penanggung_jawab` (text, nullable) to the `rt` table — records the person responsible for this RT's mapping activity.
- Creates an index `idx_rt_kampus` on the `kampus` column for faster filtering/searching by campus.
2. Security
- No RLS policy changes needed. The existing policies on `rt` already allow
  anon/authenticated SELECT and authenticated UPDATE. These new columns inherit
  the same access rules automatically.
3. Important Notes
- All three new columns are nullable, so existing RT rows will have NULL values
  until an admin fills them in.
- The migration is idempotent (uses IF NOT EXISTS), safe to re-run.
*/

ALTER TABLE rt ADD COLUMN IF NOT EXISTS kampus text;
ALTER TABLE rt ADD COLUMN IF NOT EXISTS kelompok_kkn text;
ALTER TABLE rt ADD COLUMN IF NOT EXISTS penanggung_jawab text;
CREATE INDEX IF NOT EXISTS idx_rt_kampus ON rt(kampus);
