/**
 * F-26 オンボーディング — 機能チュート定義 (Phase F、Issue #26 / ADR-0018 → ADR-0020 改訂)。
 *
 * ADR-0020 v1.x-2 (2026-05-16): tut1 / tut2 (機能チュート) 撤去、tut5 (Notification) のみ残置:
 *   Splash + Welcome + LanguagePicker + Notification (tut5) = 4 画面
 *
 * 撤去内訳 (2026-05-16):
 * - tut1 (盆栽追加チュート) 撤去 (ADR-0011 記録のみ哲学整合、user 判断)
 * - tut2 (樹種登録チュート) 撤去 (mockup wireframe との drift 解消)
 * - tut3 / tut4 は ADR-0020 v1.x-1 で既に撤去済
 *
 * 既存ユーザー (onboarding_v=1 完了) は再オンボなし (onboardingStore.completed で判定)。
 */

import type { TranslationKey } from '@/src/core/i18n/i18n';
import type { OnboardingStep } from '@/src/stores/onboardingStore';

/** Tutorial step (ADR-0020 v1.x-2 で tut1/tut2 撤去、tut5 のみ)。welcome / language は別フロー。 */
export type TutorialStep = 'tut5';

/** Step 別のメタ情報。 */
export type TutorialStepMeta = {
  step: TutorialStep;
  /** Lucide icon 名 (UI で `<Lucide icon name={icon} />`)。 */
  icon: string;
  /** タイトル i18n キー。 */
  titleKey: TranslationKey;
  /** 本文 i18n キー (1-2 文の説明)。 */
  bodyKey: TranslationKey;
  /** 関連機能 (例: 'F-16')、Settings 「再表示」画面で表示用。 */
  relatedFeature: string;
};

/** ADR-0020 v1.x-2 改訂後の 1 step (Notification のみ)。 */
export const TUTORIAL_STEPS: readonly TutorialStepMeta[] = [
  {
    step: 'tut5',
    icon: 'bell',
    titleKey: 'onboardingTut5Title',
    bodyKey: 'onboardingTut5Body',
    relatedFeature: 'F-16',
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
 * - 不正な step (welcome / language / 未知 / 廃止 tut1-4) → null
 * - tut5 → 対応するメタ情報
 */
export function getTutorialStepMeta(step: OnboardingStep | string): TutorialStepMeta | null {
  if (step === 'tut5') {
    return STEP_INDEX[step] ?? null;
  }
  return null;
}

/** OnboardingStep が tutorial 範囲 (tut5) かを判定する純関数。 */
export function isTutorialStep(step: OnboardingStep | string): step is TutorialStep {
  return getTutorialStepMeta(step) !== null;
}
