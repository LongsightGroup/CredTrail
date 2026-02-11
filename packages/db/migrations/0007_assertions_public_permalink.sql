-- Add stable opaque public permalink identifiers for badge assertions.

ALTER TABLE assertions ADD COLUMN public_id TEXT;

UPDATE assertions
SET public_id =
  LOWER(HEX(RANDOMBLOB(4))) || '-' ||
  LOWER(HEX(RANDOMBLOB(2))) || '-' ||
  LOWER(HEX(RANDOMBLOB(2))) || '-' ||
  LOWER(HEX(RANDOMBLOB(2))) || '-' ||
  LOWER(HEX(RANDOMBLOB(6)))
WHERE public_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_assertions_public_id
  ON assertions (public_id);
