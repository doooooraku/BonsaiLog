/**
 * F-16 ローカル通知 — expo-notifications wrapper (Issue #30 / ADR-0014)。
 *
 * Related:
 * - ADR-0014 §当日まとめ通知 / §Android 通知チャネル / §iOS interruption level
 *   (②水やり繰り返し通知は廃止。 通知は当日まとめの 1 系統のみ。)
 * - dailySummary.ts (純関数: 集計 + DATE trigger 仕様)
 *
 * 設計方針:
 * - 副作用 (Notifications API 呼び出し) はこのファイルに集約、純関数はテストしやすく分離
 * - prefix マッチによる既存通知の一括キャンセル → 7 日ローリングと整合
 * - Android チャネル (DAILY_SUMMARY) を最初に作成、iOS は interruption level `.active` 既定
 * - i18n は呼出側で `NotificationCopy` を組み立てて渡す (テストモック容易)
 * - エラーは飲み込まずに `console.warn` でログ、Sentry 連携は v1.x で追加
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  buildSummarySchedules,
  type PlannedEventLike,
  SUMMARY_IDENTIFIER_PREFIX,
} from './dailySummary';

/** Android 通知チャネル ID (ADR-0014 §11)。 */
export const NOTIFICATION_CHANNELS = {
  DAILY_SUMMARY: 'bonsai_daily_summary',
} as const;

/** 通知本文を生成する関数の型 (i18n と分離するためコールバックで受ける)。 */
export type NotificationCopy = {
  /** 当日まとめ通知 (本文に件数を埋め込む)。 */
  summary: (count: number) => { title: string; body: string };
};

// ---------------------------------------------------------------------------
// 権限 / Android チャネル
// ---------------------------------------------------------------------------

/**
 * Android チャネル (DAILY_SUMMARY) を作成する。
 *
 * - iOS では何もしない (チャネル概念なし)
 * - importance DEFAULT 固定 (ADR-0014 §11)
 * - 失敗しても起動は継続 (catch + warn のみ)
 */
export async function ensureNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.DAILY_SUMMARY, {
      name: 'Daily Summary',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch (error) {
    console.warn('[notification] ensureNotificationChannels failed:', error);
  }
}

/**
 * 通知許可をリクエストする。既に granted ならスキップ。
 * - canAskAgain=false の状態でも getPermissionsAsync が返す granted を尊重
 * - 戻り値: granted=true なら通知可
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (current.canAskAgain === false) return false;
    const next = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    return next.granted;
  } catch (error) {
    console.warn('[notification] requestNotificationPermission failed:', error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// 内部ヘルパー
// ---------------------------------------------------------------------------

async function cancelByPrefix(prefix: string): Promise<void> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    const targets = all.filter((req) => req.identifier?.startsWith(prefix));
    await Promise.all(
      targets.map((req) => Notifications.cancelScheduledNotificationAsync(req.identifier)),
    );
  } catch (error) {
    console.warn(`[notification] cancelByPrefix(${prefix}) failed:`, error);
  }
}

// ---------------------------------------------------------------------------
// 当日まとめ通知 (DATE trigger × N)
// ---------------------------------------------------------------------------

export type RescheduleSummaryArgs = {
  enabled: boolean;
  /** Settings 値 ("HH:MM" の hour/minute へ分解済み)。 */
  time: { hour: number; minute: number };
  /** 端末ローカル日付 "YYYY-MM-DD" (datetime ラッパー由来)。 */
  todayKey: string;
  /** 現在の TZ オフセット (分、JST=+540)。 */
  tzOffsetMin: number;
  /** planned events (status='planned' AND deleted_at IS NULL の事前 filter 済み)。 */
  events: readonly PlannedEventLike[];
  /** 通知本文生成 (i18n)。 */
  copy: NotificationCopy;
  /** 現在 UTC ms (テスト容易性、production は Date.now())。 */
  nowMs?: number;
};

/**
 * 当日まとめ通知を 7 日ローリングで再予約する。
 *
 * - prefix `daily_summary_` で既存を全キャンセル
 * - enabled=false なら全キャンセルのみで終了
 * - 該当日 0 件の日はスキップ (ADR-0014 §21.3.3)
 * - DATE trigger × N (N <= 7)
 */
export async function rescheduleDailySummaryNotifications(
  args: RescheduleSummaryArgs,
): Promise<number> {
  await cancelByPrefix(SUMMARY_IDENTIFIER_PREFIX);
  if (!args.enabled) return 0;

  // 集計 (dailySummary.aggregateByLocalDay と同等のロジックをインライン展開、循環依存回避)
  const byDate: Record<string, number> = {};
  for (const event of args.events) {
    const utcMs = Date.parse(event.occurredAtUtc);
    if (!Number.isFinite(utcMs)) continue;
    const localMs = utcMs + event.tzOffsetMin * 60_000;
    const dayMs = Math.floor(localMs / 86_400_000) * 86_400_000;
    const key = new Date(dayMs).toISOString().slice(0, 10);
    byDate[key] = (byDate[key] ?? 0) + 1;
  }

  const schedules = buildSummarySchedules(
    byDate,
    args.todayKey,
    args.time.hour,
    args.time.minute,
    args.tzOffsetMin,
    args.nowMs ?? Date.now(),
  );

  let scheduled = 0;
  for (const spec of schedules) {
    try {
      const { title, body } = args.copy.summary(spec.count);
      await Notifications.scheduleNotificationAsync({
        identifier: spec.identifier,
        content: {
          title,
          body,
          data: { type: 'daily_summary', date: spec.dateKey, count: spec.count },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: spec.fireDate,
          channelId: NOTIFICATION_CHANNELS.DAILY_SUMMARY,
        },
      });
      scheduled += 1;
    } catch (error) {
      console.warn(`[notification] schedule summary ${spec.identifier} failed:`, error);
    }
  }
  return scheduled;
}

// ---------------------------------------------------------------------------
// 全消し (Settings 通知 OFF / 引継ぎ初期化等)
// ---------------------------------------------------------------------------

/**
 * F-16 が予約した通知を全てキャンセルする (prefix マッチ、他系を残す)。
 */
export async function cancelAllManagedNotifications(): Promise<void> {
  await cancelByPrefix(SUMMARY_IDENTIFIER_PREFIX);
}
