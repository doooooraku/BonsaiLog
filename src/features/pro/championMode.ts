/**
 * F-13a championMode.ts 純関数 (Issue #20、ADR-0009 §61-67、AC3-1)。
 *
 * Pocket Casts Champion 方式の判定ロジックを純関数化したもの。
 * Lifetime 所持時はサブスクリプション (月額/年額) Package を非表示にし、
 * 「もう買ったのに購入を促される」UX を完全排除する (高橋さん 62 歳ペルソナ向け)。
 */
import type { PlanKind } from '@/src/types/models';

export function shouldHideSubscriptions(planType: PlanKind | null): boolean {
  return planType === 'lifetime';
}
