/**
 * F-15 Phase D — テーマ解決 純関数テスト (Issue #32 / ADR-0015)。
 *
 * AC2 (4 mode 切替) + AC5 (Settings UI、屋外 ON 時セグメント disabled) のロジック純関数を網羅。
 */

import {
  isThemeSelectionDisabled,
  resolveEffectiveScheme,
  resolveThemeWithReason,
} from '@/src/core/theme/themeResolver';

describe('resolveEffectiveScheme (AC2 4 mode 解決)', () => {
  describe('outdoorMode 優先', () => {
    test('outdoor=true / themeMode=dark / system=dark → light', () => {
      expect(resolveEffectiveScheme('dark', 'dark', true)).toBe('light');
    });

    test('outdoor=true / themeMode=light / system=light → light', () => {
      expect(resolveEffectiveScheme('light', 'light', true)).toBe('light');
    });

    test('outdoor=true / themeMode=system / system=null → light', () => {
      expect(resolveEffectiveScheme('system', null, true)).toBe('light');
    });
  });

  describe('themeMode=system (OS 連動)', () => {
    test('system + OS=dark → dark', () => {
      expect(resolveEffectiveScheme('system', 'dark', false)).toBe('dark');
    });

    test('system + OS=light → light', () => {
      expect(resolveEffectiveScheme('system', 'light', false)).toBe('light');
    });

    test('system + OS=null → light フォールバック', () => {
      expect(resolveEffectiveScheme('system', null, false)).toBe('light');
    });

    test('system + OS=undefined → light フォールバック', () => {
      expect(resolveEffectiveScheme('system', undefined, false)).toBe('light');
    });
  });

  describe('themeMode=light / dark (ユーザー明示選択)', () => {
    test('light + OS=dark → light (ユーザー優先)', () => {
      expect(resolveEffectiveScheme('light', 'dark', false)).toBe('light');
    });

    test('dark + OS=light → dark (ユーザー優先)', () => {
      expect(resolveEffectiveScheme('dark', 'light', false)).toBe('dark');
    });

    test('light + OS=null → light', () => {
      expect(resolveEffectiveScheme('light', null, false)).toBe('light');
    });

    test('dark + OS=null → dark', () => {
      expect(resolveEffectiveScheme('dark', null, false)).toBe('dark');
    });
  });
});

describe('isThemeSelectionDisabled (AC5)', () => {
  test('outdoor=true → セグメント disabled', () => {
    expect(isThemeSelectionDisabled(true)).toBe(true);
  });

  test('outdoor=false → セグメント enabled', () => {
    expect(isThemeSelectionDisabled(false)).toBe(false);
  });
});

describe('resolveThemeWithReason (UI 診断用)', () => {
  test('outdoor → outdoor_override', () => {
    expect(resolveThemeWithReason('dark', 'dark', true)).toEqual({
      scheme: 'light',
      reason: 'outdoor_override',
    });
  });

  test('user explicit light → user_explicit', () => {
    expect(resolveThemeWithReason('light', 'dark', false)).toEqual({
      scheme: 'light',
      reason: 'user_explicit',
    });
  });

  test('user explicit dark → user_explicit', () => {
    expect(resolveThemeWithReason('dark', 'light', false)).toEqual({
      scheme: 'dark',
      reason: 'user_explicit',
    });
  });

  test('system + OS=dark → system_dark', () => {
    expect(resolveThemeWithReason('system', 'dark', false)).toEqual({
      scheme: 'dark',
      reason: 'system_dark',
    });
  });

  test('system + OS=light → system_light', () => {
    expect(resolveThemeWithReason('system', 'light', false)).toEqual({
      scheme: 'light',
      reason: 'system_light',
    });
  });

  test('system + OS=null → system_fallback (light)', () => {
    expect(resolveThemeWithReason('system', null, false)).toEqual({
      scheme: 'light',
      reason: 'system_fallback',
    });
  });

  test('system + OS=undefined → system_fallback', () => {
    expect(resolveThemeWithReason('system', undefined, false)).toEqual({
      scheme: 'light',
      reason: 'system_fallback',
    });
  });
});

describe('AC2 + AC5 統合シナリオ', () => {
  test('シナリオ A: ユーザーが dark 選択 + 屋外モード ON → light に強制 + セグメント disabled', () => {
    expect(resolveEffectiveScheme('dark', 'dark', true)).toBe('light');
    expect(isThemeSelectionDisabled(true)).toBe(true);
  });

  test('シナリオ B: 屋外モード OFF に戻すとユーザー選択が復帰', () => {
    // 屋外 OFF 後の状態
    expect(resolveEffectiveScheme('dark', 'light', false)).toBe('dark');
    expect(isThemeSelectionDisabled(false)).toBe(false);
  });

  test('シナリオ C: system + OS が null/undefined でも light フォールバックで安全', () => {
    expect(resolveEffectiveScheme('system', null, false)).toBe('light');
    expect(resolveEffectiveScheme('system', undefined, false)).toBe('light');
  });
});
