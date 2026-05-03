/**
 * F-26 Phase D — オンボフロー進捗判定 純関数テスト (Issue #26 / ADR-0018)。
 *
 * AC「完了判定 4 パターン (Step 5 通知 ON / 「あとで」/ OS 拒否 / 全スキップ)」を
 * 純関数レベルで網羅。
 */

import {
  ONBOARDING_STEP_ORDER,
  getNextOnboardingStep,
  getOnboardingProgress,
  getTutorialProgress,
  isAllStepsDismissed,
  isOnboardingFinished,
} from '@/src/features/onboarding/onboardingFlow';
import type { OnboardingStep } from '@/src/stores/onboardingStore';

describe('ONBOARDING_STEP_ORDER (ADR-0018)', () => {
  test('順序は welcome → language → tut1-5', () => {
    expect(ONBOARDING_STEP_ORDER).toEqual([
      'welcome',
      'language',
      'tut1',
      'tut2',
      'tut3',
      'tut4',
      'tut5',
    ]);
  });

  test('Splash は本フロー外 (Expo SplashScreen 連携)', () => {
    expect(ONBOARDING_STEP_ORDER).not.toContain('splash');
  });
});

describe('isAllStepsDismissed', () => {
  test('空 dismissed → false', () => {
    expect(isAllStepsDismissed({})).toBe(false);
  });

  test('一部のみ dismissed → false', () => {
    expect(isAllStepsDismissed({ welcome: true, language: true })).toBe(false);
  });

  test('全 step dismissed → true', () => {
    const all: Partial<Record<OnboardingStep, boolean>> = {
      welcome: true,
      language: true,
      tut1: true,
      tut2: true,
      tut3: true,
      tut4: true,
      tut5: true,
    };
    expect(isAllStepsDismissed(all)).toBe(true);
  });

  test('false 値は dismissed と見なさない', () => {
    const partial: Partial<Record<OnboardingStep, boolean>> = {
      welcome: true,
      language: false,
      tut1: true,
      tut2: true,
      tut3: true,
      tut4: true,
      tut5: true,
    };
    expect(isAllStepsDismissed(partial)).toBe(false);
  });
});

describe('isOnboardingFinished (4 パターン完了判定)', () => {
  test('completed=true → true (Step 5 通知 ON / 任意のパス)', () => {
    expect(isOnboardingFinished(true, {})).toBe(true);
    expect(isOnboardingFinished(true, { welcome: true })).toBe(true);
  });

  test('completed=false + 全 step dismissed → true (全スキップシナリオ)', () => {
    const allDismissed: Partial<Record<OnboardingStep, boolean>> = {
      welcome: true,
      language: true,
      tut1: true,
      tut2: true,
      tut3: true,
      tut4: true,
      tut5: true,
    };
    expect(isOnboardingFinished(false, allDismissed)).toBe(true);
  });

  test('completed=false + 一部 dismissed → false', () => {
    expect(isOnboardingFinished(false, { welcome: true, language: true })).toBe(false);
  });

  test('completed=false + 空 dismissed → false', () => {
    expect(isOnboardingFinished(false, {})).toBe(false);
  });
});

describe('getNextOnboardingStep', () => {
  test('completed=true → null (フロー終了済)', () => {
    expect(getNextOnboardingStep(true, {})).toBeNull();
    expect(getNextOnboardingStep(true, { welcome: true })).toBeNull();
  });

  test('空 dismissed → welcome (最初の step)', () => {
    expect(getNextOnboardingStep(false, {})).toBe('welcome');
  });

  test('welcome dismissed → language', () => {
    expect(getNextOnboardingStep(false, { welcome: true })).toBe('language');
  });

  test('welcome + language dismissed → tut1', () => {
    expect(getNextOnboardingStep(false, { welcome: true, language: true })).toBe('tut1');
  });

  test('tut1-3 dismissed → tut4', () => {
    expect(
      getNextOnboardingStep(false, {
        welcome: true,
        language: true,
        tut1: true,
        tut2: true,
        tut3: true,
      }),
    ).toBe('tut4');
  });

  test('全 dismissed → null (完了相当)', () => {
    const all: Partial<Record<OnboardingStep, boolean>> = {
      welcome: true,
      language: true,
      tut1: true,
      tut2: true,
      tut3: true,
      tut4: true,
      tut5: true,
    };
    expect(getNextOnboardingStep(false, all)).toBeNull();
  });

  test('間に未 dismissed があれば最初の未 dismissed を返す (順序保持)', () => {
    expect(
      getNextOnboardingStep(false, {
        welcome: true,
        language: true,
        tut2: true,
        tut3: true,
        tut4: true,
        tut5: true,
      }),
    ).toBe('tut1');
  });
});

