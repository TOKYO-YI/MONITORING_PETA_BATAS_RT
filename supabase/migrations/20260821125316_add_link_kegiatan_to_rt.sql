/*
# Add link_kegiatan column to rt table

1. Changes
- Adds a `link_kegiatan` text column to the `rt` table.
- This column stores an optional URL (e.g. Google Drive link) for activity/document links per RT.
- Nullable: RTs without a link will have NULL.
2. Security
- No RLS policy changes needed. The existing policies on `rt` already allow
  anon/authenticated SELECT and authenticated UPDATE.
*/

ALTER TABLE rt ADD COLUMN IF NOT EXISTS link_kegiatan text;
