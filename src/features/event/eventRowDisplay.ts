/**
 * EventRow の表示用派生値を算出する純関数 (compact / detailed で共有)。
 *
 * wiring 期間判定 (correctness critical) を 2 variant で重複させないため共通化。
 * UI を持たない純粋な導出のみ (hook 不使用、テスト容易)。
 */
import { nowUtc } from '@/src/core/datetime';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import { type Event } from '@/src/db/schema';
import {
  classifyWiringDuration,
  getDaysSinceWired,
  getScheduledUnwireAtWithFallback,
  getWeeksSinceWired,
} from '@/src/features/wiring/wiringDuration';

export type WiringDurationDisplay = {
  weeks: number;
  kind: 'within' | 'overdue';
  isUnwired: boolean;
};

export type EventRowDisplay = {
  eventLabel: string;
  dateLabel: string;
  wiringDuration: WiringDurationDisplay | null;
  scheduledUnwireLabel: string | null;
};

/** 日付フォーマット (bonsai-detail/[id]/index.tsx と同等の local 実装)。 */
function formatDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * event row の派生表示値を算出する。
 * - eventLabel: 作業種別ラベル (i18n)
 * - dateLabel: ロケール整形済み日付
 * - wiringDuration: wiring(logged) の経過週 + within/overdue + 解除済みか (それ以外 null)
 * - scheduledUnwireLabel: 予定解除日ラベル (なければ null)
 */
export function getEventRowDisplay(
  ev: Event,
  eventsForBonsai: Event[],
  lang: string,
  t: (key: TranslationKey) => string,
): EventRowDisplay {
  let wiringDuration: WiringDurationDisplay | null = null;
  let scheduledUnwireLabel: string | null = null;
  if (ev.type === 'wiring' && ev.status === 'logged') {
    const days = getDaysSinceWired(ev, new Date(nowUtc() as string));
    const weeks = getWeeksSinceWired(days);
    const kind = classifyWiringDuration(days);
    const isUnwired = eventsForBonsai.some(
      (other) =>
        other.type === 'unwiring' &&
        other.status === 'logged' &&
        other.occurredAtUtc >= ev.occurredAtUtc,
    );
    wiringDuration = { weeks, kind, isUnwired };
    const scheduled = getScheduledUnwireAtWithFallback(ev);
    if (scheduled) {
      scheduledUnwireLabel = t('wiringScheduledUnwireSet').replace(
        '{date}',
        scheduled.slice(0, 10),
      );
    }
  }

  return {
    eventLabel: t(`eventType_${ev.type}` as TranslationKey),
    dateLabel: formatDate(ev.occurredAtUtc, lang),
    wiringDuration,
    scheduledUnwireLabel,
  };
}
