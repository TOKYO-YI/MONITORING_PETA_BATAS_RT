/*
# Create RT and Peta tables for boundary map monitoring

## Purpose
This migration creates the database schema for monitoring the creation of
RT (Rukun Tetangga) boundary maps in a kelurahan (urban village). It tracks
41 RTs and their associated map files.

## New Tables

### rt
Stores the 41 RT records for the kelurahan.
- `id` (uuid, primary key)
- `nomor_rt` (smallint, unique, not null) — RT number 1-41
- `nama_rt` (text) — optional display name for the RT
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### peta
Stores map file metadata for each RT. One RT can have multiple map files.
The RT's status (SUDAH DIKERJAKAN / BELUM DIKERJAKAN) is derived from whether
any peta rows exist for that RT — it is NOT stored as a column.
- `id` (uuid, primary key)
- `rt_id` (uuid, foreign key to rt.id, ON DELETE CASCADE)
- `nama_file` (text, not null) — display name for the map
- `original_filename` (text, not null) — the original uploaded filename
- `file_path` (text, not null) — storage path in the peta bucket
- `file_type` (text, not null) — file extension/MIME type
- `file_size` (bigint, not null) — file size in bytes
- `keterangan` (text) — notes/description
- `tanggal_pembuatan` (date) — date the map was created
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

## Security (RLS)
- Both tables have RLS enabled.
- SELECT is public (anon + authenticated) — visitors can view status and files.
- INSERT/UPDATE/DELETE on `peta` require authentication — only admin can manage files.
- `rt` table is read-only for everyone (seed data, not user-editable).

## Seed Data
- 41 RT records (RT 01 through RT 41).
- 3 dummy peta records for RT 07, RT 08, RT 10 to show the "SUDAH DIKERJAKAN" state.
*/

-- ============================================================
-- Table: rt
-- ============================================================
CREATE TABLE IF NOT EXISTS rt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_rt smallint UNIQUE NOT NULL,
  nama_rt text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE rt ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_rt" ON rt;
CREATE POLICY "anon_select_rt" ON rt FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- Table: peta
-- ============================================================
CREATE TABLE IF NOT EXISTS peta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rt_id uuid NOT NULL REFERENCES rt(id) ON DELETE CASCADE,
  nama_file text NOT NULL,
  original_filename text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  keterangan text,
  tanggal_pembuatan date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE peta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_peta" ON peta;
CREATE POLICY "anon_select_peta" ON peta FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_peta" ON peta;
CREATE POLICY "auth_insert_peta" ON peta FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_peta" ON peta;
CREATE POLICY "auth_update_peta" ON peta FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_peta" ON peta;
CREATE POLICY "auth_delete_peta" ON peta FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_peta_rt_id ON peta(rt_id);

-- ============================================================
-- Seed: 41 RT records
-- ============================================================
INSERT INTO rt (nomor_rt) 
SELECT generate_series(1, 41)
ON CONFLICT (nomor_rt) DO NOTHING;

-- ============================================================
-- Seed: dummy peta records for RT 07, 08, 10
-- ============================================================
INSERT INTO peta (rt_id, nama_file, original_filename, file_path, file_type, file_size, keterangan, tanggal_pembuatan)
SELECT rt.id, 'Peta Batas RT 07', 'peta_batas_rt07.tif', 'placeholder/peta_batas_rt07.tif', 'tif', 0, 'Peta batas wilayah RT 07 (data contoh)', '2026-08-20'::date
FROM rt WHERE rt.nomor_rt = 7
AND NOT EXISTS (SELECT 1 FROM peta WHERE peta.rt_id = rt.id);

INSERT INTO peta (rt_id, nama_file, original_filename, file_path, file_type, file_size, keterangan, tanggal_pembuatan)
SELECT rt.id, 'Peta Batas RT 08', 'peta_batas_rt08.tif', 'placeholder/peta_batas_rt08.tif', 'tif', 0, 'Peta batas wilayah RT 08 (data contoh)', '2026-08-20'::date
FROM rt WHERE rt.nomor_rt = 8
AND NOT EXISTS (SELECT 1 FROM peta WHERE peta.rt_id = rt.id);

INSERT INTO peta (rt_id, nama_file, original_filename, file_path, file_type, file_size, keterangan, tanggal_pembuatan)
SELECT rt.id, 'Peta Batas RT 10', 'peta_batas_rt10.tif', 'placeholder/peta_batas_rt10.tif', 'tif', 0, 'Peta batas wilayah RT 10 (data contoh)', '2026-08-20'::date
FROM rt WHERE rt.nomor_rt = 10
AND NOT EXISTS (SELECT 1 FROM peta WHERE peta.rt_id = rt.id);

-- ============================================================
-- updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rt_updated_at ON rt;
CREATE TRIGGER trg_rt_updated_at BEFORE UPDATE ON rt
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_peta_updated_at ON peta;
CREATE TRIGGER trg_peta_updated_at BEFORE UPDATE ON peta
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
