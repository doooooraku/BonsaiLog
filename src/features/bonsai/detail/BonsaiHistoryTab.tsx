import React, { type Dispatch, type SetStateAction } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EventIcon } from '@/src/components/icons';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
// Sess66 PR6c.2: theme-dependent token を inline c.* に (dark cascade)。
import { BADGE_SOFT_BG, BADGE_SOFT_TEXT, BRAND_GREEN } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import type { Event, EventType } from '@/src/db/schema';
import { formatDate } from '@/src/features/bonsai/detail/dateFormat';
import type { HistoryFilter } from '@/src/features/bonsai/detail/useHistoryGroups';
import { EventRow } from '@/src/features/event/EventRow';
import type { EventGroupEntry } from '@/src/features/event/groupContinuousEvents';

/**
 * 盆栽詳細「作業履歴タブ」の描画 (R6 presentational)。
 * フィルタ chip + 連続日まとめ group(展開可) + 個別 EventRow 一覧。
 * mockup `bonsai-detail-history-01/02/03.png` 整合。
 *
 * Phase 4 A1-8 で `bonsai/[id]/index.tsx` から抽出 (挙動不変)。ロジックは useHistoryGroups。
 * 注: section / emptyPhotos は基本情報タブ写真ブロック(index.tsx)と共有のため WET 複製。
 */
