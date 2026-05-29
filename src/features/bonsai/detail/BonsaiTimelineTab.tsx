import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getTzOffsetMin, nowUtc } from '@/src/core/datetime';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import {
  BADGE_SOFT_BG,
  BADGE_SOFT_TEXT,
  BRAND_GREEN,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import type { Event } from '@/src/db/schema';
import { formatDate } from '@/src/features/bonsai/detail/dateFormat';
import {
  groupContinuousEventsAsc,
  type EventGroupEntry,
} from '@/src/features/event/groupContinuousEvents';

/**
 * Issue #441: 盆栽詳細「作業予定」タブ (timeline 縦線 + 連続日 mark + 「今日」起点 + 詳細メモ)。
 * mockup `bonsai-detail-timeline-01/02.png` 整合。
 *
 * Phase 4 A1-3: `bonsai/[id]/index.tsx` から抽出 (props / 挙動 不変)。
 * 注: section / emptyPhotos / eventLabelWithCount / eventLabel / eventCountBadge /
 *     eventCountBadgeText は履歴タブ(index.tsx)と共有のため WET 原則で複製
 *     (Phase 5 で 3+ 箇所なら共通 atom に統合)。
 */
export function BonsaiTimelineTab({
  events,
  lang,
  t,
}: {
  events: Event[];
  lang: string;
  t: (key: TranslationKey) => string;
}) {
  return (
    <View style={styles.section}>
      {/* Issue #441 Phase 2: 「これからの予定」 + 右側 secondary label
      「過去水やりは折りたたみ」 (mockup `bonsai-detail-timeline-01/02.png` 整合)。
      過去水やりは作業履歴タブ + ふりかえりタブ CrossWateringHistory で参照可能。 */}
      <View style={styles.timelineHeader}>
        <ThemedText type="subtitle">{t('detailTimelineSectionTitle')}</ThemedText>
        <ThemedText style={styles.timelineHeaderSecondary}>
          {t('detailTimelinePastCollapsed')}
        </ThemedText>
      </View>
      {(() => {
        const plannedEvents = events
          .filter((e) => e.status === 'planned')
          .sort((a, b) => a.occurredAtUtc.localeCompare(b.occurredAtUtc));
        // Sess12 PR-J: 「今日」 緑大円 row を先頭に追加 (mockup bonsai-detail-timeline-01/02 整合)
        // events 0 件でも「今日」 ヘッダー表示で「これからの予定の起点」 を明示
        const todayLabel = t('detailTimelineToday');
        const todayDate = formatDate(nowUtc() as string, lang);
        const todayRow = (
          <View key="__today__" style={styles.timelineRow} testID="e2e_timeline_today">
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineLine, styles.timelineLineHidden]} />
              <View style={[styles.timelineDot, styles.timelineDotToday]} />
              <View
                style={[
                  styles.timelineLine,
                  plannedEvents.length === 0 && styles.timelineLineHidden,
                ]}
              />
            </View>
            <View style={styles.timelineContent}>
              <ThemedText style={styles.timelineTodayLabel}>{todayLabel}</ThemedText>
              <ThemedText style={styles.timelineTodayDate}>{todayDate}</ThemedText>
            </View>
          </View>
        );
        if (plannedEvents.length === 0) {
          return (
            <>
              {todayRow}
              <ThemedText style={styles.emptyPhotos} testID="e2e_timeline_empty">
                {t('detailTimelineEmpty')}
              </ThemedText>
            </>
          );
        }
        const groups = groupContinuousEventsAsc(plannedEvents, getTzOffsetMin());
        return (
          <>
            {todayRow}
            {groups.map((entry, idx) => (
              <TimelineRow
                key={entry.kind === 'group' ? entry.events[0]!.id : entry.event.id} // group always has ≥1 event by construction
                entry={entry}
                isFirst={false}
                isLast={idx === groups.length - 1}
                lang={lang}
                t={t}
              />
            ))}
          </>
        );
      })()}
    </View>
  );
}

/**
 * Issue #441 Phase 1: 予定タブの timeline 行 (縦線 + 緑円マーカー + 連続日 mark + 詳細メモ)。
 * mockup `bonsai-detail-timeline-01/02.png` 整合。
 * - 左側: 上半線 / 緑円マーカー / 下半線 (firstRow は上線、lastRow は下線を非表示)
 * - 右側: 日付 (range or 単発) + N 日連続 (group のみ) + 作業名 + ×N badge (group のみ) + note
 */
