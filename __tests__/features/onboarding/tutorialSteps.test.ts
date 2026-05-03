/**
 * F-26 Phase F — Tutorial Step メタ定義テスト (Issue #26 / ADR-0018)。
 */

import {
  TUTORIAL_STEPS,
  getTutorialStepMeta,
  isTutorialStep,
} from '@/src/features/onboarding/tutorialSteps';

// 型インポート (テストファイル内の参照のみ)
import type { TutorialStepMeta } from '@/src/features/onboarding/tutorialSteps';

describe('TUTORIAL_STEPS', () => {
  test('5 step (tut1-5) 定義済', () => {
    expect(TUTORIAL_STEPS).toHaveLength(5);
    expect(TUTORIAL_STEPS.map((s) => s.step)).toEqual(['tut1', 'tut2', 'tut3', 'tut4', 'tut5']);
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

  test('titleKey / bodyKey は onboardingTut[1-5]{Title,Body} 形式', () => {
    for (const meta of TUTORIAL_STEPS) {
      const num = meta.step.replace('tut', '');
      expect(meta.titleKey).toBe(`onboardingTut${num}Title`);
      expect(meta.bodyKey).toBe(`onboardingTut${num}Body`);
    }
  });

  test('relatedFeature が ADR 整合: tut4=F-04 (heatmap) / tut5=F-16 (notification)', () => {
    const tut4 = TUTORIAL_STEPS.find((s) => s.step === 'tut4');
    expect(tut4?.relatedFeature).toBe('F-04');
    const tut5 = TUTORIAL_STEPS.find((s) => s.step === 'tut5');
    expect(tut5?.relatedFeature).toBe('F-16');
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

  test('全 5 step が取得可能', () => {
    expect(getTutorialStepMeta('tut1')).not.toBeNull();
    expect(getTutorialStepMeta('tut2')).not.toBeNull();
    expect(getTutorialStepMeta('tut3')).not.toBeNull();
    expect(getTutorialStepMeta('tut4')).not.toBeNull();
    expect(getTutorialStepMeta('tut5')).not.toBeNull();
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
  test('tut1-5 → true', () => {
    expect(isTutorialStep('tut1')).toBe(true);
    expect(isTutorialStep('tut3')).toBe(true);
    expect(isTutorialStep('tut5')).toBe(true);
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
  test('全 5 tutorial step を順次取得 (Settings 再表示画面用)', () => {
    const all = TUTORIAL_STEPS.map((meta) => getTutorialStepMeta(meta.step)).filter(Boolean);
    expect(all).toHaveLength(5);
  });

  test('relatedFeature でグループ化可能 (将来「機能別チュート再表示」用)', () => {
    const byFeature = TUTORIAL_STEPS.reduce<Record<string, TutorialStepMeta[]>>((acc, meta) => {
      const list = acc[meta.relatedFeature] ?? [];
      list.push(meta);
      acc[meta.relatedFeature] = list;
      return acc;
    }, {});
    expect(Object.keys(byFeature).length).toBe(5); // 1 step = 1 feature
  });
});