export function BonsaiHistoryTab({
  events,
  lang,
  t,
  historyFilter,
  setHistoryFilter,
  presentEventTypes,
  historyGroups,
  expandedGroupIds,
  toggleGroupExpand,
  registerRow,
  highlightedEventId,
  onLongPressEvent,
  onKebabPressEvent,
}: {
  events: Event[];
  lang: string;
  t: (key: TranslationKey) => string;
  historyFilter: HistoryFilter;
  setHistoryFilter: Dispatch<SetStateAction<HistoryFilter>>;
  presentEventTypes: EventType[];
  historyGroups: EventGroupEntry[];
  expandedGroupIds: Set<string>;
  toggleGroupExpand: (key: string) => void;
  registerRow: (eventId: string, node: View | null) => void;
  highlightedEventId: string | null;
  onLongPressEvent: (ev: Event) => void;
  onKebabPressEvent: (ev: Event) => void;
}) {
  const c = useColors();
  return (
    <View style={styles.section}>
      {/* Sess42 バグ3: フィルタ chip = 'all' + この盆栽に記録のある event type のみ動的生成。
        横スクロール single row (chip が増えても横スライドで 1 行表示、折り返さない)。 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.historyFilterRow}
        style={styles.historyFilterScroll}
      >
        {(['all', ...presentEventTypes] as const).map((f) => {
          const on = historyFilter === f;
          const labelKey: TranslationKey =
            f === 'all' ? 'historyFilterAll' : (`eventType_${f}` as TranslationKey);
          return (
            <Pressable
              key={f}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={t(labelKey)}
              style={[
                styles.historyFilterChip,
                { backgroundColor: c.surface, borderColor: c.border },
                on && styles.historyFilterChipOn,
              ]}
              onPress={() => setHistoryFilter(f)}
              testID={`e2e_history_filter_${f}`}
            >
              <ThemedText
                style={[styles.historyFilterChipText, on && styles.historyFilterChipTextOn]}
              >
                {t(labelKey)}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {historyGroups.length === 0 && (
        <ThemedText style={styles.emptyPhotos}>{t('eventEmpty')}</ThemedText>
      )}

      {historyGroups.map((entry) => {
        // 連続日 group: 「水やり ×3  4月20日 ～ 4月22日  3回まとめて表示 個別に開く ▼」
        if (entry.kind === 'group') {
          const key = entry.events[0]!.id; // group always has ≥1 event by construction
          const expanded = expandedGroupIds.has(key);
          const startLabel = formatDate(`${entry.startDate}T00:00:00.000Z`, lang);
          const endLabel = formatDate(`${entry.endDate}T00:00:00.000Z`, lang);
          return (
            <View key={key}>
              <Pressable
                style={[styles.eventRow, { borderBottomColor: c.border }]}
                accessibilityRole="button"
                accessibilityLabel={t(`eventType_${entry.type}` as TranslationKey)}
                onPress={() => toggleGroupExpand(key)}
                testID={`e2e_history_group_toggle_${key}`}
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
                      <View style={styles.eventCountBadge}>
                        <ThemedText style={styles.eventCountBadgeText}>
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
                <View style={styles.historyExpandedContainer}>
                  {entry.events.map((ev, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === entry.events.length - 1;
                    return (
                      <View key={ev.id} style={styles.historyExpandedRow}>
                        <View style={styles.historyExpandedLeft}>
                          <View
                            style={[
                              styles.historyExpandedLine,
                              isFirst && styles.historyExpandedLineHidden,
                            ]}
                          />
                          <View
                            style={[styles.historyExpandedDot, { backgroundColor: c.surface }]}
                          />
                          <View
                            style={[
                              styles.historyExpandedLine,
                              isLast && styles.historyExpandedLineHidden,
                            ]}
                          />
                        </View>
                        <View
                          style={styles.historyExpandedRowContent}
                          ref={(node) => registerRow(ev.id, node)}
                          collapsable={false}
                        >
                          <EventRow
                            ev={ev}
                            eventsForBonsai={events}
                            lang={lang}
                            t={t}
                            onLongPress={onLongPressEvent}
                            onKebabPress={onKebabPressEvent}
                            kebabTestID={`e2e_bonsai_event_kebab_${ev.id}`}
                            displayMode="detailed"
                            highlighted={highlightedEventId === ev.id}
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
        return (
          <View
            key={entry.event.id}
            ref={(node) => registerRow(entry.event.id, node)}
            collapsable={false}
          >
            <EventRow
              ev={entry.event}
              eventsForBonsai={events}
              lang={lang}
              t={t}
              onLongPress={onLongPressEvent}
              onKebabPress={onKebabPressEvent}
              kebabTestID={`e2e_bonsai_event_kebab_${entry.event.id}`}
              displayMode="detailed"
              highlighted={highlightedEventId === entry.event.id}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // --- 基本情報タブ写真ブロック(index.tsx)と共有のため複製 (WET、Phase 5 統合候補) ---
  section: { gap: 8 },
  emptyPhotos: { opacity: 0.6, textAlign: 'center', paddingVertical: 12 },
  // --- 作業履歴タブ専用 (index.tsx から移動) ---
  // Issue #440 Phase 1 / Sess42 バグ3: 作業履歴フィルタ chip。
  historyFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
    paddingRight: 8,
  },
  historyFilterScroll: { flexGrow: 0, marginBottom: 4 },
  historyFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  historyFilterChipOn: { backgroundColor: BRAND_GREEN, borderColor: BRAND_GREEN },
  historyFilterChipText: { fontSize: 13 },
  historyFilterChipTextOn: { color: '#FFFFFF', fontWeight: '600' },
  // Issue #440 Phase 1: 連続日 group の `×N` バッジ + 「N 回まとめて表示 個別に開く ▼」
  eventLabelWithCount: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
  eventGroupToggle: { fontSize: 12, marginTop: 4 },
  // Sess28 PR-7 (ADR-0037 P0-2): 連続日 group 展開時の timeline 風表示 (縦線 + ○ marker)。
  historyExpandedContainer: { marginLeft: 16, marginTop: 4, marginBottom: 4 },
  historyExpandedRow: { flexDirection: 'row', alignItems: 'stretch' },
  historyExpandedLeft: { width: 24, alignItems: 'center' },
  historyExpandedLine: {
    flex: 1,
    width: 2,
    backgroundColor: BRAND_GREEN,
  },
  historyExpandedLineHidden: { backgroundColor: 'transparent' },
  historyExpandedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: BRAND_GREEN,
    marginVertical: 2,
  },
  historyExpandedRowContent: { flex: 1, paddingLeft: 8 },
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
  // bodyL 16/24 + Medium (Claude Design fontSize 16, weight 500)
  eventLabel: {
    fontFamily: 'NotoSansJP_600SemiBold',
    fontSize: 16,
    lineHeight: 24,
  },
  // mono 風 12pt + letterSpacing (Inter で代替)
  eventRowDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    letterSpacing: 0.7,
  },
});
