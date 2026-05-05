/**
 * 針金がけ一覧画面 (ADR-0020 v1.x-4、Claude Design `care-screens.jsx WiringListScreen` 整合)。
 *
 * - 全盆栽の wiring event (status='logged' / deletedAt=null) を装着期間 (週) 順で表示
 * - タブ: すべて / 未外し (装着中 = unwiring event 無し) / 1 週間以内に外し予定
 * - 各行: 盆栽名 + scheduled_unwire_at 日付 + 装着期間 X 週 + 警告色 (overdue は赤)
 *
 * 既存の wiring 純関数 (wiringDuration.ts) を再利用。
 *
 * 上位画面: `app/(tabs)/plan/index.tsx` の Header から「針金がけ一覧」リンクで遷移。
 */
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WireIcon } from '@/src/components/icons';
import { nowUtc } from '@/src/core/datetime';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  ACCENT_BARK,
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  DANGER,
  ON_BRAND,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { getAllActiveBonsai } from '@/src/db/bonsaiRepository';
import { getAllActivePlannedAndLoggedEvents } from '@/src/db/eventRepository';
import type { Bonsai, Event } from '@/src/db/schema';
import {
  classifyWiringDuration,
  getDaysSinceWired,
  getScheduledUnwireAt,
  getWeeksSinceWired,
} from '@/src/features/wiring/wiringDuration';

type Filter = 'all' | 'active' | 'unwireSoon';

type WiringRow = {
  event: Event;
  bonsai: Bonsai | undefined;
  weeks: number;
  scheduledUnwireAt: string | null;
  /** unwire 予定までの残日数 (null = 未指定 or 過ぎた)。 */
  daysUntilUnwire: number | null;
  /** しきい値超過 (overdue) 判定。 */
  overdue: boolean;
};

