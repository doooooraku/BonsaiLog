/**
 * File path utilities for storing user-generated assets (photos, audio, etc.)
 *
 * Why this exists (Repolog lesson):
 *   On iOS, when the user installs an app update from the App Store, the
 *   container UUID changes. Absolute paths stored in the database become
 *   invalid and the assets appear to be "lost". This caused PR #281 in
 *   Repolog where users lost all their report photos after a Store update.
 *
 * The fix:
 *   Store paths as RELATIVE to the app's document directory, and resolve
 *   them to absolute paths only at read time. The relative path is stable
 *   across reinstalls and Store updates.
 *
 * Pattern:
 *   - When saving an asset URI to the database → call toRelativePath()
 *   - When reading an asset URI from the database → call toAbsolutePath()
 *   - Both functions are idempotent (safe to call multiple times)
 *
 * Example:
 *   // Saving
 *   const absolute = `${FileSystem.documentDirectory}myapp/items/${id}/photos/1.jpg`;
 *   const relative = toRelativePath(absolute, 'myapp/items/');
 *   // → "myapp/items/{id}/photos/1.jpg"
 *   await db.runAsync('INSERT INTO photos (uri) VALUES (?)', [relative]);
 *
 *   // Reading
 *   const row = await db.getFirstAsync('SELECT uri FROM photos WHERE id = ?', [id]);
 *   const absolute = toAbsolutePath(row.uri);
 *   // → "file:///var/.../Documents/myapp/items/{id}/photos/1.jpg"
 *   <Image source={{ uri: absolute }} />
 */
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Convert an absolute file URI to a relative path.
 *
 * @param uri - The URI to convert (may be absolute or already relative)
 * @param anchor - The path prefix that marks the start of the relative portion
 *                 (e.g., 'myapp/items/'). Must match what you used when saving.
 * @returns Relative path starting from the anchor, or the input unchanged
 *          if it's not absolute or doesn't contain the anchor.
 */
export function toRelativePath(uri: string, anchor: string): string {
  // Already relative? Return as-is (idempotent).
  if (!uri.startsWith('file://') && !uri.startsWith('/')) return uri;

  const idx = uri.indexOf(anchor);
  return idx === -1 ? uri : uri.substring(idx);
}

/**
 * Convert a relative path to an absolute file URI.
 *
 * @param relativePath - The relative path (or already-absolute URI)
 * @returns Absolute file:// URI, or the input unchanged if already absolute.
 * @throws If documentDirectory is not available (shouldn't happen in practice)
 */
export function toAbsolutePath(relativePath: string): string {
  // Already absolute? Return as-is (idempotent).
  if (relativePath.startsWith('file://') || relativePath.startsWith('/')) {
    return relativePath;
  }

  const docDir = FileSystem.documentDirectory;
  if (!docDir) throw new Error('Document directory not available.');
  return `${docDir}${relativePath}`;
}
