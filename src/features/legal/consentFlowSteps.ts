/**
 * F-LEGAL-001 ATT/UMP 7 ステップ順序判定 (Phase C、Issue #37 / ADR-0017、F-22 AC7-1 連携)。
 *
 * AC7-1 (F-22): ウェルカム → 言語 → 通知 → ATT explainer → ATT → UMP requestInfoUpdate → UMP form
 *
 * 副作用なし純関数:
 * - getNextConsentStep(current, state): ConsentStep | 'completed'
 * - skipToFirstApplicableStep(state): ConsentStep | 'completed'
 *
 * UI 配線 (画面遷移 + ATT/UMP SDK 呼出) は呼出側 (Phase D 以降の UI 層) で実施。
 * 本ファイルは「state → 次 step」のロジックだけを責務とする。
 */

/** ATT/UMP 7 ステップの種別 (AC7-1)。 */
export type ConsentStep =
  | 'welcome'
  | 'language'
  | 'notification'
  | 'att_explainer'
  | 'att'
  | 'ump_request'
  | 'ump_form';

/** AC7-1 の順序定義 (固定)。 */
export const CONSENT_STEP_ORDER: readonly ConsentStep[] = [
  'welcome',
  'language',
  'notification',
  'att_explainer',
  'att',
  'ump_request',
  'ump_form',
] as const;

/** ATT (App Tracking Transparency) のステータス。 */
export type AttStatus = 'authorized' | 'denied' | 'restricted' | 'not_determined' | 'unsupported';

/** Consent 進捗 state (UI 層が AsyncStorage / SDK から組み立てる)。 */
export type ConsentState = {
  /** Pro 加入時 = ATT/UMP スキップ (ADR-0010、ADR-0017)。 */
  isPro: boolean;
  /** Welcome 画面表示完了。 */
  welcomeShown: boolean;
  /** 言語選択完了。 */
  languageSelected: boolean;
  /** 通知許可ダイアログ完了 (拒否でも完了扱い)。 */
  notificationDecided: boolean;
  /** ATT explainer 中立説明画面表示完了。 */
  attExplainerShown: boolean;
  /** ATT ダイアログ完了 (UI 層が `ATTrackingManager.requestTrackingAuthorization` 呼出後の status を渡す)。 */
  attStatus: AttStatus;
  /** UMP `requestInfoUpdate` 完了。 */
  umpRequestCompleted: boolean;
  /** UMP form 完了 (`canRequestAds` 判定可能)。 */
  umpFormCompleted: boolean;
};

/**
 * 「次に表示すべき step」を返す純関数。
 *
 * - Pro 加入者 → 'completed' (ATT/UMP スキップ、ADR-0017)
 * - 順序定義に従い、未完了の最初の step を返す
 * - ATT 'unsupported' (Android / iOS<14) → ATT explainer + ATT スキップ
 * - 全完了 → 'completed'
 */
export function getNextConsentStep(state: ConsentState): ConsentStep | 'completed' {
  if (state.isPro) return 'completed';

  if (!state.welcomeShown) return 'welcome';
  if (!state.languageSelected) return 'language';
  if (!state.notificationDecided) return 'notification';

  // ATT 関連は iOS only。'unsupported' なら explainer/att をスキップ。
  if (state.attStatus !== 'unsupported') {
    if (!state.attExplainerShown) return 'att_explainer';
    if (state.attStatus === 'not_determined') return 'att';
  }

  if (!state.umpRequestCompleted) return 'ump_request';
  if (!state.umpFormCompleted) return 'ump_form';

  return 'completed';
}

/**
 * Consent フロー全体が完了状態かを判定する純関数。
 */
export function isConsentFlowCompleted(state: ConsentState): boolean {
  return getNextConsentStep(state) === 'completed';
}

/**
 * 進捗率を 0-1 で返す純関数 (UI のプログレスバー用)。
 *
 * - Pro → 1
 * - 完了済 step 数 / 全 step 数
 * - ATT unsupported 環境では分母も調整 (ATT 関連 2 step をカウントから除外)
 */
export function getConsentFlowProgress(state: ConsentState): number {
  if (state.isPro) return 1;

  const checks: { name: ConsentStep; done: boolean; applicable: boolean }[] = [
    { name: 'welcome', done: state.welcomeShown, applicable: true },
    { name: 'language', done: state.languageSelected, applicable: true },
    { name: 'notification', done: state.notificationDecided, applicable: true },
    {
      name: 'att_explainer',
      done: state.attExplainerShown,
      applicable: state.attStatus !== 'unsupported',
    },
    {
      name: 'att',
      done: state.attStatus !== 'not_determined',
      applicable: state.attStatus !== 'unsupported',
    },
    { name: 'ump_request', done: state.umpRequestCompleted, applicable: true },
    { name: 'ump_form', done: state.umpFormCompleted, applicable: true },
  ];

  const applicable = checks.filter((c) => c.applicable);
  const done = applicable.filter((c) => c.done).length;
  return applicable.length === 0 ? 1 : done / applicable.length;
}
