/**
 * photoOrderUtils 純関数の characterization test (Phase 4 A1-6 step a)。
 *
 * normalizePhotoOrder / removePhotoAndNormalize / swapPhotos /
 * restorePhotoAtIndexAndNormalize の挙動を凍結する。usePhotoCrudWithUndo
 * (写真削除 Undo の状態機械) が依存する基礎ロジックの安全網。
 *
 * @see src/features/bonsai/photoOrderUtils.ts
 */
import {
  normalizePhotoOrder,
  removePhotoAndNormalize,
  restorePhotoAtIndexAndNormalize,
  swapPhotos,
} from '@/src/features/bonsai/photoOrderUtils';
import type { PhotoRead } from '@/src/db/photoRepository';

function makePhoto(id: string, orderIndex: number): PhotoRead {
  return {
    id,
    bonsaiId: 'b1',
    eventId: null,
    takenAt: null,
    isCover: 0,
    width: null,
    height: null,
    orderIndex,
    caption: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    absoluteUri: `file:///photos/${id}.jpg`,
  };
}

const ids = (photos: PhotoRead[]): string[] => photos.map((p) => p.id);
const orders = (photos: PhotoRead[]): number[] => photos.map((p) => p.orderIndex);

describe('photoOrderUtils — Phase 4 A1-6 characterization', () => {
  describe('normalizePhotoOrder', () => {
    test('orderIndex を 0..N-1 で再採番する (元の並び順は保持)', () => {
      const input = [makePhoto('a', 5), makePhoto('b', 9), makePhoto('c', 2)];
      const result = normalizePhotoOrder(input);
      expect(ids(result)).toEqual(['a', 'b', 'c']);
      expect(orders(result)).toEqual([0, 1, 2]);
    });

    test('空配列は空配列', () => {
      expect(normalizePhotoOrder([])).toEqual([]);
    });

    test('元の配列を破壊しない (新しい配列/要素を返す)', () => {
      const input = [makePhoto('a', 0)];
      const result = normalizePhotoOrder(input);
      expect(result).not.toBe(input);
      expect(result[0]).not.toBe(input[0]);
      expect(input[0]!.orderIndex).toBe(0);
    });
  });

  describe('removePhotoAndNormalize', () => {
    test('指定 id を除外して再採番', () => {
      const input = [makePhoto('a', 0), makePhoto('b', 1), makePhoto('c', 2)];
      const result = removePhotoAndNormalize(input, 'b');
      expect(ids(result)).toEqual(['a', 'c']);
      expect(orders(result)).toEqual([0, 1]);
    });

    test('存在しない id は全件維持 (再採番のみ)', () => {
      const input = [makePhoto('a', 3), makePhoto('b', 7)];
      const result = removePhotoAndNormalize(input, 'zzz');
      expect(ids(result)).toEqual(['a', 'b']);
      expect(orders(result)).toEqual([0, 1]);
    });
  });

  describe('swapPhotos', () => {
    test('有効な index を交換して再採番', () => {
      const input = [makePhoto('a', 0), makePhoto('b', 1), makePhoto('c', 2)];
      const result = swapPhotos(input, 0, 2);
      expect(ids(result)).toEqual(['c', 'b', 'a']);
      expect(orders(result)).toEqual([0, 1, 2]);
    });

    test('隣接交換 (1,2)', () => {
      const input = [makePhoto('a', 0), makePhoto('b', 1), makePhoto('c', 2)];
      const result = swapPhotos(input, 1, 2);
      expect(ids(result)).toEqual(['a', 'c', 'b']);
    });

    test('同一 index は no-op (同一参照を返す)', () => {
      const input = [makePhoto('a', 0), makePhoto('b', 1)];
      expect(swapPhotos(input, 1, 1)).toBe(input);
    });

    test('範囲外 index は no-op (同一参照を返す)', () => {
      const input = [makePhoto('a', 0), makePhoto('b', 1)];
      expect(swapPhotos(input, 0, 5)).toBe(input);
      expect(swapPhotos(input, -1, 1)).toBe(input);
    });
  });

  describe('restorePhotoAtIndexAndNormalize', () => {
    test('指定 index に挿入して再採番', () => {
      const input = [makePhoto('a', 0), makePhoto('c', 1)];
      const result = restorePhotoAtIndexAndNormalize(input, makePhoto('b', 99), 1);
      expect(ids(result)).toEqual(['a', 'b', 'c']);
      expect(orders(result)).toEqual([0, 1, 2]);
    });

    test('targetIndex 0 は先頭挿入', () => {
      const input = [makePhoto('b', 0), makePhoto('c', 1)];
      const result = restorePhotoAtIndexAndNormalize(input, makePhoto('a', 99), 0);
      expect(ids(result)).toEqual(['a', 'b', 'c']);
    });

    test('範囲外 targetIndex は末尾に clamp', () => {
      const input = [makePhoto('a', 0), makePhoto('b', 1)];
      const result = restorePhotoAtIndexAndNormalize(input, makePhoto('z', 99), 99);
      expect(ids(result)).toEqual(['a', 'b', 'z']);
      expect(orders(result)).toEqual([0, 1, 2]);
    });

    test('負の targetIndex は先頭に clamp', () => {
      const input = [makePhoto('a', 0)];
      const result = restorePhotoAtIndexAndNormalize(input, makePhoto('z', 99), -5);
      expect(ids(result)).toEqual(['z', 'a']);
    });
  });
});
