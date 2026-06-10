/**
 * レビュー依頼の発火判定 (純粋関数、ADR-0006 Sess98 Amendment)。
 *
 * 設計分担: 「いつ出すか (品質)」 = 本 module の自前 gate、
 * 「何回出すか (頻度)」 = OS quota (Google Play time-bound quota / iOS 年 3 回) に任せる。
 * RN / Expo import ゼロ (Jest 境界値テスト: __tests__/features/review/reviewPolicy.test.ts)。
 *
 * Related:
 * - docs/adr/ADR-0006-in-app-review-trigger.md (Sess98 Amendment D2/D3/D4/D5)
 * - src/features/review/maybeRequestReview.ts (orchestrator、 expo-store-review 呼び出し)
 */

/** D2: 累計 logged events のマイルストーン (到達ごとに 1 回のみ試行)。 */
export const REVIEW_MILESTONES = [10, 30, 75, 150, 300] as const;

/** D4: 初回起動からの保護日数 (ライトユーザーの離脱期にダイアログを出さない)。 */
export const FIRST_LAUNCH_PROTECTION_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * D3: 逓増 cooldown 日数。 1 回目試行後 30 日 → 2 回目後 60 日 → 3 回目以降 90 日。
 * 長期ユーザーに毎月出続けるのを防ぎつつ、 iOS (年 3 回/端末) でも自然に温存される値。
 */
export function reviewCooldownDays(requestCount: number): number {
  if (requestCount <= 1) return 30;
  if (requestCount === 2) return 60;
  return 90;
}

export type ReviewGateInput = {
  /** 累計 logged events 数 (ゴミ箱除く、 eventRepository.countLoggedEvents)。 */
  totalLoggedCount: number;
  /** これまでの試行回数 (D5: 呼び出した = 試行。 表示有無は Google Play 仕様で検知不可)。 */
  requestCount: number;
  /** 直近試行の UTC ISO (null = 未試行)。 */
  lastRequestAtUtc: string | null;
  /** 初回起動の UTC ISO (null = bootstrap 前 → 出さない)。 */
  firstLaunchAtUtc: string | null;
  /** 試行済みの最大マイルストーン (0 = なし)。 同一マイルストーンでは再試行しない。 */
  lastMilestone: number;
  /** 現在時刻 UTC ISO。 */
  nowUtc: string;
};

export type ReviewGateResult = {
  request: boolean;
  /** request === true のとき、 今回試行するマイルストーン値 (markRequested に渡す)。 */
  milestone: number | null;
};

/** 到達済みの最大マイルストーンを返す (未達なら null)。 */
export function resolveReviewMilestone(totalLoggedCount: number): number | null {
  let resolved: number | null = null;
  for (const m of REVIEW_MILESTONES) {
    if (totalLoggedCount >= m) resolved = m;
  }
  return resolved;
}

export function shouldRequestReview(input: ReviewGateInput): ReviewGateResult {
  const no: ReviewGateResult = { request: false, milestone: null };
  // D2: マイルストーン未達 or 到達済みマイルストーンを試行済み → 出さない
  const milestone = resolveReviewMilestone(input.totalLoggedCount);
  if (milestone == null || milestone <= input.lastMilestone) return no;
  // D4: 初回起動から 3 日未満は出さない (bootstrap 前 = null も出さない)
  if (input.firstLaunchAtUtc == null) return no;
  const now = Date.parse(input.nowUtc);
  if (now - Date.parse(input.firstLaunchAtUtc) < FIRST_LAUNCH_PROTECTION_DAYS * DAY_MS) return no;
  // D3: 逓増 cooldown (前回試行から 30/60/90 日経過まで出さない)
  if (input.requestCount > 0 && input.lastRequestAtUtc != null) {
    const requiredMs = reviewCooldownDays(input.requestCount) * DAY_MS;
    if (now - Date.parse(input.lastRequestAtUtc) < requiredMs) return no;
  }
  return { request: true, milestone };
}
