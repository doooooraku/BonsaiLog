/**
 * F-26 Phase F — Tutorial Step メタ定義テスト (Issue #26 / ADR-0018 → ADR-0020 改訂)。
 *
 * ADR-0020 v1.x-2 (2026-05-16): tut1/tut2 撤去、tut5 のみ残置 (機能チュート 0 ステップ化)。
 */

import {
  TUTORIAL_STEPS,
  getTutorialStepMeta,
  isTutorialStep,
} from '@/src/features/onboarding/tutorialSteps';

import type { TutorialStepMeta } from '@/src/features/onboarding/tutorialSteps';

describe('TUTORIAL_STEPS (ADR-0020 v1.x-2)', () => {
  test('1 step (tut5 のみ) 定義済', () => {
    expect(TUTORIAL_STEPS).toHaveLength(1);
    expect(TUTORIAL_STEPS.map((s) => s.step)).toEqual(['tut5']);
  });

  test('tut1 / tut2 / tut3 / tut4 は全て廃止', () => {
    expect(TUTORIAL_STEPS.map((s) => s.step)).not.toContain('tut1');
    expect(TUTORIAL_STEPS.map((s) => s.step)).not.toContain('tut2');
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

  test('relatedFeature が ADR 整合: tut5=F-16 (notification)', () => {
    const tut5 = TUTORIAL_STEPS.find((s) => s.step === 'tut5');
    expect(tut5?.relatedFeature).toBe('F-16');
  });
});

describe('getTutorialStepMeta', () => {
  test('tut5 → tut5 メタ取得', () => {
    const meta = getTutorialStepMeta('tut5');
    expect(meta?.step).toBe('tut5');
    expect(meta?.icon).toBe('bell');
  });

  test('tut5 が取得可能', () => {
    expect(getTutorialStepMeta('tut5')).not.toBeNull();
  });

  test('tut1 / tut2 / tut3 / tut4 → null (撤去済)', () => {
    expect(getTutorialStepMeta('tut1')).toBeNull();
    expect(getTutorialStepMeta('tut2')).toBeNull();
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
  test('tut5 → true', () => {
    expect(isTutorialStep('tut5')).toBe(true);
  });

  test('tut1 / tut2 / tut3 / tut4 → false (撤去済)', () => {
    expect(isTutorialStep('tut1')).toBe(false);
    expect(isTutorialStep('tut2')).toBe(false);
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
  test('全 1 tutorial step (tut5) を取得', () => {
    const all = TUTORIAL_STEPS.map((meta) => getTutorialStepMeta(meta.step)).filter(Boolean);
    expect(all).toHaveLength(1);
  });

  test('relatedFeature でグループ化可能 (F-16 のみ)', () => {
    const byFeature = TUTORIAL_STEPS.reduce<Record<string, TutorialStepMeta[]>>((acc, meta) => {
      const list = acc[meta.relatedFeature] ?? [];
      list.push(meta);
      acc[meta.relatedFeature] = list;
      return acc;
    }, {});
    expect(Object.keys(byFeature).length).toBe(1); // tut5 = F-16
  });
});
