/**
 * レビュー依頼の発火判定 (純粋関数、ADR-0006 Sess98 Amendment + 追補 2)。
 *
 * 設計分担: 「いつ出すか (品質)」 = 本 module の自前 gate、
 * 「何回出すか (頻度)」 = OS quota (Google Play time-bound quota / iOS 年 3 回) に任せる。
 *
 * Sess98 追補 2: 旧マイルストーン列 (10/30/75/150/300 で生涯 5 回打ち止め) を撤廃し、
 * 「累計 10 件で初回 → 以降は前回試行から +10 件 & cooldown 経過のたび」の無限ループへ。
 * キャンセル/表示/送信の別は OS 仕様で検知不可のため、 キャンセルされても機会は失われず
 * 次の周期で自動的に再試行される。
 *
 * RN / Expo import ゼロ (Jest 境界値テスト: __tests__/features/review/reviewPolicy.test.ts)。
 *
 * Related:
 * - docs/adr/ADR-0006-in-app-review-trigger.md (Sess98 Amendment + 追補 2)
 * - src/features/review/maybeRequestReview.ts (orchestrator、 expo-store-review 呼び出し)
 */

/** 初回試行に必要な累計 logged events 数 (満足度の最低信頼ライン)。 */
export const REVIEW_MIN_TOTAL_EVENTS = 10;

/** ループ条件: 前回試行からの記録増分 (= 「今も使い込んでいる」 継続利用シグナル)。 */
export const REVIEW_DELTA_EVENTS = 10;

/** D4: 初回起動からの保護日数 (ライトユーザーの離脱期にダイアログを出さない)。 */
export const FIRST_LAUNCH_PROTECTION_DAYS = 3;

/** Android: Play quota (公式例示 ≒ 月 1 回) に張り付いて使い切る 30 日。 */
export const REVIEW_COOLDOWN_DAYS_ANDROID = 30;

/** iOS: 年 3 回/端末のハードリミットを 365 ÷ 3 ≒ 122 日で分散して確実に使い切る。 */
export const REVIEW_COOLDOWN_DAYS_IOS = 122;

const DAY_MS = 24 * 60 * 60 * 1000;

/** platform (Platform.OS) 別 cooldown 日数。 ios 以外 (android / 将来の他環境) は 30 日。 */
export function reviewCooldownDays(platform: string): number {
  return platform === 'ios' ? REVIEW_COOLDOWN_DAYS_IOS : REVIEW_COOLDOWN_DAYS_ANDROID;
}

export type ReviewGateInput = {
  /** 累計 logged events 数 (ゴミ箱除く、 eventRepository.countLoggedEvents)。 */
  totalLoggedCount: number;
  /** 直近試行時点の累計 logged 数 (null = 未試行)。 増分 +10 件判定の起点。 */
  countAtLastRequest: number | null;
  /** 直近試行の UTC ISO (null = 未試行)。 */
  lastRequestAtUtc: string | null;
  /** 初回起動の UTC ISO (null = bootstrap 前 → 出さない)。 */
  firstLaunchAtUtc: string | null;
  /** 現在時刻 UTC ISO。 */
  nowUtc: string;
  /** Platform.OS ('android' | 'ios' | ...)。 cooldown 切替用。 */
  platform: string;
};

export function shouldRequestReview(input: ReviewGateInput): boolean {
  // 最低信頼ライン: 累計 10 件未満は出さない
  if (input.totalLoggedCount < REVIEW_MIN_TOTAL_EVENTS) return false;
  // D4: 初回起動から 3 日未満は出さない (bootstrap 前 = null も出さない)
  if (input.firstLaunchAtUtc == null) return false;
  const now = Date.parse(input.nowUtc);
  if (now - Date.parse(input.firstLaunchAtUtc) < FIRST_LAUNCH_PROTECTION_DAYS * DAY_MS) {
    return false;
  }
  // ループ条件 (2 回目以降): cooldown 経過 + 前回試行から記録 +10 件
  if (input.lastRequestAtUtc != null) {
    const requiredMs = reviewCooldownDays(input.platform) * DAY_MS;
    if (now - Date.parse(input.lastRequestAtUtc) < requiredMs) return false;
    if (input.totalLoggedCount - (input.countAtLastRequest ?? 0) < REVIEW_DELTA_EVENTS) {
      return false;
    }
  }
  return true;
}
