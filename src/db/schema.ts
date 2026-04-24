export const SCHEMA_VERSION = 1;

/**
 * Initial schema — create your tables here.
 *
 * This template demonstrates a parent-child relationship pattern (items + attachments)
 * which is the most common pattern in real apps (reports + photos, recipes + steps,
 * playlists + tracks, etc.).
 *
 * Guidelines:
 * - Use TEXT PRIMARY KEY with UUID (not auto-increment) — survives backup/restore
 * - Use TEXT for dates (ISO 8601) — easy to compare and serialize
 * - Use INTEGER for booleans (0/1) — SQLite has no native bool
 * - Use REAL for floats (lat/lng, prices)
 * - Always add created_at / updated_at — useful for sync and debugging
 * - Add indexes for columns used in WHERE / ORDER BY / JOIN
 * - Use ON DELETE CASCADE for child rows when the parent is deleted
 *
 * Lesson from Repolog (PR #281):
 *   File paths (photos, audio) MUST be stored as RELATIVE paths.
 *   Use src/db/filePathUtils.ts when saving and reading.
 *   Absolute paths break on iOS Store updates (container UUID changes).
 */
export const schemaV1 = `
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Parent table: items
-- TODO: Rename to your domain entity (reports, recipes, playlists, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  -- Add your domain-specific columns here
  -- e.g., description, lat, lng, weather, comment
  pinned INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_items_updated_at ON items(updated_at);
CREATE INDEX IF NOT EXISTS idx_items_pinned ON items(pinned, updated_at);

-- ---------------------------------------------------------------------------
-- Child table: attachments (photos, audio, etc.)
-- TODO: Rename to your child entity (photos, steps, tracks, etc.)
--
-- Pattern notes:
-- - ON DELETE CASCADE: when parent is deleted, all children are deleted too
-- - order_index: for user-controlled ordering (drag/drop, up/down buttons)
-- - local_uri: ALWAYS store as RELATIVE path (use filePathUtils.ts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY NOT NULL,
  item_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  local_uri TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  caption TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attachments_item_id ON attachments(item_id, order_index);
`;

// --- Future schema versions ---
//
// Pattern for ALTER TABLE migrations (since SQLite has no IF NOT EXISTS for ALTER):
//
// export const schemaV2 = `
//   ALTER TABLE items ADD COLUMN new_column TEXT;
// `;
//
// Then in db.ts, wrap it with a hasColumn() guard for idempotency:
//
//   if (version < 2) {
//     if (!(await hasColumn(db, 'items', 'new_column'))) {
//       await db.execAsync(schemaV2);
//     }
//     version = 2;
//   }
