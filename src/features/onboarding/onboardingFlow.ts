/**
 * F-26 オンボーディング — フロー進捗判定 純関数 (Phase D、Issue #26 / ADR-0018)。
 *
 * AC「完了判定 4 パターン」を純関数で網羅:
 * - Step 5 通知 ON で完了 (resetTutorial 後)
 * - 「あとで」で完了 (markDismissed しつつ最後の step を抜ける)
 * - OS 拒否で完了
 * - 全スキップで完了
 *
 * 副作用なし純関数のため、AsyncStorage 永続化と画面遷移は呼出側 (Phase E 以降の UI 層) で実施。
 * 本ファイルは「onboarding state → 次画面 / 完了判定」のロジックだけを責務とする。
 */

import type { OnboardingStep } from '@/src/stores/onboardingStore';

/**
 * オンボステップの順序定義 (ADR-0018 §画面構成 8 画面 = Splash + Welcome + Language + Step 1-5)。
 *
 * Splash は Expo SplashScreen 連携で本フロー外。
 * 配列 index 順に進む。
 */
export const ONBOARDING_STEP_ORDER: readonly OnboardingStep[] = [
  'welcome',
  'language',
  'tut1',
  'tut2',
  'tut3',
  'tut4',
  'tut5',
] as const;

/**
 * 全 step が dismissed (= 「あとで」スキップ済) かを判定する純関数。
 *
 * @param dismissed Partial<Record<OnboardingStep, boolean>>
 * @returns 全 step が true なら true (= 完了相当)
 */
export function isAllStepsDismissed(dismissed: Partial<Record<OnboardingStep, boolean>>): boolean {
  return ONBOARDING_STEP_ORDER.every((step) => dismissed[step] === true);
}

/**
 * オンボフロー全体が完了状態かを判定する純関数。
 *
 * - completed (永続化済) が true → 完了
 * - 全 step が dismissed → 完了 (4 パターンの「全スキップ」シナリオ)
 *
 * @param completed onboardingStore の completed フラグ
 * @param dismissed onboardingStore の dismissed マップ
 */
export function isOnboardingFinished(
  completed: boolean,
  dismissed: Partial<Record<OnboardingStep, boolean>>,
): boolean {
  if (completed) return true;
  return isAllStepsDismissed(dismissed);
}

/**
 * 次に表示すべきオンボ step を返す純関数。
 *
 * - completed=true → null (フロー終了済)
 * - dismissed されていない最初の step を返す
 * - 全 dismissed → null (= 完了相当)
 *
 * @example
 *   getNextOnboardingStep(false, {}) === 'welcome'
 *   getNextOnboardingStep(false, { welcome: true }) === 'language'
 *   getNextOnboardingStep(false, { welcome: true, language: true, tut1: true,
 *                                  tut2: true, tut3: true, tut4: true, tut5: true }) === null
 *   getNextOnboardingStep(true, {}) === null
 */
export function getNextOnboardingStep(
  completed: boolean,
  dismissed: Partial<Record<OnboardingStep, boolean>>,
): OnboardingStep | null {
  if (completed) return null;
  for (const step of ONBOARDING_STEP_ORDER) {
    if (dismissed[step] !== true) return step;
  }
  return null;
}

/**
 * 進捗率を 0-1 で返す純関数 (UI のプログレスバー用)。
 *
 * - completed → 1
 * - dismissed 数 / ONBOARDING_STEP_ORDER.length
 */
export function getOnboardingProgress(
  completed: boolean,
  dismissed: Partial<Record<OnboardingStep, boolean>>,
): number {
  if (completed) return 1;
  const total = ONBOARDING_STEP_ORDER.length;
  const done = ONBOARDING_STEP_ORDER.filter((s) => dismissed[s] === true).length;
  return done / total;
}

/**
 * チュート (tut1-5) のみで進捗率を返す純関数 (Settings → ヘルプ → 「チュートリアルを再表示」用)。
 *
 * - welcome / language は対象外
 * - 全 tut1-5 完了で 1
 */
export function getTutorialProgress(dismissed: Partial<Record<OnboardingStep, boolean>>): number {
  const tut: OnboardingStep[] = ['tut1', 'tut2', 'tut3', 'tut4', 'tut5'];
  const done = tut.filter((s) => dismissed[s] === true).length;
  return done / tut.length;
}
