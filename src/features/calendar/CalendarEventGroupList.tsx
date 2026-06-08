/**
 * 選択日の event 一覧 (予定 / 記録 セクション) 表示 (Phase 4 B1 で CalendarTabScreen god から抽出)。
 *
 * - リストラベル (今日 / 日付 + 件数)
 * - 予定セクション: 種別グループ (2 段組みカード: アイコン+種別+件数+kebab / 全N件記録+開く) + 展開時 EventRow (compact)
 * - 記録セクション: 種別グループ (2 段組み: アイコン+種別+件数+kebab / 開く) + 展開時 EventRow (detailed)
 *
 * 振る舞いは CalendarTabScreen の元実装と完全同一 (純粋な抽出)。ADR-0035 D7 / ADR-0038 D3 維持。
 */
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DropletIcon, EventIcon, MoreVerticalIcon } from '@/src/components/icons';
import type { TranslationKey } from '@/src/core/i18n/i18n';
// Sess68 PR #C: BG_SURFACE / BORDER_DEFAULT / TEXT_MUTED / TEXT_PRIMARY / TEXT_SECONDARY は inline c.* 化。
// Sess70 PR-C1: BADGE_SOFT_BG/TEXT / BUTTON_SECONDARY_BG/TEXT / BRAND_GREEN も scheme-aware
// (c.badgeBg / c.tint / c.buttonSecondaryBg) に移行 (ADR-0015/0052 Sess69 PR-A Amendment 整合)。
import { useColors } from '@/src/core/theme/useColors';
import { type Bonsai, type Event, type EventType } from '@/src/db/schema';
import { EventRow } from '@/src/features/event/EventRow';
import { toLocalDateKey } from '@/src/features/watering/dateUtils';

type GroupedEvents = readonly (readonly [EventType, readonly Event[]])[];

type CalendarEventGroupListProps = {
  testIdPrefix: string;
  bonsaiDetailTab: 'timeline' | 'history';
  selectedDateKey: string;
  todayLocalKey: string;
  tzOffsetMin: number;
  selectedDayEvents: readonly Event[];
  plannedGroupedEvents: GroupedEvents;
  loggedGroupedEvents: GroupedEvents;
  expandedTypes: Set<EventType>;
  toggleExpand: (type: EventType) => void;
  bonsaiMap: Map<string, Bonsai>;
  lang: string;
  t: (key: TranslationKey) => string;
  formatGroupCount: (groupEvents: readonly Event[]) => string;
  formatGroupAccessibility: (
    groupLabel: string,
    groupEvents: readonly Event[],
    toggleText: string,
  ) => string;
  confirmDeleteEvent: (ev: Event) => void;
  confirmDeleteGroup: (
    status: 'planned' | 'logged',
    type: EventType,
    groupEvents: readonly Event[],
  ) => void;
  handleKebabPress: (
    status: 'planned' | 'logged',
    type: EventType,
    groupEvents: readonly Event[],
  ) => void;
  handleBulkConvert: (type: EventType, groupEvents: readonly Event[]) => void;
  handleSingleConvert: (ev: Event) => void;
};