function TimelineRow({
  entry,
  isFirst,
  isLast,
  lang,
  t,
}: {
  entry: EventGroupEntry;
  isFirst: boolean;
  isLast: boolean;
  lang: string;
  t: (key: TranslationKey) => string;
}) {
  if (entry.kind === 'group') {
    const startLabel = formatDate(`${entry.startDate}T00:00:00.000Z`, lang);
    const endLabel = formatDate(`${entry.endDate}T00:00:00.000Z`, lang);
    const note = entry.events.find((ev) => ev.note)?.note ?? null;
    return (
      <View style={styles.timelineRow} testID={`e2e_timeline_event_${entry.events[0]!.id}`}>
        {' '}
        {/* group always has ≥1 event by construction */}
        <View style={styles.timelineLeft}>
          <View style={[styles.timelineLine, isFirst && styles.timelineLineHidden]} />
          <View style={styles.timelineDot} />
          <View style={[styles.timelineLine, isLast && styles.timelineLineHidden]} />
        </View>
        <View style={styles.timelineContent}>
          <View style={styles.timelineRowMain}>
            <ThemedText style={styles.timelineDateRange}>
              {startLabel} ～ {endLabel}
            </ThemedText>
            <ThemedText style={styles.timelineConsecutive}>
              {t('timelineConsecutive').replace('{count}', String(entry.events.length))}
            </ThemedText>
          </View>
          <View style={styles.eventLabelWithCount}>
            <ThemedText style={styles.eventLabel}>
              {t(`eventType_${entry.type}` as TranslationKey)}
            </ThemedText>
            <View style={styles.eventCountBadge}>
              <ThemedText style={styles.eventCountBadgeText}>×{entry.events.length}</ThemedText>
            </View>
          </View>
          {note && (
            <ThemedText style={styles.eventRowNote} numberOfLines={2}>
              {note}
            </ThemedText>
          )}
        </View>
      </View>
    );
  }
  const ev = entry.event;
  return (
    <View style={styles.timelineRow} testID={`e2e_timeline_event_${ev.id}`}>
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineLine, isFirst && styles.timelineLineHidden]} />
        <View style={styles.timelineDot} />
        <View style={[styles.timelineLine, isLast && styles.timelineLineHidden]} />
      </View>
      <View style={styles.timelineContent}>
        <ThemedText style={styles.timelineDateRange}>
          {formatDate(ev.occurredAtUtc, lang)}
        </ThemedText>
        <ThemedText style={styles.eventLabel}>
          {t(`eventType_${ev.type}` as TranslationKey)}
        </ThemedText>
        {ev.note && (
          <ThemedText style={styles.eventRowNote} numberOfLines={2}>
            {ev.note}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // --- 履歴タブと共有のため複製 (WET、Phase 5 で統合候補) ---
  section: { gap: 8 },
  emptyPhotos: { opacity: 0.6, textAlign: 'center', paddingVertical: 12 },
  eventLabelWithCount: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // bodyL 16/24 + Medium (Claude Design fontSize 16, weight 500)
  eventLabel: {
    fontFamily: 'NotoSansJP_600SemiBold',
    fontSize: 16,
    lineHeight: 24,
  },
  // Sess28 PR-5 (ADR-0037 D3): BADGE_SOFT token 参照 (薄緑 + 濃緑文字、 design_system §20 整合)。
  eventCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: BADGE_SOFT_BG,
  },
  eventCountBadgeText: {
    color: BADGE_SOFT_TEXT,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  // --- 作業予定タブ専用 (index.tsx から移動) ---
  // Issue #441 Phase 1: 予定タブ timeline UI (mockup `bonsai-detail-timeline-01/02.png` 整合)
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timelineHeaderSecondary: { fontSize: 11, color: TEXT_SECONDARY },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 80,
  },
  timelineLeft: {
    width: 32,
    alignItems: 'center',
    paddingTop: 0,
  },
  // 縦線 (上半 + 下半)。flex:1 で row の縦方向に伸ばす。
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: BRAND_GREEN,
  },
  timelineLineHidden: { backgroundColor: 'transparent' },
  // 緑円マーカー (mockup 整合)
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: BRAND_GREEN,
    backgroundColor: '#FFFFFF',
    marginVertical: 2,
  },
  // Sess12 PR-J: 「今日」 大円マーカー (mockup bonsai-detail-timeline-01/02 整合)
  timelineDotToday: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BRAND_GREEN,
  },
  // 「今日」 ラベル + 日付 (mockup line 1 「今日 / 4月25日」 整合)
  timelineTodayLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND_GREEN,
  },
  timelineTodayDate: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingVertical: 8,
    gap: 4,
  },
  timelineRowMain: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timelineDateRange: { fontSize: 13, color: TEXT_SECONDARY, fontVariant: ['tabular-nums'] },
  // Sess28 PR-5 (ADR-0037 D3): ad-hoc HEX '#E8F0EA' を BADGE_SOFT token 参照に統一。
  timelineConsecutive: {
    fontSize: 11,
    color: BADGE_SOFT_TEXT,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: BADGE_SOFT_BG,
  },
  eventRowNote: { fontSize: 13, lineHeight: 20, color: TEXT_SECONDARY, marginTop: 4 },
});
