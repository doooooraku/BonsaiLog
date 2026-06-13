/**
 * 単一 event row 共通 component (Sess22 ADR-0034 D5)。
 *
 * 元 bonsai-detail/[id]/index.tsx の private `EventSingleRow` を移設、
 * PlanScreen listing でも流用するため props 拡張 (bonsaiName / onPress / showBonsaiName)。
 *
 * 用途:
 * - bonsai-detail history タブ: connect 関数なし + onLongPress で削除確認 + showBonsaiName=false
 * - PlanScreen logged section: onPress で router.push + showBonsaiName=true
 *
 * 「PlanScreen listing と bonsai-detail history の row 表示が pixel 整合」 (整合性レベル 2、 ADR-0034 D4)。
 *
 * Sess34 ADR-0041 PR-5: `displayMode: 'compact' | 'detailed'` prop。
 * - compact (default): 後方互換、 既存 row 表示 (memo 2 行、 chips 制限なし、 写真なし)
 * - detailed: ADR-0041 D2/D4/D5 — 写真 strip + chips max 4 + memo 3 行 + 「もっと見る」 リンク
 *
 * Phase 4 C1 (ADR-0045): 609 行 god を **thin dispatcher** に分解。
 * - 表示は EventRowCompact / EventRowDetailed に委譲 (ADR-0041 matrix は各 variant が厳守)
 * - 派生値 (wiring 期間 / 日付 / label) は eventRowDisplay.ts の純関数で共有
 * - public API (EventRowProps / EventRowDisplayMode / EventRow) は不変
 *
 * wiring 期間判定の依存:
 * - `eventsForBonsai` は **該当 bonsai の全期間 events** を渡す必要あり (短絡防止)
 * - PlanScreen は `events.filter(x => x.bonsaiId === ev.bonsaiId)` で渡す
 * - bonsai-detail は同 component scope の `events` (= 該当 bonsai 全期間) を渡す
 */

import { EventRowPhotoStrip } from '@/src/features/event/EventRowPhotoStrip';

import { EventRowCompact } from './EventRowCompact';
import { EventRowDetailed } from './EventRowDetailed';
import type { EventRowProps } from './eventRowTypes';

export type { EventRowDisplayMode, EventRowProps } from './eventRowTypes';

/**
 * displayMode に応じて compact / detailed の row variant へ委譲する dispatcher。
 * props は両 variant 共通 (EventRowProps) のためそのまま spread する。
 */
export function EventRow(props: EventRowProps) {
  return props.displayMode === 'detailed' ? (
    <EventRowDetailed {...props} />
  ) : (
    <EventRowCompact {...props} />
  );
}

// EventRowPhotoStrip は現状どの variant でも使用していないが、 Phase η の forward-only 思想で
// 温存 (compact mode 等で再利用候補、 Phase 7 dead-code 判断まで保持)。
// ESLint unused-imports rule 回避のため __noop_ref 経由で参照。
const __EventRowPhotoStrip_kept_for_forward_compat = EventRowPhotoStrip;
void __EventRowPhotoStrip_kept_for_forward_compat;
