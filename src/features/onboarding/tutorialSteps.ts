/**
 * F-26 オンボーディング — Step 1-5 機能チュート定義 (Phase F、Issue #26 / ADR-0018)。
 *
 * ADR-0011 §89-92 (Step 1-3) + ADR-0014 §41-47 (Step 4-5) の既定:
 * - tut1: 盆栽追加 (F-08 写真)
 * - tut2: 樹種登録 (F-09 検索 / F-08 species)
 * - tut3: 水やり / 作業記録 (F-02 events、ADR-0011「記録のみ」哲学)
 * - tut4: ヒートマップの読み方 (F-04、ADR-0013)
 * - tut5: 通知の有効化 (F-16、ADR-0014)
 *
 * 各 step の i18n キー + アイコン名 + 関連機能を 1 つの真実点に集約。
 * UI 層は `getTutorialStepMeta(step)` で取得し、画面を切り替える。
 */

import type { TranslationKey } from '@/src/core/i18n/i18n';
import type { OnboardingStep } from '@/src/stores/onboardingStore';

/** Tutorial step (tut1-5)。welcome / language は別フロー。 */
export type TutorialStep = 'tut1' | 'tut2' | 'tut3' | 'tut4' | 'tut5';

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

/** ADR-0018 Step 1-5 の順序定義。 */
export const TUTORIAL_STEPS: readonly TutorialStepMeta[] = [
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
  {
    step: 'tut3',
    icon: 'droplet',
    titleKey: 'onboardingTut3Title',
    bodyKey: 'onboardingTut3Body',
    relatedFeature: 'F-02',
  },
  {
    step: 'tut4',
    icon: 'calendar',
    titleKey: 'onboardingTut4Title',
    bodyKey: 'onboardingTut4Body',
    relatedFeature: 'F-04',
  },
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
 * - 不正な step (welcome / language / 未知) → null
 * - tut1-5 → 対応するメタ情報
 */
export function getTutorialStepMeta(step: OnboardingStep | string): TutorialStepMeta | null {
  if (step === 'tut1' || step === 'tut2' || step === 'tut3' || step === 'tut4' || step === 'tut5') {
    return STEP_INDEX[step] ?? null;
  }
  return null;
}

/** OnboardingStep が tutorial 範囲 (tut1-5) かを判定する純関数。 */
export function isTutorialStep(step: OnboardingStep | string): step is TutorialStep {
  return getTutorialStepMeta(step) !== null;
}
