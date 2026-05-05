/**
 * F-26 Phase F — Tutorial Step メタ定義テスト (Issue #26 / ADR-0018 → ADR-0020 改訂)。
 *
 * ADR-0020 v1.x-1: tut3/tut4 廃止、3 step (tut5 → tut1 → tut2) 構成。
 */

import {
  TUTORIAL_STEPS,
  getTutorialStepMeta,
  isTutorialStep,
} from '@/src/features/onboarding/tutorialSteps';

import type { TutorialStepMeta } from '@/src/features/onboarding/tutorialSteps';

describe('TUTORIAL_STEPS (ADR-0020 v1.x-1)', () => {
  test('3 step (tut5 → tut1 → tut2) 順序定義済', () => {
    expect(TUTORIAL_STEPS).toHaveLength(3);
    expect(TUTORIAL_STEPS.map((s) => s.step)).toEqual(['tut5', 'tut1', 'tut2']);
  });

  test('tut3 / tut4 は廃止 (ADR-0020 v1.x-1)', () => {
    expect(TUTORIAL_STEPS.map((s) => s.step)).not.toContain('tut3');
    expect(TUTORIAL_STEPS.map((s) => s.step)).not.toContain('tut4');
  });

  test('各 step は icon / titleKey / bodyKey / relatedFeature を持つ', () => {
    for (const meta of TUTORIAL_STEPS) {
      expect(meta.icon).toBeTruthy();
      expect(meta.titleKey).toBeTruthy();
      expect(meta.bodyKey).toBeTruthy();
      expect(meta.relatedFeature).toMatch(/^F-\d+$/);
    }
  });

  test('icon は Lucide 名 (kebab-case)', () => {
    for (const meta of TUTORIAL_STEPS) {
      expect(meta.icon).toMatch(/^[a-z-]+$/);
    }
  });

  test('relatedFeature が ADR 整合: tut5=F-16 (notification) / tut1=F-08 / tut2=F-09', () => {
    const tut5 = TUTORIAL_STEPS.find((s) => s.step === 'tut5');
    expect(tut5?.relatedFeature).toBe('F-16');
    const tut1 = TUTORIAL_STEPS.find((s) => s.step === 'tut1');
    expect(tut1?.relatedFeature).toBe('F-08');
    const tut2 = TUTORIAL_STEPS.find((s) => s.step === 'tut2');
    expect(tut2?.relatedFeature).toBe('F-09');
  });
});

describe('getTutorialStepMeta', () => {
  test('tut1 → tut1 メタ取得', () => {
    const meta = getTutorialStepMeta('tut1');
    expect(meta?.step).toBe('tut1');
    expect(meta?.titleKey).toBe('onboardingTut1Title');
  });

  test('tut5 → tut5 メタ取得', () => {
    const meta = getTutorialStepMeta('tut5');
    expect(meta?.step).toBe('tut5');
    expect(meta?.icon).toBe('bell');
  });

  test('全 3 step が取得可能', () => {
    expect(getTutorialStepMeta('tut1')).not.toBeNull();
    expect(getTutorialStepMeta('tut2')).not.toBeNull();
    expect(getTutorialStepMeta('tut5')).not.toBeNull();
  });

  test('tut3 / tut4 → null (ADR-0020 で廃止)', () => {
    expect(getTutorialStepMeta('tut3')).toBeNull();
    expect(getTutorialStepMeta('tut4')).toBeNull();
  });

  test('welcome / language → null (tutorial 対象外)', () => {
    expect(getTutorialStepMeta('welcome')).toBeNull();
    expect(getTutorialStepMeta('language')).toBeNull();
  });

  test('未知 step → null', () => {
    expect(getTutorialStepMeta('unknown')).toBeNull();
    expect(getTutorialStepMeta('')).toBeNull();
    expect(getTutorialStepMeta('tut6')).toBeNull();
  });
});

describe('isTutorialStep (type guard)', () => {
  test('tut1 / tut2 / tut5 → true', () => {
    expect(isTutorialStep('tut1')).toBe(true);
    expect(isTutorialStep('tut2')).toBe(true);
    expect(isTutorialStep('tut5')).toBe(true);
  });

  test('tut3 / tut4 → false (ADR-0020 で廃止)', () => {
    expect(isTutorialStep('tut3')).toBe(false);
    expect(isTutorialStep('tut4')).toBe(false);
  });

  test('welcome / language → false', () => {
    expect(isTutorialStep('welcome')).toBe(false);
    expect(isTutorialStep('language')).toBe(false);
  });

  test('未知 → false', () => {
    expect(isTutorialStep('unknown')).toBe(false);
    expect(isTutorialStep('tut6')).toBe(false);
  });
});

describe('AC: Settings 「再表示」シナリオ', () => {
  test('全 3 tutorial step を順次取得 (Settings 再表示画面用)', () => {
    const all = TUTORIAL_STEPS.map((meta) => getTutorialStepMeta(meta.step)).filter(Boolean);
    expect(all).toHaveLength(3);
  });

  test('relatedFeature でグループ化可能 (将来「機能別チュート再表示」用)', () => {
    const byFeature = TUTORIAL_STEPS.reduce<Record<string, TutorialStepMeta[]>>((acc, meta) => {
      const list = acc[meta.relatedFeature] ?? [];
      list.push(meta);
      acc[meta.relatedFeature] = list;
      return acc;
    }, {});
    expect(Object.keys(byFeature).length).toBe(3); // 1 step = 1 feature
  });
});