export function CalendarEventGroupList({
  testIdPrefix,
  bonsaiDetailTab,
  selectedDateKey,
  todayLocalKey,
  tzOffsetMin,
  selectedDayEvents,
  plannedGroupedEvents,
  loggedGroupedEvents,
  expandedTypes,
  toggleExpand,
  bonsaiMap,
  lang,
  t,
  formatGroupCount,
  formatGroupAccessibility,
  confirmDeleteEvent,
  confirmDeleteGroup,
  handleKebabPress,
  handleBulkConvert,
  handleSingleConvert,
}: CalendarEventGroupListProps) {
  const router = useRouter();
  const c = useColors();

  return (
    <View style={styles.listSection}>
      <ThemedText style={[styles.listLabel, { color: c.textMuted }]}>
        {selectedDateKey === todayLocalKey
          ? t('planSelectedListTodayLabel').replace('{count}', String(selectedDayEvents.length))
          : t('planSelectedListLabel')
              .replace('{date}', selectedDateKey)
              .replace('{count}', String(selectedDayEvents.length))}
      </ThemedText>
      {selectedDayEvents.length === 0 ? (
        <ThemedText style={[styles.emptyText, { color: c.textSecondary }]}>
          {t('planSelectedEmpty')}
        </ThemedText>
      ) : (
        <>
          {plannedGroupedEvents.length > 0 && (
            <>
              <ThemedText
                style={[styles.sectionHeader, { color: c.textSecondary }]}
                testID={`e2e_${testIdPrefix}_section_upcoming`}
              >
                {t('planSectionScheduled')} (
                {plannedGroupedEvents.reduce((sum, [, evs]) => sum + evs.length, 0)} 件)
              </ThemedText>
              {plannedGroupedEvents.map(([type, events]) => {
                const isExpanded = expandedTypes.has(type);
                const groupLabel = t(`eventType_${type}` as TranslationKey);
                const toggleText = isExpanded ? t('planGroupCollapse') : t('planGroupExpand');
                const hasOverdue = events.some(
                  (e) => toLocalDateKey(e.occurredAtUtc, tzOffsetMin) < todayLocalKey,
                );
                return (
                  <View key={`planned-${type}`}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={formatGroupAccessibility(groupLabel, events, toggleText)}
                      accessibilityState={{ expanded: isExpanded }}
                      style={[
                        styles.groupRow,
                        // Sess73 PR-2: borderStrong で dark mode 可読性改善 (c.border=#2C2820 vs
                        // c.surface=#211E18 ≈ 1.4:1 NG → c.borderStrong=#4A4534 ≈ 3.18:1 AA pass)。
                        // light も BORDER_STRONG=#8A8274 vs BG_PRIMARY=#FAF8F1 ≈ 3.05:1 で改善。
                        { backgroundColor: c.surface, borderColor: c.borderStrong },
                        hasOverdue && styles.groupRowOverdue,
                      ]}
                      onPress={() => toggleExpand(type)}
                      onLongPress={() => confirmDeleteGroup('planned', type, events)}
                      testID={`e2e_${testIdPrefix}_group_planned_${type}`}
                    >
                      {/* Sess42 バグ4 (案C+B): 2 段組み。1 段目 = アイコン + 種類名 (長言語は…省略) +
                          件数バッジ + kebab。2 段目 = 「全 N 件を記録」 button (タップ領域拡大) + 開くトグル。
                          groupLeftCluster (flex:1 + minWidth:0) で label を読める幅に保ちつつ長言語は省略。 */}
                      <View style={styles.groupLine}>
                        <View
                          style={[
                            styles.groupIconBox,
                            { backgroundColor: c.surface, borderColor: c.border },
                          ]}
                        >
                          {type === 'watering' ? (
                            <DropletIcon size={18} />
                          ) : (
                            <EventIcon type={type} size={18} />
                          )}
                        </View>
                        <View style={styles.groupLeftCluster}>
                          <ThemedText
                            style={[
                              styles.groupLabel,
                              { color: hasOverdue ? c.textMuted : c.text },
                            ]}
                            numberOfLines={1}
                          >
                            {groupLabel}
                          </ThemedText>
                          <View style={[styles.groupCountBadge, { backgroundColor: c.badgeBg }]}>
                            <ThemedText style={[styles.groupCountBadgeText, { color: c.tint }]}>
                              {formatGroupCount(events)}
                            </ThemedText>
                          </View>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t('rowActionMenuDelete')}
                          style={styles.kebabButton}
                          hitSlop={8}
                          onPress={() => handleKebabPress('planned', type, events)}
                          testID={`e2e_${testIdPrefix}_group_kebab_planned_${type}`}
                        >
                          <MoreVerticalIcon size={20} color={c.textSecondary} />
                        </Pressable>
                      </View>
                      <View style={styles.groupLine2}>
                        {/* Sess29 ADR-0038 D3: group header「全 N 件を記録」 button (kebab 併存、 案 B-2) */}
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t('rowActionMenuRecordAll').replace(
                            '{count}',
                            String(events.length),
                          )}
                          style={[
                            styles.groupRecordButton,
                            { backgroundColor: c.buttonSecondaryBg },
                          ]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleBulkConvert(type, events);
                          }}
                          testID={`e2e_${testIdPrefix}_group_record_button_${type}`}
                        >
                          <ThemedText style={[styles.groupRecordButtonText, { color: c.tint }]}>
                            {t('rowActionMenuRecordAll').replace('{count}', String(events.length))}
                          </ThemedText>
                        </Pressable>
                        <ThemedText
                          style={[
                            styles.groupToggleText,
                            { color: c.textSecondary },
                            styles.groupTogglePush,
                          ]}
                          numberOfLines={1}
                        >
                          {toggleText} {isExpanded ? '▲' : '▼'}
                        </ThemedText>
                      </View>
                    </Pressable>
                    {isExpanded && (
                      <View style={[styles.expandedContainer, { borderLeftColor: c.tint }]}>
                        {events.map((e) => {
                          const b = bonsaiMap.get(e.bonsaiId);
                          const isOverdue =
                            toLocalDateKey(e.occurredAtUtc, tzOffsetMin) < todayLocalKey;
                          return (
                            <View
                              key={e.id}
                              style={isOverdue && styles.eventCardOverdue}
                              testID={`e2e_${testIdPrefix}_event_${e.id}`}
                            >
                              <EventRow
                                ev={e}
                                eventsForBonsai={events.filter((x) => x.bonsaiId === e.bonsaiId)}
                                bonsaiName={b?.name}
                                lang={lang}
                                t={t}
                                onPress={(ev) =>
                                  router.push(
                                    `/(tabs)/bonsai/${ev.bonsaiId}?tab=${bonsaiDetailTab}` as Href,
                                  )
                                }
                                onLongPress={confirmDeleteEvent}
                                onKebabPress={(ev) =>
                                  handleKebabPress('planned', ev.type as EventType, [ev])
                                }
                                kebabTestID={`e2e_${testIdPrefix}_event_kebab_${e.id}`}
                                actionButtonLabel={t('planEventRecordButtonSingle')}
                                onActionPress={handleSingleConvert}
                                actionButtonTestID={`e2e_${testIdPrefix}_event_record_button_${e.id}`}
                                showBonsaiName
                                indent
                              />
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}
          {loggedGroupedEvents.length > 0 && (
            <>
              <ThemedText
                style={[styles.sectionHeader, { color: c.textSecondary }]}
                testID={`e2e_${testIdPrefix}_section_done`}
              >
                {t('planSectionRecorded')} (
                {loggedGroupedEvents.reduce((sum, [, evs]) => sum + evs.length, 0)} 件)
              </ThemedText>
              {loggedGroupedEvents.map(([type, events]) => {
                const isExpanded = expandedTypes.has(type);
                const groupLabel = t(`eventType_${type}` as TranslationKey);
                const toggleText = isExpanded ? t('planGroupCollapse') : t('planGroupExpand');
                return (
                  <View key={`logged-${type}`}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={formatGroupAccessibility(groupLabel, events, toggleText)}
                      accessibilityState={{ expanded: isExpanded }}
                      style={[
                        styles.groupRow,
                        // Sess73 PR-2: planned card と同じ borderStrong 強化 (dark mode 可読性)。
                        { backgroundColor: c.surface, borderColor: c.borderStrong },
                      ]}
                      onPress={() => toggleExpand(type)}
                      onLongPress={() => confirmDeleteGroup('logged', type, events)}
                      testID={`e2e_${testIdPrefix}_group_logged_${type}`}
                    >
                      {/* Sess42 バグ4 (案C+B): 記録カードも 2 段組み (予定カードと統一)。
                          1 段目 = アイコン + 種類名 (長言語は…省略) + 件数 + kebab、
                          2 段目 = 開くトグル (record ボタンなし、右寄せ)。 */}
                      <View style={styles.groupLine}>
                        <View
                          style={[
                            styles.groupIconBox,
                            { backgroundColor: c.surface, borderColor: c.border },
                          ]}
                        >
                          {type === 'watering' ? (
                            <DropletIcon size={18} />
                          ) : (
                            <EventIcon type={type} size={18} />
                          )}
                        </View>
                        <View style={styles.groupLeftCluster}>
                          <ThemedText
                            style={[styles.groupLabel, { color: c.text }]}
                            numberOfLines={1}
                          >
                            {groupLabel}
                          </ThemedText>
                          <View style={[styles.groupCountBadge, { backgroundColor: c.badgeBg }]}>
                            <ThemedText style={[styles.groupCountBadgeText, { color: c.tint }]}>
                              {formatGroupCount(events)}
                            </ThemedText>
                          </View>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t('rowActionMenuDelete')}
                          style={styles.kebabButton}
                          hitSlop={8}
                          onPress={() => handleKebabPress('logged', type, events)}
                          testID={`e2e_${testIdPrefix}_group_kebab_logged_${type}`}
                        >
                          <MoreVerticalIcon size={20} color={c.textSecondary} />
                        </Pressable>
                      </View>
                      <View style={styles.groupLine2}>
                        <ThemedText
                          style={[
                            styles.groupToggleText,
                            { color: c.textSecondary },
                            styles.groupTogglePush,
                          ]}
                          numberOfLines={1}
                        >
                          {toggleText} {isExpanded ? '▲' : '▼'}
                        </ThemedText>
                      </View>
                    </Pressable>
                    {isExpanded && (
                      <View style={[styles.expandedContainer, { borderLeftColor: c.tint }]}>
                        {events.map((e) => {
                          const b = bonsaiMap.get(e.bonsaiId);
                          return (
                            <View key={e.id} testID={`e2e_${testIdPrefix}_event_${e.id}`}>
                              <EventRow
                                ev={e}
                                eventsForBonsai={events.filter((x) => x.bonsaiId === e.bonsaiId)}
                                bonsaiName={b?.name}
                                lang={lang}
                                t={t}
                                onPress={(ev) =>
                                  // Sess77 Follow-up (議題 C-3 拡張): focusEventId 付与で 履歴 tab で 該当 event 位置まで scroll
                                  // (検索パターン転用、 useScrollToEvent + setActiveTab('history') で 起動済 logic 流用)。
                                  router.push(
                                    `/(tabs)/bonsai/${ev.bonsaiId}?tab=history&focusEventId=${ev.id}` as Href,
                                  )
                                }
                                onLongPress={confirmDeleteEvent}
                                onKebabPress={(ev) =>
                                  handleKebabPress('logged', ev.type as EventType, [ev])
                                }
                                kebabTestID={`e2e_${testIdPrefix}_event_kebab_${e.id}`}
                                showBonsaiName
                                indent
                                displayMode="detailed"
                              />
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  listSection: { padding: 16, gap: 8 },
  listLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  sectionHeader: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  // Sess42 バグ4 (案C+B): 2 段組みカード。縦に line1 (種類名行) / line2 (操作行) を積む。
  groupRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  // Sess73 PR-2: opacity 0.6 → 0.75。 過去日 card が dark mode で textMuted + opacity 0.6
  // で完全に沈んでいた問題を緩和、 視認性確保しつつ「過ぎた」 視覚記号は維持。
  groupRowOverdue: { opacity: 0.75 },
  // 1 段目: アイコン + 種類名クラスタ + kebab (横並び)。
  groupLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // 種類名 + 件数バッジを flex:1 + minWidth:0 の塊にし、長言語名は label 側で… 省略 (案B)。
  groupLeftCluster: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  // 2 段目: 操作ボタン行 (予定=記録button+toggle / 記録=toggleのみ)。
  groupLine2: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupIconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // flexShrink: 1 で画面が狭い時はラベルが縮んで省略 (…) され、右側の操作が枠外に押し出されない。
  groupLabel: { fontSize: 15, fontWeight: '500', flexShrink: 1 },
  // Sess70 PR-C1: bg / color は inline c.badgeBg / c.tint (scheme-aware)。
  groupCountBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupCountBadgeText: { fontSize: 12, fontWeight: '600' },
  // Sess42 バグ4: 右寄せは marginLeft:'auto' で行う (flex:1 spacer と groupLabel の flexShrink 競合回避)。
  groupToggleText: { fontSize: 12, flexShrink: 0 },
  groupTogglePush: { marginLeft: 'auto' },
  // Sess29 ADR-0038 D3 / R-48: Secondary CTA、 design_system §22。タップ領域 minHeight 44 (WCAG 2.5.5)。
  // Sess70 PR-C1: bg / color は inline c.buttonSecondaryBg / c.tint (scheme-aware)。
  groupRecordButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupRecordButtonText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  kebabButton: { padding: 6, marginLeft: 4, alignItems: 'center', justifyContent: 'center' },
  eventCardOverdue: { opacity: 0.6 },
  // Sess70 PR-C1: borderLeftColor は inline c.tint (scheme-aware)。
  expandedContainer: {
    marginTop: 8,
    marginLeft: 16,
    borderLeftWidth: 2,
    paddingLeft: 12,
    gap: 6,
  },
});
