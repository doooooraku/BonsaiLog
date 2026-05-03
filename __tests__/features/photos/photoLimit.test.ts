/**
 * F-13 Phase 2b — Notion 方式データ保護テスト (Issue #20 / ADR-0009 AC6)。
 *
 * AC6 検証:
 * - AC6-1: Free で 3 枚撮影 → Pro 加入 → 4 枚目以降撮影可能
 * - AC6-2: Pro で 10 枚撮影 → Free 戻り → 既存閲覧可、新規追加のみ「3 枚まで」制限
 * - AC6-3: Free 制限ロジックが純関数で実装され、isPro を渡すだけで動作
 *
 * `canAddPhotoFromCount(count, isPro)` の純関数で全分岐を網羅。
 * 既存写真の閲覧可否は DB 取得側 (getPhotosByBonsai) の責務、本テストは新規追加判定のみ。
 */

import { FREE_PHOTO_LIMIT_PER_BONSAI, canAddPhotoFromCount } from '@/src/db/photoRepository';

describe('FREE_PHOTO_LIMIT_PER_BONSAI (constraints §2-2)', () => {
  test('Free 上限は 3 枚', () => {
    expect(FREE_PHOTO_LIMIT_PER_BONSAI).toBe(3);
  });
});

describe('canAddPhotoFromCount (AC6-3 純関数化)', () => {
  describe('Free プラン', () => {
    test('count=0 → 追加可 (true)', () => {
      expect(canAddPhotoFromCount(0, false)).toBe(true);
    });

    test('count=1 → 追加可', () => {
      expect(canAddPhotoFromCount(1, false)).toBe(true);
    });

    test('count=2 → 追加可 (3 枚目を入れる前)', () => {
      expect(canAddPhotoFromCount(2, false)).toBe(true);
    });

    test('count=3 → 追加不可 (Free 上限到達)', () => {
      expect(canAddPhotoFromCount(3, false)).toBe(false);
    });

    test('AC6-2: Pro で 10 枚撮影 → Free 戻り後の追加判定 (count=10) → 追加不可', () => {
      // 既存 10 枚は閲覧可 (DB 取得側の責務)、新規追加は不可
      expect(canAddPhotoFromCount(10, false)).toBe(false);
    });

    test('count=100 → 追加不可', () => {
      expect(canAddPhotoFromCount(100, false)).toBe(false);
    });
  });

  describe('Pro プラン', () => {
    test('count=0 → 追加可', () => {
      expect(canAddPhotoFromCount(0, true)).toBe(true);
    });

    test('AC6-1: Free で 3 枚撮影 → Pro 加入 (count=3, isPro=true) → 4 枚目可能', () => {
      expect(canAddPhotoFromCount(3, true)).toBe(true);
    });

    test('count=10 → 追加可 (無制限)', () => {
      expect(canAddPhotoFromCount(10, true)).toBe(true);
    });

    test('count=10000 → 追加可 (理論上限なし)', () => {
      expect(canAddPhotoFromCount(10000, true)).toBe(true);
    });
  });

  describe('境界値', () => {
    test('Free / count=FREE_PHOTO_LIMIT_PER_BONSAI - 1 → 追加可', () => {
      expect(canAddPhotoFromCount(FREE_PHOTO_LIMIT_PER_BONSAI - 1, false)).toBe(true);
    });

    test('Free / count=FREE_PHOTO_LIMIT_PER_BONSAI → 追加不可 (上限到達)', () => {
      expect(canAddPhotoFromCount(FREE_PHOTO_LIMIT_PER_BONSAI, false)).toBe(false);
    });

    test('Free / count=FREE_PHOTO_LIMIT_PER_BONSAI + 1 → 追加不可 (上限超過、Pro→Free 戻り想定)', () => {
      expect(canAddPhotoFromCount(FREE_PHOTO_LIMIT_PER_BONSAI + 1, false)).toBe(false);
    });
  });

  describe('Notion 方式シナリオ (AC6-1 + AC6-2 統合)', () => {
    test('シナリオ A: Free → 3 枚 → Pro 加入 → 4-10 枚撮影 → Free 戻り → 既存閲覧可 + 新規追加不可', () => {
      // Step 1: Free で 0/1/2 枚目までは追加可
      expect(canAddPhotoFromCount(0, false)).toBe(true);
      expect(canAddPhotoFromCount(1, false)).toBe(true);
      expect(canAddPhotoFromCount(2, false)).toBe(true);
      // Step 2: Free で 3 枚到達、4 枚目は不可
      expect(canAddPhotoFromCount(3, false)).toBe(false);
      // Step 3: Pro 加入後 (count=3) → 4 枚目可能
      expect(canAddPhotoFromCount(3, true)).toBe(true);
      // Step 4: Pro で 10 枚到達 → 11 枚目も可能
      expect(canAddPhotoFromCount(10, true)).toBe(true);
      // Step 5: Free 戻り (count=10) → 新規追加は不可、既存 10 枚閲覧は DB 取得で別途可
      expect(canAddPhotoFromCount(10, false)).toBe(false);
    });

    test('シナリオ B: 新規盆栽 (count=0) は Pro / Free いずれでも追加可', () => {
      expect(canAddPhotoFromCount(0, true)).toBe(true);
      expect(canAddPhotoFromCount(0, false)).toBe(true);
    });
  });
});
