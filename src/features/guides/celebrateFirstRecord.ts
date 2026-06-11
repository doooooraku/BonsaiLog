/**
 * g5 — 最初の作業記録のお祝い Toast (#1178 / ADR-0058)。
 *
 * optInPrompt (ADR-0014 Amended) と同じ「保存成功後に 1 行呼ぶだけ」パターン。
 * 既存の保存 Toast の**後**に呼ぶこと — 該当時のみメッセージを上書きする
 * (Toast store は単一メッセージのため、お祝いが標準 Toast を置き換える)。
 *
 * 呼出側 = events が logged になる全経路 (R-55 網羅済、2 箇所):
 * - BulkLogConfirmScreen (一括記録 + 予定→記録の一括変換)
 * - WorkLogConfirmScreen (単発記録 + 予定→記録の単発変換)
 *
 * 予定側のお祝い (g4) は不採用 — optInPrompt と同瞬間衝突 (ADR-0058 §ガイド一覧)。
 */
import { useToastStore } from '@/src/components/Toast';
import type { TranslationKey } from '@/src/core/i18n/i18n';
import { countLoggedEvents } from '@/src/db/eventRepository';
import { useGuidesStore } from '@/src/stores/guidesStore';

import { canShowGuide, shouldShowG5FirstRecordCelebration } from './guideTriggers';

/** お祝い Toast の表示時間 — 標準 3000ms より長め (2 文 + シニア可読性)。 */
const CELEBRATION_DURATION_MS = 6000;

export async function maybeCelebrateFirstRecord(t: (key: TranslationKey) => string): Promise<void> {
  const { seen, markSeen } = useGuidesStore.getState();
  // seen 済みなら COUNT クエリ自体を省略 (2 回目以降の保存を一切重くしない)
  if (!canShowGuide('g5FirstRecordCelebrated', seen)) return;
  const total = await countLoggedEvents();
  if (!shouldShowG5FirstRecordCelebration(total, seen)) return;
  markSeen('g5FirstRecordCelebrated');
  useToastStore.getState().show(t('guideFirstRecordToast'), {
    durationMs: CELEBRATION_DURATION_MS,
  });
}
