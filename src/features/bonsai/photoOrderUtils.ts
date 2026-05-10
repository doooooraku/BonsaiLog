/**
 * 写真の並び替え/正規化ユーティリティ (Repolog `photoOrderUtils.ts` を BonsaiLog の `PhotoRead` 型に合わせて移植)。
 *
 * UI で ↑↓ ボタンを押した時に state を即座に更新するための純関数群。
 * 確定 (DB 反映) は呼出側で `reorderPhotos(bonsaiId, ids)` を呼ぶ。
 */
import type { PhotoRead } from '@/src/db/photoRepository';

/** orderIndex を 0..N-1 で再採番。 */
export function normalizePhotoOrder(photos: PhotoRead[]): PhotoRead[] {
  return photos.map((photo, index) => ({ ...photo, orderIndex: index }));
}

/** 指定 id の写真を除外して再採番。 */
export function removePhotoAndNormalize(photos: PhotoRead[], photoId: string): PhotoRead[] {
  return normalizePhotoOrder(photos.filter((photo) => photo.id !== photoId));
}

/** index を交換 (UI ↑↓ ボタン用)。out-of-range / fromIndex==toIndex は no-op。 */
export function swapPhotos(photos: PhotoRead[], fromIndex: number, toIndex: number): PhotoRead[] {
  if (
    fromIndex < 0 ||
    fromIndex >= photos.length ||
    toIndex < 0 ||
    toIndex >= photos.length ||
    fromIndex === toIndex
  ) {
    return photos;
  }
  const next = [...photos];
  const temp = next[fromIndex];
  next[fromIndex] = next[toIndex];
  next[toIndex] = temp;
  return normalizePhotoOrder(next);
}

/**
 * 削除 undo: photo を target index に挿入して再採番 (Repolog 流用)。
 * out-of-range な targetIndex は clamp する。
 */
export function restorePhotoAtIndexAndNormalize(
  photos: PhotoRead[],
  photo: PhotoRead,
  targetIndex: number,
): PhotoRead[] {
  const index = Math.max(0, Math.min(targetIndex, photos.length));
  const next = [...photos];
  next.splice(index, 0, photo);
  return normalizePhotoOrder(next);
}