export default function WiringListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const [events, setEvents] = useState<Event[]>([]);
  const [bonsai, setBonsai] = useState<Bonsai[]>([]);
  const [filter, setFilter] = useState<Filter>('all');

  const reload = useCallback(async () => {
    const [evs, bs] = await Promise.all([
      getAllActivePlannedAndLoggedEvents(),
      getAllActiveBonsai(),
    ]);
    setEvents(evs);
    setBonsai(bs);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const today = useMemo(() => new Date(nowUtc() as string), []);
  const bonsaiMap = useMemo(() => new Map(bonsai.map((b) => [b.id, b])), [bonsai]);

  // 未外し: wiring event のうち unwiring event が後続していないもの
  const wiringRows = useMemo<WiringRow[]>(() => {
    const wiringByBonsai = new Map<string, Event[]>();
    const unwiringByBonsai = new Map<string, Event[]>();
    for (const e of events) {
      if (e.status !== 'logged' || e.deletedAt != null) continue;
      if (e.type === 'wiring') {
        const list = wiringByBonsai.get(e.bonsaiId) ?? [];
        list.push(e);
        wiringByBonsai.set(e.bonsaiId, list);
      } else if (e.type === 'unwiring') {
        const list = unwiringByBonsai.get(e.bonsaiId) ?? [];
        list.push(e);
        unwiringByBonsai.set(e.bonsaiId, list);
      }
    }
    const rows: WiringRow[] = [];
    for (const [bId, wirings] of wiringByBonsai) {
      const unwirings = unwiringByBonsai.get(bId) ?? [];
      // 装着中 = 最新 wiring が最新 unwiring 以降
      const latestWiring = wirings.reduce((acc, e) =>
        acc == null || e.occurredAtUtc > acc.occurredAtUtc ? e : acc,
      );
      const latestUnwiring = unwirings.length
        ? unwirings.reduce((acc, e) =>
            acc == null || e.occurredAtUtc > acc.occurredAtUtc ? e : acc,
          )
        : null;
      if (latestUnwiring != null && latestUnwiring.occurredAtUtc > latestWiring.occurredAtUtc) {
        continue; // 既に外し済
      }
      const days = getDaysSinceWired(latestWiring, today);
      const weeks = getWeeksSinceWired(days);
      const scheduledUnwireAt = getScheduledUnwireAt(latestWiring);
      const daysUntilUnwire = scheduledUnwireAt
        ? Math.ceil((new Date(scheduledUnwireAt).getTime() - today.getTime()) / 86_400_000)
        : null;
      const overdue = classifyWiringDuration(days) === 'overdue';
      rows.push({
        event: latestWiring,
        bonsai: bonsaiMap.get(bId),
        weeks,
        scheduledUnwireAt,
        daysUntilUnwire,
        overdue,
      });
    }
    rows.sort((a, b) => b.weeks - a.weeks);
    return rows;
  }, [events, today, bonsaiMap]);

  const filteredRows = useMemo(() => {
    if (filter === 'all') return wiringRows;
    if (filter === 'active') return wiringRows; // 既に「未外し」のみ抽出済
    if (filter === 'unwireSoon') {
      return wiringRows.filter(
        (r) => r.daysUntilUnwire != null && r.daysUntilUnwire <= 7 && r.daysUntilUnwire >= 0,
      );
    }
    return wiringRows;
  }, [wiringRows, filter]);

  const tabs: readonly {
    key: Filter;
    labelKey: 'wiringTabAll' | 'wiringTabActive' | 'wiringTabSoon';
  }[] = [
    { key: 'all', labelKey: 'wiringTabAll' },
    { key: 'active', labelKey: 'wiringTabActive' },
    { key: 'unwireSoon', labelKey: 'wiringTabSoon' },
  ];

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_wiring_list_screen"
    >
      <View style={styles.tabsRow}>
        {tabs.map((tab) => {
          const on = filter === tab.key;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={t(tab.labelKey)}
              style={[styles.tab, on && styles.tabOn]}
              onPress={() => setFilter(tab.key)}
              testID={`e2e_wiring_tab_${tab.key}`}
            >
              <ThemedText
                style={[styles.tabText, on ? styles.tabTextOn : { color: c.textSecondary }]}
              >
                {t(tab.labelKey)}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {filteredRows.length === 0 ? (
          <ThemedText style={[styles.emptyText, { color: c.textSecondary }]}>
            {t('wiringListEmpty')}
          </ThemedText>
        ) : (
          filteredRows.map((row) => (
            <Pressable
              key={row.event.id}
              accessibilityRole="button"
              accessibilityLabel={row.bonsai?.name ?? ''}
              style={[styles.card, row.overdue && styles.cardWarn]}
              onPress={() => router.push(`/(tabs)/bonsai/${row.event.bonsaiId}` as Href)}
              testID={`e2e_wiring_row_${row.event.id}`}
            >
              <View style={styles.cardIcon}>
                <WireIcon size={20} color={row.overdue ? DANGER : ACCENT_BARK} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardHeaderRow}>
                  <ThemedText style={styles.cardName} numberOfLines={1}>
                    {row.bonsai?.name ?? ''}
                  </ThemedText>
                  {row.overdue && (
                    <ThemedText style={styles.warnBadge}>{t('wiringOverdueBadge')}</ThemedText>
                  )}
                </View>
                <ThemedText style={styles.cardMeta}>
                  {t('wiringRowWeeks').replace('{weeks}', String(row.weeks))}
                </ThemedText>
                {row.scheduledUnwireAt != null && row.daysUntilUnwire != null && (
                  <ThemedText
                    style={[
                      styles.cardSchedule,
                      row.daysUntilUnwire <= 7 && styles.cardScheduleSoon,
                    ]}
                  >
                    {row.daysUntilUnwire >= 0
                      ? t('wiringUnwireInDays').replace('{days}', String(row.daysUntilUnwire))
                      : t('wiringUnwireOverdue').replace(
                          '{days}',
                          String(Math.abs(row.daysUntilUnwire)),
                        )}
                  </ThemedText>
                )}
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  tabOn: { backgroundColor: BRAND_GREEN, borderColor: BRAND_GREEN },
  tabText: { fontSize: 12, color: TEXT_SECONDARY },
  tabTextOn: { color: ON_BRAND, fontWeight: '500' },
  listContent: { padding: 16, gap: 8, paddingBottom: 96 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 32 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    minHeight: 96,
  },
  cardWarn: { borderColor: DANGER },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, minWidth: 0, gap: 4 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 15, fontWeight: '500', color: TEXT_PRIMARY, flex: 1 },
  warnBadge: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: DANGER,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(139,46,46,0.1)',
    borderRadius: 4,
    letterSpacing: 0.6,
  },
  cardMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, color: TEXT_MUTED, letterSpacing: 0.5 },
  cardSchedule: { fontSize: 13, color: TEXT_SECONDARY },
  cardScheduleSoon: { color: ACCENT_BARK },
});
