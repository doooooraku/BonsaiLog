import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EventIcon } from '@/src/components/icons';
import { getTzOffsetMin } from '@/src/core/datetime';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import { useColors } from '@/src/core/theme/useColors';
import type { Event } from '@/src/db/schema';
import { formatDate } from '@/src/features/bonsai/detail/dateFormat';
import { EventRow } from '@/src/features/event/EventRow';
import {
  groupContinuousEventsAsc,
  type EventGroupEntry,
} from '@/src/features/event/groupContinuousEvents';

/**
 * Issue #441 → Sess99 #1120 (ADR-0020 Sess99 Amendment): 盆栽詳細「作業予定」タブ。
 *
 * Sess93 PR-7 deferred の実装 — 独自 timeline UI (縦線 + 緑円 + 「今日」起点) を廃止し、
 * 作業履歴タブ (BonsaiHistoryTab) と同型の EventRow detailed Card 表示に統一
 * (= Sess93 user 要望「作業記録と同じような Card」、 カレンダー #1062 と整合)。
 * - 連続日 group: 履歴タブと同じ group header (icon + ×N badge + 日付範囲 + 個別に開く ▼)
 * - 単発: EventRow displayMode="detailed" (作業名 + 日付 + memo 3 行 + もっと見る)
 * - status='planned' は EventRowDetailed 側で写真 strip 自動非表示 (#1062)
 * - 操作 (kebab / 削除) は本タブでは従来どおり非配置 (表示統一のみ、 挙動不変)
 *
 * Phase 4 A1-3: `bonsai/[id]/index.tsx` から抽出 (props 不変)。
 * 注: section / emptyPhotos / eventRow 系 styles は履歴タブと共有のため WET 原則で複製
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
  const c = useColors();
  // Sess99 #1120: 連続日 group の展開 state (履歴タブの expandedGroupIds と同 pattern、
  // 本タブは親 hook 不要のため local state)。
  const [expandedGroupIds, setExpandedGroupIds] = React.useState<Set<string>>(() => new Set());
  const toggleGroupExpand = React.useCallback((key: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const plannedEvents = events
    .filter((e) => e.status === 'planned')
    .sort((a, b) => a.occurredAtUtc.localeCompare(b.occurredAtUtc));
  const groups = groupContinuousEventsAsc(plannedEvents, getTzOffsetMin());

  return (
    <View style={styles.section}>
      {/* Issue #441 Phase 2: 「これからの予定」 + 右側 secondary label
      「過去水やりは折りたたみ」 (過去水やりは作業履歴タブ + ふりかえりタブ CrossWateringHistory で参照可能)。 */}
      <View style={styles.timelineHeader}>
        <ThemedText type="subtitle">{t('detailTimelineSectionTitle')}</ThemedText>
        <ThemedText style={[styles.timelineHeaderSecondary, { color: c.textSecondary }]}>
          {t('detailTimelinePastCollapsed')}
        </ThemedText>
      </View>

      {plannedEvents.length === 0 && (
        <ThemedText style={styles.emptyPhotos} testID="e2e_timeline_empty">
          {t('detailTimelineEmpty')}
        </ThemedText>
      )}

      {groups.map((entry) => (
        <TimelineGroupEntry
          key={entry.kind === 'group' ? entry.events[0]!.id : entry.event.id} // group always has ≥1 event by construction
          entry={entry}
          events={events}
          expanded={entry.kind === 'group' && expandedGroupIds.has(entry.events[0]!.id)}
          onToggle={toggleGroupExpand}
          lang={lang}
          t={t}
        />
      ))}
    </View>
  );
}

/**
 * Sess99 #1120: 連続日 group header + 展開 (履歴タブ BonsaiHistoryTab の group 表示と同型) /
 * 単発は EventRow detailed Card。
 */
