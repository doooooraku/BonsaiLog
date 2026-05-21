/**
 * 単一 event の通知 cancel helper (Sess23 ADR-0035 D3 + D7 由来、 F-16 ゴースト通知防止)。
 *
 * 用途:
 * - softDeleteEvent 経路 (Phase 3 個別削除動線、 Phase 4 予定→記録変換 + FAB 自動削除) で
 *   削除した event に紐付く scheduled notification を cancel
 *
 * 現状実装 (Sess23):
 * - SUMMARY 通知は日付 prefix ベースで identifier 生成されており、 event ID 単独で cancel する
 *   API が scheduler に未実装。 当面の helper は `triggerSummaryReschedule(t)` を呼ぶ wrap で実装、
 *   全 SUMMARY を cancel + 残 planned で再 schedule することで削除済 event の通知を消す。
 *
 * Future Work (Sess24+):
 * - SUMMARY 通知 identifier に event ID prefix を追加 → 個別 cancel API 提供
 *
 * 注意: t (TranslationFunction) は SUMMARY 通知 body の文言生成に必要、 呼出側で渡す。
 */
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import { triggerSummaryReschedule } from './triggerReschedule';

type TFunc = (key: TranslationKey) => string;

export async function cancelForEvent(_eventId: string, t: TFunc): Promise<void> {
  // _eventId は将来の個別 cancel API 移行時の signature 互換性のため受け取るのみ
  // 現状は全 SUMMARY 通知を reschedule (削除済 event は自動的に対象外)
  await triggerSummaryReschedule(t);
}
