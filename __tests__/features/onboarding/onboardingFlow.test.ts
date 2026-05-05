/**
 * F-26 Phase D — オンボフロー進捗判定 純関数テスト (Issue #26 / ADR-0018 → ADR-0020 改訂)。
 *
 * ADR-0020 v1.x-1: tut3/tut4 廃止、順序 welcome → language → tut5 → tut1 → tut2 (5 step、6 画面相当)。
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

const ALL_DISMISSED: Partial<Record<OnboardingStep, boolean>> = {
  welcome: true,
  language: true,
  tut5: true,
  tut1: true,
  tut2: true,
};

describe('ONBOARDING_STEP_ORDER (ADR-0020 v1.x-1)', () => {
  test('順序は welcome → language → tut5 → tut1 → tut2 (5 step、Splash 含めて 6 画面)', () => {
    expect(ONBOARDING_STEP_ORDER).toEqual(['welcome', 'language', 'tut5', 'tut1', 'tut2']);
  });

  test('Splash は本フロー外 (Expo SplashScreen 連携)', () => {
    expect(ONBOARDING_STEP_ORDER).not.toContain('splash');
  });

  test('tut3 / tut4 は廃止', () => {
    expect(ONBOARDING_STEP_ORDER).not.toContain('tut3');
    expect(ONBOARDING_STEP_ORDER).not.toContain('tut4');
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
    expect(isAllStepsDismissed(ALL_DISMISSED)).toBe(true);
  });

  test('false 値は dismissed と見なさない', () => {
    const partial: Partial<Record<OnboardingStep, boolean>> = {
      welcome: true,
      language: false,
      tut5: true,
      tut1: true,
      tut2: true,
    };
    expect(isAllStepsDismissed(partial)).toBe(false);
  });
});

describe('isOnboardingFinished (4 パターン完了判定)', () => {
  test('completed=true → true', () => {
    expect(isOnboardingFinished(true, {})).toBe(true);
    expect(isOnboardingFinished(true, { welcome: true })).toBe(true);
  });

  test('completed=false + 全 step dismissed → true (全スキップシナリオ)', () => {
    expect(isOnboardingFinished(false, ALL_DISMISSED)).toBe(true);
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

  test('welcome + language dismissed → tut5 (Notification)', () => {
    expect(getNextOnboardingStep(false, { welcome: true, language: true })).toBe('tut5');
  });

  test('welcome + language + tut5 dismissed → tut1', () => {
    expect(getNextOnboardingStep(false, { welcome: true, language: true, tut5: true })).toBe(
      'tut1',
    );
  });

  test('全 dismissed → null (完了相当)', () => {
    expect(getNextOnboardingStep(false, ALL_DISMISSED)).toBeNull();
  });

  test('間に未 dismissed があれば最初の未 dismissed を返す (順序保持)', () => {
    expect(
      getNextOnboardingStep(false, {
        welcome: true,
        language: true,
        tut1: true,
        tut2: true,
      }),
    ).toBe('tut5');
  });
});

describe('getOnboardingProgress (UI プログレスバー用)', () => {
  test('completed=true → 1', () => {
    expect(getOnboardingProgress(true, {})).toBe(1);
  });

  test('空 dismissed → 0', () => {
    expect(getOnboardingProgress(false, {})).toBe(0);
  });

  test('welcome のみ → 1/5', () => {
    expect(getOnboardingProgress(false, { welcome: true })).toBeCloseTo(1 / 5);
  });

  test('全 dismissed → 1', () => {
    expect(getOnboardingProgress(false, ALL_DISMISSED)).toBe(1);
  });
});

describe('getTutorialProgress (Settings 再表示画面用)', () => {
  test('空 dismissed → 0', () => {
    expect(getTutorialProgress({})).toBe(0);
  });

  test('welcome / language は対象外 → 0', () => {
    expect(getTutorialProgress({ welcome: true, language: true })).toBe(0);
  });

  test('tut1 のみ → 1/3', () => {
    expect(getTutorialProgress({ tut1: true })).toBeCloseTo(1 / 3);
  });

  test('tut1 + tut2 + tut5 全完了 → 1', () => {
    expect(
      getTutorialProgress({
        tut1: true,
        tut2: true,
        tut5: true,
      }),
    ).toBe(1);
  });
});

describe('AC 4 パターンシナリオ統合', () => {
  test('シナリオ 1: Step 5 通知 ON で完了 → completed=true 設定', () => {
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
    expect(isOnboardingFinished(true, ALL_DISMISSED)).toBe(true);
  });

  test('シナリオ 4: 全スキップ (completed=false でも dismissed が全て true)', () => {
    expect(isOnboardingFinished(false, ALL_DISMISSED)).toBe(true);
  });
});
