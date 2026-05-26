/**
 * 通知 reschedule trigger wrapper (Sess12 PR-I MVP)。
 *
 * 起動時 + bulk write 後に呼び出して `rescheduleDailySummaryNotifications` を実行する。
 * settingsStore の通知 toggle + 通知許可確認を集約。
 *
 * 設計方針 (ADR-0011 / ADR-0014 Amended 整合):
 * - 通知 OFF → reschedule(enabled: false) で既存通知 cancel (この分岐では permission を要求しない
 *   = デフォルト OFF の起動時に OS 許可ダイアログが暴発しない)
 * - permission denied → no-op (user が設定 OS で許可拒否済)
 * - 例外は console.warn のみ、 起動 / write は継続
 */
import { getTzOffsetMin, nowUtc } from '@/src/core/datetime';
import type { TranslationKey } from '@/src/core/i18n/i18n';
import { getAllActivePlannedAndLoggedEvents } from '@/src/db/eventRepository';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { toLocalDateKey } from '@/src/features/watering/dateUtils';

import {
  rescheduleDailySummaryNotifications,
  requestNotificationPermission,
  type NotificationCopy,
} from './scheduler';

type TFunc = (key: TranslationKey) => string;

function parseTime(timeStr: string): { hour: number; minute: number } {
  const [h, m] = timeStr.split(':');
  const hour = Number(h);
  const minute = Number(m);
  return {
    hour: Number.isFinite(hour) ? hour : 9,
    minute: Number.isFinite(minute) ? minute : 0,
  };
}

/**
 * 当日まとめ通知を再スケジュールする。
 *
 * @param t - i18n translation function
 */
export async function triggerSummaryReschedule(t: TFunc): Promise<void> {
  try {
    const state = useSettingsStore.getState();
    const enabled = state.notificationDailySummaryEnabled;

    const copy: NotificationCopy = {
      summary: (count: number) => ({
        title: t('notificationSummaryTitle'),
        body: t('notificationSummaryBody').replace('{count}', String(count)),
      }),
    };

    const tzOffsetMin = getTzOffsetMin();
    const todayKey = toLocalDateKey(nowUtc() as string, tzOffsetMin);
    const time = parseTime(state.notificationDailySummaryTime);

    // 通知 OFF → cancel only (enabled: false で scheduler が既存を全 cancel、permission は要求しない)
    if (!enabled) {
      await rescheduleDailySummaryNotifications({
        enabled: false,
        time,
        todayKey,
        tzOffsetMin,
        events: [],
        copy,
      });
      return;
    }

    // permission 確認 (ADR-0011: user 設定 ON でも permission 拒否ならスキップ)
    const granted = await requestNotificationPermission();
    if (!granted) return;

    // events 取得 (planned のみ、 deleted 除外)
    const allEvents = await getAllActivePlannedAndLoggedEvents();
    const plannedEvents = allEvents
      .filter((e) => e.status === 'planned' && !e.deletedAt)
      .map((e) => ({
        occurredAtUtc: e.occurredAtUtc,
        tzOffsetMin: e.tzOffsetMin,
      }));

    await rescheduleDailySummaryNotifications({
      enabled: true,
      time,
      todayKey,
      tzOffsetMin,
      events: plannedEvents,
      copy,
      nowMs: Date.now(),
    });
  } catch (error) {
    // 通知失敗は致命的ではない (アプリ起動 + write は継続)
    console.warn('[notification] triggerSummaryReschedule failed:', error);
  }
}
