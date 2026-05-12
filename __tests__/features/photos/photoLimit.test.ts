/**
 * 写真制限撤廃 (PR #470 / Issue #458 Phase 2) 整合テスト。
 *
 * 旧 F-13 Phase 2b Notion 方式 (Free 3 枚制限 + Pro 加入で解除) は PR #470 で撤廃済。
 * `FREE_PHOTO_LIMIT_PER_BONSAI = Number.POSITIVE_INFINITY` (`src/db/photoRepository.ts` L36)、
 * `canAddPhotoFromCount` は Free / Pro いずれでも常に true を返す。
 *
 * 関数は legacy として残置 (caller 側で `<Image>` 残枠表示 / paywall 誘導が Infinity 評価で
 * 自動的に no-op になる)。本テストは関数の振る舞い (常時 true) と定数 (Infinity) を検証。
 */

import { FREE_PHOTO_LIMIT_PER_BONSAI, canAddPhotoFromCount } from '@/src/db/photoRepository';

describe('FREE_PHOTO_LIMIT_PER_BONSAI (写真制限撤廃、PR #470)', () => {
  test('Free 上限は Infinity (写真制限撤廃)', () => {
    expect(FREE_PHOTO_LIMIT_PER_BONSAI).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('canAddPhotoFromCount (写真制限撤廃後の純関数)', () => {
  describe('Free プラン (写真制限撤廃で常時追加可)', () => {
    test('count=0 → 追加可', () => {
      expect(canAddPhotoFromCount(0, false)).toBe(true);
    });

    test('count=1 → 追加可', () => {
      expect(canAddPhotoFromCount(1, false)).toBe(true);
    });

    test('count=3 → 追加可 (旧 Free 上限撤廃)', () => {
      expect(canAddPhotoFromCount(3, false)).toBe(true);
    });

    test('count=10 → 追加可', () => {
      expect(canAddPhotoFromCount(10, false)).toBe(true);
    });

    test('count=100 → 追加可', () => {
      expect(canAddPhotoFromCount(100, false)).toBe(true);
    });

    test('count=10000 → 追加可 (理論上限なし)', () => {
      expect(canAddPhotoFromCount(10000, false)).toBe(true);
    });
  });

  describe('Pro プラン (従来通り常時追加可)', () => {
    test('count=0 → 追加可', () => {
      expect(canAddPhotoFromCount(0, true)).toBe(true);
    });

    test('count=3 → 追加可', () => {
      expect(canAddPhotoFromCount(3, true)).toBe(true);
    });

    test('count=10 → 追加可', () => {
      expect(canAddPhotoFromCount(10, true)).toBe(true);
    });

    test('count=10000 → 追加可', () => {
      expect(canAddPhotoFromCount(10000, true)).toBe(true);
    });
  });

  describe('境界値 (Infinity 比較)', () => {
    test('Free / count = Number.MAX_SAFE_INTEGER → 追加可 (Infinity 未満)', () => {
      expect(canAddPhotoFromCount(Number.MAX_SAFE_INTEGER, false)).toBe(true);
    });

    test('Pro / count = Number.MAX_SAFE_INTEGER → 追加可', () => {
      expect(canAddPhotoFromCount(Number.MAX_SAFE_INTEGER, true)).toBe(true);
    });
  });

  describe('写真制限撤廃後の運用シナリオ', () => {
    test('シナリオ A: Free で連続追加 (0, 1, 2, ..., 10) → 全て追加可', () => {
      for (let count = 0; count <= 10; count++) {
        expect(canAddPhotoFromCount(count, false)).toBe(true);
      }
    });

    test('シナリオ B: Pro / Free 切替に関わらず常時追加可', () => {
      expect(canAddPhotoFromCount(5, true)).toBe(true);
      expect(canAddPhotoFromCount(5, false)).toBe(true);
      expect(canAddPhotoFromCount(50, true)).toBe(true);
      expect(canAddPhotoFromCount(50, false)).toBe(true);
    });
  });
});
