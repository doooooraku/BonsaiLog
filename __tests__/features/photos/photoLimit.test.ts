/**
 * 写真制限テスト (ADR-0049 Sess59 PR3 で Issue #458 Phase 2 を Supersedes、
 * Sess58 確定 Pro 機能 ① 基本情報写真 = Free 3 枚 / Pro 無制限 に復活)。
 *
 * 経緯:
 * - 初期 v1.0: Free 3 枚 / Pro 無制限 (F-13 Phase 2b Notion 方式)
 * - PR #470 / Issue #458 Phase 2: 写真制限撤廃 (全プラン Infinity)
 * - **ADR-0049 Sess59 PR3 (本 PR)**: 復活 (Sess58 議論で 6 項目確定、 業務利用層獲得戦略)
 *
 * Grandfathered 戦略: 既存 4+ 枚は表示 OK + 削除 OK + 新規追加のみ Paywall
 * (Slack 2022 churn 事件回避、 ADR-0049 Decision §)。
 */

import {
  FREE_PHOTO_LIMIT_PER_BONSAI,
  FREE_PHOTO_LIMIT_PER_EVENT,
  canAddPhotoFromCount,
} from '@/src/db/photoRepository';

describe('FREE_PHOTO_LIMIT_PER_BONSAI (ADR-0049 Sess59 PR3)', () => {
  test('Free 上限は 3 (Sess58 確定、 Issue #458 Phase 2 Supersedes)', () => {
    expect(FREE_PHOTO_LIMIT_PER_BONSAI).toBe(3);
  });
});

describe('FREE_PHOTO_LIMIT_PER_EVENT (ADR-0049 機能 ③ 作業記録写真)', () => {
  test('Free 上限は 3 (Sess58 確定)', () => {
    expect(FREE_PHOTO_LIMIT_PER_EVENT).toBe(3);
  });
});

describe('canAddPhotoFromCount (ADR-0049 Sess59 PR3 復活)', () => {
  describe('Free プラン (3 枚 まで OK、 4 枚目から Paywall)', () => {
    test('count=0 → 追加可', () => {
      expect(canAddPhotoFromCount(0, false)).toBe(true);
    });
    test('count=1 → 追加可', () => {
      expect(canAddPhotoFromCount(1, false)).toBe(true);
    });
    test('count=2 → 追加可', () => {
      expect(canAddPhotoFromCount(2, false)).toBe(true);
    });
    test('count=3 → 追加不可 (Free 上限到達)', () => {
      expect(canAddPhotoFromCount(3, false)).toBe(false);
    });
    test('count=4 (Grandfathered) → 追加不可 (Paywall 誘導)', () => {
      expect(canAddPhotoFromCount(4, false)).toBe(false);
    });
    test('count=100 (Grandfathered 既存大量) → 追加不可', () => {
      expect(canAddPhotoFromCount(100, false)).toBe(false);
    });
  });

  describe('Pro プラン (無制限)', () => {
    test('count=0 → 追加可', () => {
      expect(canAddPhotoFromCount(0, true)).toBe(true);
    });
    test('count=3 → 追加可', () => {
      expect(canAddPhotoFromCount(3, true)).toBe(true);
    });
    test('count=10 → 追加可', () => {
      expect(canAddPhotoFromCount(10, true)).toBe(true);
    });
    test('count=10000 → 追加可 (理論上限なし)', () => {
      expect(canAddPhotoFromCount(10000, true)).toBe(true);
    });
  });

  describe('運用シナリオ', () => {
    test('シナリオ A: Free で 0→3 まで追加可、 4 から不可', () => {
      expect(canAddPhotoFromCount(0, false)).toBe(true);
      expect(canAddPhotoFromCount(1, false)).toBe(true);
      expect(canAddPhotoFromCount(2, false)).toBe(true);
      expect(canAddPhotoFromCount(3, false)).toBe(false);
    });

    test('シナリオ B: Grandfathered (既存 5 枚) → 追加不可 + Pro 加入で復活', () => {
      // Sess58 以前データ 5 枚 → 追加だけ Paywall (Slack 2022 回避)
      expect(canAddPhotoFromCount(5, false)).toBe(false);
      // Pro 加入後は無制限で追加可
      expect(canAddPhotoFromCount(5, true)).toBe(true);
    });
  });
});
