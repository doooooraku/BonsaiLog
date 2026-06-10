/**
 * 単一 event の通知 cancel helper (Sess23 ADR-0035 D3 + D7 / Sess24 PR-ζ-1-④ で設計再評価)。
 *
 * 用途:
 * - softDeleteEvent 経路 (Phase 3 個別削除動線、 Phase 4 予定→記録変換 + FAB 自動削除) で
 *   削除した event に紐付く scheduled notification を cancel
 *
 * ## ADR-0014 整合設計 (Sess24 PR-ζ-1-④ 再評価)
 *
 * SUMMARY 通知 identifier は **日単位** (`daily_summary_<dateKey>`、 dailySummary.ts L26)、
 * 1 日 N 件の planned events を **1 通知 (件数 body)** で集約する仕様 (ADR-0014 §通知数の上限管理)。
 *
 * → **「event 個別 cancel API (event ID prefix 追加)」 は ADR-0014 と矛盾**:
 * - 1 通知 = 件数集計 ≠ event 単位
 * - event 1 件 = 通知 1 件にすると spam (同日 N 件で N 通知) で ADR-0014 §通知数上限違反
 *
 * → **真の最適化方向 = dateKey 単位 helper**:
 * - 削除した event の dateKey の通知のみ cancel + re-build/re-schedule
 * - 他 dateKey の通知は触らない (無駄な API 呼出削減)
 * - `cancelForDateKey(dateKey, t)` で実装 (将来 Phase η で完成)
 *
 * ## 現状実装 (Sess24)
 *
 * - `cancelForEvent(eventId, t)`: 既存 signature 維持 (callsite 5 箇所の互換性)、 内部は `triggerSummaryReschedule(t)` wrap
 * - `cancelForDateKey(dateKey, t)`: 新規 export、 将来の dateKey 単位最適化用 hook、 内部は当面 wrap (同上)
 * - 真の dateKey 単位最適化 (Phase η Future Work): `Notifications.cancelScheduledNotificationAsync(identifier)`
 *   で特定 identifier 1 件のみ cancel + 該当 dateKey 1 件のみ re-schedule
 *
 * ## 旧 Future Work (ADR-0035 #4) との関係
 *
 * 旧 plan「SUMMARY 通知 identifier に event ID prefix 追加 → 個別 cancel API」 は本 PR で **方針修正**:
 * - 個別 cancel = ADR-0014 と矛盾、 設計上不可
 * - dateKey 単位最適化が正しい方向 (本 file で signature 整備、 Phase η で内部実装最適化)
 *
 * 注意: t (TranslationFunction) は SUMMARY 通知 body の文言生成に必要、 呼出側で渡す。
 */
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import { triggerSummaryReschedule } from './triggerReschedule';

type TFunc = (key: TranslationKey) => string;

/**
 * 単一 event 削除時の通知 cancel (既存 signature 維持、 callsite 互換性確保)。
 *
 * 内部実装: 当面は全 SUMMARY を reschedule (削除済 event は集計時に自動除外で結果整合)。
 * Phase η Future Work: `cancelForDateKey` 経由で dateKey 単位最適化に切替検討。
 */
export async function cancelForEvent(_eventId: string, t: TFunc): Promise<void> {
  // _eventId は将来の dateKey 算出ヒント (event obj 経由で localDateKeyFromUtc 呼出) のため受領
  // 現状は全 SUMMARY 通知を reschedule (削除済 event は自動的に対象外、 結果整合)
  await triggerSummaryReschedule(t);
}

/**
 * 特定 dateKey の通知 cancel (Sess24 PR-ζ-1-④ 新規 helper、 将来最適化用 hook)。
 *
 * 想定用途: 削除済 event の dateKey が判明している場合に、 該当日付の通知のみ最小コストで update。
 *
 * 内部実装: 当面は全 SUMMARY を reschedule (cancelForEvent と同 logic、 dateKey 単位最適化は Phase η)。
 *
 * Phase η Future Work での真の最適化:
 * ```ts
 * await Notifications.cancelScheduledNotificationAsync(`${SUMMARY_IDENTIFIER_PREFIX}${dateKey}`);
 * const remainingEvents = await getActivePlannedEventsForDate(dateKey);
 * if (remainingEvents.length > 0) {
 *   await rescheduleSingleDate(dateKey, remainingEvents, ...);
 * }
 * ```
 */
export async function cancelForDateKey(_dateKey: string, t: TFunc): Promise<void> {
  void _dateKey; // 当面未使用、 signature 整備のみ
  await triggerSummaryReschedule(t);
}

/**
 * 複数 event 削除時の通知 cancel bulk wrapper (Sess25 ADR-0036 D5/D8 / R-44 / R-43 整合)。
 *
 * 用途: `bulkSoftDeleteEvents` 直後の SUMMARY 再計算 (削除済 events は自動的に集計外 = 結果整合)。
 *
 * 内部実装: 全 SUMMARY を 1 回 reschedule (冪等のため N 件分 sequential 不要、 1 回呼出で全 dateKey
 * の SUMMARY が削除済 events を除外して再集計される)。
 *
 * wiring cascade (ADR-0036 D8): unwiring event は独立 record 不在 (wiring payload 内
 * scheduled_unwire_at で予定日のみ保持)。 SUMMARY は status='planned' events のみ集計するため
 * scheduled_unwire_at 自体は通知対象外、 wiring planned 削除は SUMMARY 再計算で自動的に
 * 集計から除外され cascade 完了 = 個別 cancel API 不要 (Sess96 doc-truth 修正)。
 *
 * @param _eventIds 削除した event ID 配列 (将来 dateKey 単位最適化 hook 用、 当面は未使用)
 */
export async function cancelForEvents(_eventIds: readonly string[], t: TFunc): Promise<void> {
  void _eventIds; // 当面未使用、 全 SUMMARY reschedule で結果整合
  await triggerSummaryReschedule(t);
}
