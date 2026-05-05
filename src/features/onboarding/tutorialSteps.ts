/**
 * F-26 オンボーディング — 機能チュート定義 (Phase F、Issue #26 / ADR-0018 → ADR-0020 改訂)。
 *
 * ADR-0020 v1.x-1: Claude Design `screens.jsx` 6 画面整合に縮小:
 *   Splash + Welcome + LanguagePicker + Notification (tut5) + 機能 1 (tut1) + 機能 2 (tut2)
 *
 * 縮小内訳:
 * - tut3 (水やり / 作業記録): tut1 / tut2 で代替 (盆栽追加→作業記録) のため削除
 * - tut4 (ヒートマップの読み方): 詳細画面の watering 画面に説明統合済 (Phase 3-A) のため削除
 * - 順序変更: tut5 (通知) を最初に持ってくる (Notification 画面相当)
 *   → welcome → language → tut5 → tut1 → tut2 = 5 step (Splash 自動含めて 6 画面)
 *
 * 既存ユーザー (onboarding_v=1 完了) は再オンボなし (onboardingStore.completed で判定)。
 */

import type { TranslationKey } from '@/src/core/i18n/i18n';
import type { OnboardingStep } from '@/src/stores/onboardingStore';

/** Tutorial step (ADR-0020 v1.x-1 で tut3/tut4 廃止、tut5 → tut1 → tut2 順)。welcome / language は別フロー。 */
export type TutorialStep = 'tut1' | 'tut2' | 'tut5';

/** Step 別のメタ情報。 */
export type TutorialStepMeta = {
  step: TutorialStep;
  /** Lucide icon 名 (UI で `<Lucide icon name={icon} />`)。 */
  icon: string;
  /** タイトル i18n キー。 */
  titleKey: TranslationKey;
  /** 本文 i18n キー (1-2 文の説明)。 */
  bodyKey: TranslationKey;
  /** 関連機能 (例: 'F-04')、Settings 「再表示」画面で「これは F-04 のチュート」表示用。 */
  relatedFeature: string;
};

/** ADR-0020 v1.x-1 改訂後の 3 step (Notification → 盆栽追加 → 作業記録)。 */
export const TUTORIAL_STEPS: readonly TutorialStepMeta[] = [
  {
    step: 'tut5',
    icon: 'bell',
    titleKey: 'onboardingTut5Title',
    bodyKey: 'onboardingTut5Body',
    relatedFeature: 'F-16',
  },
  {
    step: 'tut1',
    icon: 'book-open',
    titleKey: 'onboardingTut1Title',
    bodyKey: 'onboardingTut1Body',
    relatedFeature: 'F-08',
  },
  {
    step: 'tut2',
    icon: 'leaf',
    titleKey: 'onboardingTut2Title',
    bodyKey: 'onboardingTut2Body',
    relatedFeature: 'F-09',
  },
] as const;

/** Step → メタ情報の map (UI で O(1) 取得)。 */
const STEP_INDEX: Readonly<Record<TutorialStep, TutorialStepMeta>> = TUTORIAL_STEPS.reduce(
  (acc, meta) => {
    acc[meta.step] = meta;
    return acc;
  },
  {} as Record<TutorialStep, TutorialStepMeta>,
);

/**
 * Tutorial step のメタ情報を取得する純関数。
 *
 * - 不正な step (welcome / language / 未知 / ADR-0020 で廃止された tut3/tut4) → null
 * - tut1 / tut2 / tut5 → 対応するメタ情報
 */
export function getTutorialStepMeta(step: OnboardingStep | string): TutorialStepMeta | null {
  if (step === 'tut1' || step === 'tut2' || step === 'tut5') {
    return STEP_INDEX[step] ?? null;
  }
  return null;
}

/** OnboardingStep が tutorial 範囲 (tut1 / tut2 / tut5) かを判定する純関数。 */
export function isTutorialStep(step: OnboardingStep | string): step is TutorialStep {
  return getTutorialStepMeta(step) !== null;
}
