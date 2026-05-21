/**
 * 過去 30 日前の dateKey を算出する純関数 (Sess22 ADR-0034 D6)。
 *
 * 用途: ふりかえり hub の「カレンダー」 card tap 時、 PlanScreen への deep link で
 * `selectedDateKey=<past30dKey>` を指定し、 過去 30 日が選択状態で開く (= 過去軸入口の差別化)。
 *
 * 下タブ Calendar (今日中心の月ナビ) との差別化:
 * - 下タブ: 今日 default、 月選択で過去/未来へ navigate
 * - ふりかえり hub: 過去 30 日前 default、 「過去を振り返る」 文脈
 *
 * 純関数: now Date を引数で受け取り、 testability を確保 (TZ 跨ぎ test 用)。
 */
import { toLocalDateKey } from '@/src/features/watering/wateringHeatmap';

export function computePast30DaysKey(now: Date, tzOffsetMin: number): string {
  const past30dMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  const past30dIso = new Date(past30dMs).toISOString();
  return toLocalDateKey(past30dIso, tzOffsetMin);
}
