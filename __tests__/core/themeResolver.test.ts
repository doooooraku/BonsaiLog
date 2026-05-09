/**
 * F-15 Phase D — テーマ解決 純関数テスト (Issue #32 / ADR-0015 Notes Amended 2026-05-10)。
 *
 * AC2 (3 mode 切替: Auto / Light / Dark) のロジック純関数を網羅。
 * 屋外モード (outdoor) は ADR-0015 Notes Amended (2026-05-10、PR #312) で v1.0 不採用、E4 PR で削除済。
 */

import {
  isThemeSelectionDisabled,
  resolveEffectiveScheme,
  resolveThemeWithReason,
} from '@/src/core/theme/themeResolver';

describe('resolveEffectiveScheme (AC2 3 mode 解決)', () => {
  describe('themeMode=system (OS 連動)', () => {
    test('system + OS=dark → dark', () => {
      expect(resolveEffectiveScheme('system', 'dark')).toBe('dark');
    });

    test('system + OS=light → light', () => {
      expect(resolveEffectiveScheme('system', 'light')).toBe('light');
    });

    test('system + OS=null → light フォールバック', () => {
      expect(resolveEffectiveScheme('system', null)).toBe('light');
    });

    test('system + OS=undefined → light フォールバック', () => {
      expect(resolveEffectiveScheme('system', undefined)).toBe('light');
    });
  });

  describe('themeMode=light / dark (ユーザー明示選択)', () => {
    test('light + OS=dark → light (ユーザー優先)', () => {
      expect(resolveEffectiveScheme('light', 'dark')).toBe('light');
    });

    test('dark + OS=light → dark (ユーザー優先)', () => {
      expect(resolveEffectiveScheme('dark', 'light')).toBe('dark');
    });

    test('light + OS=null → light', () => {
      expect(resolveEffectiveScheme('light', null)).toBe('light');
    });

    test('dark + OS=null → dark', () => {
      expect(resolveEffectiveScheme('dark', null)).toBe('dark');
    });
  });
});

describe('isThemeSelectionDisabled (outdoor 削除後 stub、常に false)', () => {
  test('常に false 返却 (outdoor 削除後の stub、v1.x で完全削除予定)', () => {
    expect(isThemeSelectionDisabled()).toBe(false);
  });
});

describe('resolveThemeWithReason (UI 診断用)', () => {
  test('user explicit light → user_explicit', () => {
    expect(resolveThemeWithReason('light', 'dark')).toEqual({
      scheme: 'light',
      reason: 'user_explicit',
    });
  });

  test('user explicit dark → user_explicit', () => {
    expect(resolveThemeWithReason('dark', 'light')).toEqual({
      scheme: 'dark',
      reason: 'user_explicit',
    });
  });

  test('system + OS=dark → system_dark', () => {
    expect(resolveThemeWithReason('system', 'dark')).toEqual({
      scheme: 'dark',
      reason: 'system_dark',
    });
  });

  test('system + OS=light → system_light', () => {
    expect(resolveThemeWithReason('system', 'light')).toEqual({
      scheme: 'light',
      reason: 'system_light',
    });
  });

  test('system + OS=null → system_fallback (light)', () => {
    expect(resolveThemeWithReason('system', null)).toEqual({
      scheme: 'light',
      reason: 'system_fallback',
    });
  });

  test('system + OS=undefined → system_fallback', () => {
    expect(resolveThemeWithReason('system', undefined)).toEqual({
      scheme: 'light',
      reason: 'system_fallback',
    });
  });
});

describe('AC2 統合シナリオ', () => {
  test('シナリオ A: ユーザーが dark 選択 → dark', () => {
    expect(resolveEffectiveScheme('dark', 'dark')).toBe('dark');
    expect(resolveEffectiveScheme('dark', 'light')).toBe('dark');
  });

  test('シナリオ B: system + OS が null/undefined でも light フォールバックで安全', () => {
    expect(resolveEffectiveScheme('system', null)).toBe('light');
    expect(resolveEffectiveScheme('system', undefined)).toBe('light');
  });
});
