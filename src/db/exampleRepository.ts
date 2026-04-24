/**
 * Example repository — demonstrates the parent-child CRUD pattern with expo-sqlite.
 *
 * Pattern: items (parent) + attachments (child)
 * Real-world examples: reports + photos, recipes + steps, playlists + tracks
 *
 * Copy this file as a starting point for your domain entities.
 *
 * Lessons from Repolog:
 *   1. Store file paths as RELATIVE (use filePathUtils.ts) — survives Store updates
 *   2. Use ON DELETE CASCADE — never manually delete children
 *   3. Use transactions for multi-step writes — partial failures corrupt data
 *   4. Use orderIndex for user-controlled ordering, not array position
 */
import { getDb } from './db';
import { toRelativePath, toAbsolutePath } from './filePathUtils';

// ---------------------------------------------------------------------------
// Types — TODO: Replace with your domain types
// ---------------------------------------------------------------------------

export type Item = {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  status: string;
  pinned: number; // 0 or 1
};

export type Attachment = {
  id: string;
  item_id: string;
  created_at: string;
  order_index: number;
  local_uri: string; // ALWAYS relative — use toAbsolutePath() at read time
  width: number | null;
  height: number | null;
  caption: string;
};

/** TODO: Replace with your app's relative path anchor */
const PATH_ANCHOR = 'myapp/items/';

// ---------------------------------------------------------------------------
// Item (parent) CRUD
// ---------------------------------------------------------------------------

export async function getAllItems(): Promise<Item[]> {
  const db = await getDb();
  return db.getAllAsync<Item>('SELECT * FROM items ORDER BY pinned DESC, updated_at DESC;');
}

export async function getItemById(id: string): Promise<Item | null> {
  const db = await getDb();
  return db.getFirstAsync<Item>('SELECT * FROM items WHERE id = ?;', [id]);
}

export async function insertItem(
  item: Omit<Item, 'created_at' | 'updated_at' | 'pinned'> & { pinned?: number },
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO items (id, created_at, updated_at, title, status, pinned) VALUES (?, ?, ?, ?, ?, ?);',
    [item.id, now, now, item.title, item.status, item.pinned ?? 0],
  );
}

export async function updateItem(
  id: string,
  updates: Partial<Pick<Item, 'title' | 'status' | 'pinned'>>,
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const fields: string[] = ['updated_at = ?'];
  const values: (string | number | null)[] = [now];

  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.pinned !== undefined) {
    fields.push('pinned = ?');
    values.push(updates.pinned);
  }

  values.push(id);
  await db.runAsync(`UPDATE items SET ${fields.join(', ')} WHERE id = ?;`, values);
}

/**
 * Delete an item AND all its attachments (cascade).
 * Foreign key constraint with ON DELETE CASCADE handles the children.
 */
export async function deleteItem(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM items WHERE id = ?;', [id]);
}

// ---------------------------------------------------------------------------
// Attachment (child) CRUD — demonstrates relative path handling
// ---------------------------------------------------------------------------

/**
 * Get all attachments for an item, with absolute URIs ready for <Image source>.
 * The DB stores relative paths; we convert to absolute on read.
 */
export async function getAttachmentsForItem(itemId: string): Promise<Attachment[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Attachment>(
    'SELECT * FROM attachments WHERE item_id = ? ORDER BY order_index ASC;',
    [itemId],
  );
  // Convert relative → absolute for use in the UI
  return rows.map((row) => ({
    ...row,
    local_uri: toAbsolutePath(row.local_uri),
  }));
}

/**
 * Insert an attachment. The caller passes an absolute URI (from image picker);
 * we convert to relative before storing.
 */
export async function insertAttachment(attachment: {
  id: string;
  item_id: string;
  absolute_uri: string;
  width?: number;
  height?: number;
  caption?: string;
}): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  // Find the next order_index
  const maxRow = await db.getFirstAsync<{ max_order: number | null }>(
    'SELECT MAX(order_index) AS max_order FROM attachments WHERE item_id = ?;',
    [attachment.item_id],
  );
  const nextOrder = (maxRow?.max_order ?? -1) + 1;

  // Convert absolute → relative for storage
  const relativeUri = toRelativePath(attachment.absolute_uri, PATH_ANCHOR);

  await db.runAsync(
    `INSERT INTO attachments
       (id, item_id, created_at, order_index, local_uri, width, height, caption)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      attachment.id,
      attachment.item_id,
      now,
      nextOrder,
      relativeUri,
      attachment.width ?? null,
      attachment.height ?? null,
      attachment.caption ?? '',
    ],
  );
}

/**
 * Reorder attachments — pass the IDs in the new order.
 * Uses a transaction so partial failures don't corrupt the order.
 */
export async function reorderAttachments(itemId: string, orderedIds: string[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync('UPDATE attachments SET order_index = ? WHERE id = ? AND item_id = ?;', [
        i,
        orderedIds[i],
        itemId,
      ]);
    }
  });
}

export async function deleteAttachment(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM attachments WHERE id = ?;', [id]);
}

export async function updateAttachmentCaption(id: string, caption: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE attachments SET caption = ? WHERE id = ?;', [caption, id]);
}
