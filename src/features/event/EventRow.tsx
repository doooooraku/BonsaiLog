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
 * wiring 期間判定の依存:
 * - `eventsForBonsai` は **該当 bonsai の全期間 events** を渡す必要あり (短絡防止)
 * - PlanScreen は `events.filter(x => x.bonsaiId === ev.bonsaiId)` で渡す
 * - bonsai-detail は同 component scope の `events` (= 該当 bonsai 全期間) を渡す
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EventIcon } from '@/src/components/icons';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import { nowUtc } from '@/src/core/datetime';
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { type Event, type EventType } from '@/src/db/schema';
import { buildHistoryChips } from '@/src/features/event/buildHistoryChips';
import { HistoryChipRow } from '@/src/features/event/HistoryChip';
import {
  classifyWiringDuration,
  getDaysSinceWired,
  getScheduledUnwireAtWithFallback,
  getWeeksSinceWired,
} from '@/src/features/wiring/wiringDuration';
import { WiringPeriodDisplay } from '@/src/features/wiring/WiringPeriodDisplay';

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

export type EventRowProps = {
  ev: Event;
  /** 該当 bonsai の全期間 events (wiring 期間判定用、 短絡防止) */
  eventsForBonsai: Event[];
  /** PlanScreen で使用 (showBonsaiName=true の時 title 行に表示) */
  bonsaiName?: string;
  lang: string;
  t: (key: TranslationKey) => string;
  /** bonsai-detail で削除確認 (long-press) */
  onLongPress?: (ev: Event) => void;
  /** PlanScreen で router.push (tap) */
  onPress?: (ev: Event) => void;
  /** 連続日 group 展開時に左 indent */
  indent?: boolean;
  /** PlanScreen=true (bonsai 名表示) / bonsai-detail=false (自明) */
  showBonsaiName?: boolean;
};

export function EventRow({
  ev,
  eventsForBonsai,
  bonsaiName,
  lang,
  t,
  onLongPress,
  onPress,
  indent = false,
  showBonsaiName = false,
}: EventRowProps) {
  let wiringDuration: {
    weeks: number;
    kind: 'within' | 'overdue';
    isUnwired: boolean;
  } | null = null;
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

  return (
    <Pressable
      style={[styles.eventRow, indent && styles.eventRowIndent]}
      accessibilityRole="button"
      accessibilityLabel={
        showBonsaiName && bonsaiName
          ? `${bonsaiName}, ${t(`eventType_${ev.type}` as TranslationKey)}`
          : t(`eventType_${ev.type}` as TranslationKey)
      }
      onPress={onPress ? () => onPress(ev) : undefined}
      onLongPress={onLongPress ? () => onLongPress(ev) : undefined}
    >
      <View style={styles.eventIconBox}>
        <EventIcon type={ev.type as EventType} size={20} />
      </View>
      <View style={styles.eventContent}>
        <View style={styles.eventRowMain}>
          {showBonsaiName && bonsaiName ? (
            <ThemedText style={styles.eventBonsaiName} numberOfLines={1}>
              {bonsaiName}
            </ThemedText>
          ) : (
            <ThemedText style={styles.eventLabel}>
              {t(`eventType_${ev.type}` as TranslationKey)}
            </ThemedText>
          )}
          <ThemedText style={styles.eventRowDate}>{formatDate(ev.occurredAtUtc, lang)}</ThemedText>
        </View>
        {showBonsaiName && bonsaiName && (
          <ThemedText style={styles.eventLabel}>
            {t(`eventType_${ev.type}` as TranslationKey)}
          </ThemedText>
        )}
        {wiringDuration && (
          <WiringPeriodDisplay
            weeks={wiringDuration.weeks}
            kind={wiringDuration.kind}
            isUnwired={wiringDuration.isUnwired}
            style={styles.eventRowNote}
            testID={`e2e_wiring_duration_${ev.id}`}
          />
        )}
        {scheduledUnwireLabel && (
          <ThemedText style={styles.eventRowNote} testID={`e2e_wiring_scheduled_${ev.id}`}>
            {scheduledUnwireLabel}
          </ThemedText>
        )}
        {ev.note && (
          <ThemedText style={styles.eventRowNote} numberOfLines={2}>
            {ev.note}
          </ThemedText>
        )}
        <HistoryChipRow chips={buildHistoryChips(ev)} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    marginBottom: 6,
  },
  eventRowIndent: { paddingLeft: 32 },
  eventIconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventContent: { flex: 1, minWidth: 0, gap: 2 },
  eventRowMain: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  eventLabel: { fontSize: 14, color: TEXT_PRIMARY, fontWeight: '500' },
  eventBonsaiName: { fontSize: 15, color: TEXT_PRIMARY, fontWeight: '500' },
  eventRowDate: { fontSize: 12, color: TEXT_SECONDARY },
  eventRowNote: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },
});