function TimelineGroupEntry({
  entry,
  events,
  expanded,
  onToggle,
  lang,
  t,
}: {
  entry: EventGroupEntry;
  events: Event[];
  expanded: boolean;
  onToggle: (key: string) => void;
  lang: string;
  t: (key: TranslationKey) => string;
}) {
  const c = useColors();
  if (entry.kind === 'group') {
    const key = entry.events[0]!.id; // group always has ≥1 event by construction
    const startLabel = formatDate(`${entry.startDate}T00:00:00.000Z`, lang);
    const endLabel = formatDate(`${entry.endDate}T00:00:00.000Z`, lang);
    return (
      <View testID={`e2e_timeline_event_${key}`}>
        <Pressable
          style={[styles.eventRow, { borderBottomColor: c.border }]}
          accessibilityRole="button"
          accessibilityLabel={t(`eventType_${entry.type}` as TranslationKey)}
          onPress={() => onToggle(key)}
          testID={`e2e_timeline_group_toggle_${key}`}
        >
          <View style={[styles.eventIconBox, { borderColor: c.border }]}>
            <EventIcon type={entry.type} size={20} />
          </View>
          <View style={styles.eventContent}>
            <View style={styles.eventRowMain}>
              <View style={styles.eventLabelWithCount}>
                <ThemedText style={styles.eventLabel}>
                  {t(`eventType_${entry.type}` as TranslationKey)}
                </ThemedText>
                <View style={[styles.eventCountBadge, { backgroundColor: c.badgeBg }]}>
                  <ThemedText style={[styles.eventCountBadgeText, { color: c.tint }]}>
                    ×{entry.events.length}
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={[styles.eventRowDate, { color: c.textSecondary }]}>
                {startLabel} ～ {endLabel}
              </ThemedText>
            </View>
            <ThemedText style={[styles.eventGroupToggle, { color: c.textSecondary }]}>
              {t('historyGroupToggle')
                .replace('{count}', String(entry.events.length))
                .replace('{caret}', expanded ? '▲' : '▼')}
            </ThemedText>
          </View>
        </Pressable>
        {expanded && (
          <View style={styles.expandedContainer}>
            {entry.events.map((ev, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === entry.events.length - 1;
              return (
                <View key={ev.id} style={styles.expandedRow}>
                  <View style={styles.expandedLeft}>
                    <View
                      style={[
                        styles.expandedLine,
                        { backgroundColor: c.tint },
                        isFirst && styles.expandedLineHidden,
                      ]}
                    />
                    <View
                      style={[
                        styles.expandedDot,
                        { backgroundColor: c.surface, borderColor: c.tint },
                      ]}
                    />
                    <View
                      style={[
                        styles.expandedLine,
                        { backgroundColor: c.tint },
                        isLast && styles.expandedLineHidden,
                      ]}
                    />
                  </View>
                  <View style={styles.expandedRowContent}>
                    <EventRow
                      ev={ev}
                      eventsForBonsai={events}
                      lang={lang}
                      t={t}
                      displayMode="detailed"
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  }
  const ev = entry.event;
  return (
    <View testID={`e2e_timeline_event_${ev.id}`}>
      <EventRow ev={ev} eventsForBonsai={events} lang={lang} t={t} displayMode="detailed" />
    </View>
  );
}

const styles = StyleSheet.create({
  // --- 履歴タブ (BonsaiHistoryTab) と共有のため複製 (WET、Phase 5 で統合候補) ---
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
  },
  eventCountBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  eventGroupToggle: { fontSize: 12, marginTop: 4 },
  // Claude Design HistoryTab 整合: 16 padding + 14 gap + minHeight 80、icon 40 box
  eventRow: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    minHeight: 80,
    borderBottomWidth: 1,
  },
  eventIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  eventContent: { flex: 1, minWidth: 0 },
  eventRowMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  // mono 風 12pt + letterSpacing (Inter で代替)
  eventRowDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    letterSpacing: 0.7,
  },
  // 連続日 group 展開時の timeline 風表示 (縦線 + ○ marker、 履歴タブ Sess28 PR-7 と同型)
  expandedContainer: { marginLeft: 16, marginTop: 4, marginBottom: 4 },
  expandedRow: { flexDirection: 'row', alignItems: 'stretch' },
  expandedLeft: { width: 24, alignItems: 'center' },
  expandedLine: {
    flex: 1,
    width: 2,
  },
  expandedLineHidden: { backgroundColor: 'transparent' },
  expandedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    marginVertical: 2,
  },
  expandedRowContent: { flex: 1, paddingLeft: 8 },
  // --- 作業予定タブ専用 ---
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timelineHeaderSecondary: { fontSize: 11 },
});