describe('getOnboardingProgress (UI プログレスバー用)', () => {
  test('completed=true → 1', () => {
    expect(getOnboardingProgress(true, {})).toBe(1);
  });

  test('空 dismissed → 0', () => {
    expect(getOnboardingProgress(false, {})).toBe(0);
  });

  test('welcome のみ → 1/7', () => {
    expect(getOnboardingProgress(false, { welcome: true })).toBeCloseTo(1 / 7);
  });

  test('全 dismissed → 1', () => {
    const all: Partial<Record<OnboardingStep, boolean>> = {
      welcome: true,
      language: true,
      tut1: true,
      tut2: true,
      tut3: true,
      tut4: true,
      tut5: true,
    };
    expect(getOnboardingProgress(false, all)).toBe(1);
  });
});

describe('getTutorialProgress (Settings 再表示画面用)', () => {
  test('空 dismissed → 0', () => {
    expect(getTutorialProgress({})).toBe(0);
  });

  test('welcome / language は対象外 → 0', () => {
    expect(getTutorialProgress({ welcome: true, language: true })).toBe(0);
  });

  test('tut1 のみ → 1/5', () => {
    expect(getTutorialProgress({ tut1: true })).toBeCloseTo(1 / 5);
  });

  test('tut1-5 全完了 → 1', () => {
    expect(
      getTutorialProgress({
        tut1: true,
        tut2: true,
        tut3: true,
        tut4: true,
        tut5: true,
      }),
    ).toBe(1);
  });
});

describe('AC 4 パターンシナリオ統合', () => {
  test('シナリオ 1: Step 5 通知 ON で完了 → completed=true 設定', () => {
    // UI 側で setCompleted(true) 後の状態
    expect(isOnboardingFinished(true, {})).toBe(true);
    expect(getNextOnboardingStep(true, {})).toBeNull();
  });

  test('シナリオ 2: 「あとで」を順次選択 → 最後まで dismissed → 完了', () => {
    let dismissed: Partial<Record<OnboardingStep, boolean>> = {};
    for (const step of ONBOARDING_STEP_ORDER) {
      expect(getNextOnboardingStep(false, dismissed)).toBe(step);
      dismissed = { ...dismissed, [step]: true };
    }
    expect(isOnboardingFinished(false, dismissed)).toBe(true);
    expect(getNextOnboardingStep(false, dismissed)).toBeNull();
  });

  test('シナリオ 3: OS 拒否で完了 (UI 側で全 step dismissed → completed=true)', () => {
    const allDismissed: Partial<Record<OnboardingStep, boolean>> = {
      welcome: true,
      language: true,
      tut1: true,
      tut2: true,
      tut3: true,
      tut4: true,
      tut5: true,
    };
    expect(isOnboardingFinished(true, allDismissed)).toBe(true);
  });

  test('シナリオ 4: 全スキップ (completed=false でも dismissed が全て true)', () => {
    const all: Partial<Record<OnboardingStep, boolean>> = {
      welcome: true,
      language: true,
      tut1: true,
      tut2: true,
      tut3: true,
      tut4: true,
      tut5: true,
    };
    expect(isOnboardingFinished(false, all)).toBe(true);
  });
});
