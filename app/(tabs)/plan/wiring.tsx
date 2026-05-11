/**
 * 針金がけ一覧画面 (ADR-0020 §画面マップ row 15、mockup v1.0 `care-screens.jsx WiringListScreen` 整合)。
 *
 * - 全盆栽の wiring event (status='logged' / deletedAt=null) を装着期間 (週) 順で表示
 * - 各行: 盆栽名 + 「要確認」badge (overdue) + gauge · part 行 + 装着期間 + 外し予定週数
 * - mockup v1.0 整合: filter tabs 削除、ヘッダーは Stack header (NotoSerifJP 20pt + 中央)
 *
 * 既存の wiring 純関数 (wiringDuration.ts) を再利用。
 *
 * 上位画面: `app/(tabs)/plan/index.tsx` の「針金がけ一覧」リンクで遷移。
 */
import { Image } from 'expo-image';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WireIcon } from '@/src/components/icons';
import { nowUtc } from '@/src/core/datetime';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  ACCENT_GOLD,
  BG_PRIMARY,
  BG_SURFACE,
  BORDER_DEFAULT,
  DANGER,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { getAllActiveBonsai } from '@/src/db/bonsaiRepository';
import { getAllActivePlannedAndLoggedEvents } from '@/src/db/eventRepository';
import { getCoverPhoto } from '@/src/db/photoRepository';
import type { Bonsai, Event } from '@/src/db/schema';
import {
  classifyWiringDuration,
  getBodyPart,
  getDaysSinceWired,
  getScheduledUnwireAt,
  getWeeksSinceWired,
  getWireSize,
} from '@/src/features/wiring/wiringDuration';

type WiringRow = {
  event: Event;
  bonsai: Bonsai | undefined;
  weeks: number;
  scheduledUnwireAt: string | null;
  /** unwire 予定までの残週数 (null = 未指定、負値は overdue)。 */
  weeksUntilUnwire: number | null;
  /** しきい値超過 (overdue) 判定。 */
  overdue: boolean;
  /** payload から: "1mm" 等。null は表示省略。 */
  gauge: string | null;
  /** payload から: "枝" "幹" 等。null は表示省略。 */
  part: string | null;
};

export default function WiringListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const [events, setEvents] = useState<Event[]>([]);
  const [bonsai, setBonsai] = useState<Bonsai[]>([]);
  // Issue #326: mockup v1.0 各行 64×64 サムネ表示用 (BonsaiCard と同じ cover photo ロジック)
  const [photoMap, setPhotoMap] = useState<Map<string, string>>(new Map());

  const reload = useCallback(async () => {
    const [evs, bs] = await Promise.all([
      getAllActivePlannedAndLoggedEvents(),
      getAllActiveBonsai(),
    ]);
    setEvents(evs);
    setBonsai(bs);
    // wiring 一覧で表示する盆栽の cover photo を並列取得 (BonsaiCard と同じ absoluteUri)
    const entries = await Promise.all(
      bs.map(async (b) => {
        const photo = await getCoverPhoto(b.id);
        return [b.id, photo?.absoluteUri ?? null] as const;
      }),
    );
    const map = new Map<string, string>();
    for (const [id, uri] of entries) {
      if (uri) map.set(id, uri);
    }
    setPhotoMap(map);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const today = useMemo(() => new Date(nowUtc() as string), []);
  const bonsaiMap = useMemo(() => new Map(bonsai.map((b) => [b.id, b])), [bonsai]);

  // 装着中: 最新 wiring が最新 unwiring 以降の event のみ
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
      const latestWiring = wirings.reduce((acc, e) =>
        acc == null || e.occurredAtUtc > acc.occurredAtUtc ? e : acc,
      );
      const latestUnwiring = unwirings.length
        ? unwirings.reduce((acc, e) =>
            acc == null || e.occurredAtUtc > acc.occurredAtUtc ? e : acc,
          )
        : null;
      if (latestUnwiring != null && latestUnwiring.occurredAtUtc > latestWiring.occurredAtUtc) {
        continue;
      }
      const days = getDaysSinceWired(latestWiring, today);
      const weeks = getWeeksSinceWired(days);
      const scheduledUnwireAt = getScheduledUnwireAt(latestWiring);
      let weeksUntilUnwire: number | null = null;
      if (scheduledUnwireAt) {
        const diffMs = new Date(scheduledUnwireAt).getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / 86_400_000);
        weeksUntilUnwire = Math.ceil(Math.abs(diffDays) / 7) * (diffDays >= 0 ? 1 : -1);
      }
      const overdue = classifyWiringDuration(days) === 'overdue';
      rows.push({
        event: latestWiring,
        bonsai: bonsaiMap.get(bId),
        weeks,
        scheduledUnwireAt,
        weeksUntilUnwire,
        overdue,
        gauge: getWireSize(latestWiring),
        part: getBodyPart(latestWiring),
      });
    }
    rows.sort((a, b) => b.weeks - a.weeks);
    return rows;
  }, [events, today, bonsaiMap]);

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_wiring_list_screen"
    >
      <ScrollView contentContainerStyle={styles.listContent}>
        {wiringRows.length === 0 ? (
          <ThemedText style={[styles.emptyText, { color: c.textSecondary }]}>
            {t('wiringListEmpty')}
          </ThemedText>
        ) : (
          wiringRows.map((row) => {
            const gaugePart =
              row.gauge && row.part
                ? t('wiringRowGaugePart').replace('{gauge}', row.gauge).replace('{part}', row.part)
                : (row.gauge ?? row.part);
            return (
              <Pressable
                key={row.event.id}
                accessibilityRole="button"
                accessibilityLabel={row.bonsai?.name ?? ''}
                style={[styles.card, row.overdue && styles.cardWarn]}
                onPress={() => router.push(`/(tabs)/bonsai/${row.event.bonsaiId}` as Href)}
                testID={`e2e_wiring_row_${row.event.id}`}
              >
                {/* Issue #326: mockup v1.0 各行 64×64 サムネ (radius 8)、photo なしは placeholder */}
                {row.bonsai && photoMap.get(row.bonsai.id) ? (
                  <Image
                    source={{ uri: photoMap.get(row.bonsai.id)! }}
                    style={styles.thumb}
                    contentFit="cover"
                    testID={`e2e_wiring_thumb_${row.event.id}`}
                  />
                ) : (
                  <View
                    style={styles.thumbPlaceholder}
                    testID={`e2e_wiring_thumb_placeholder_${row.event.id}`}
                  >
                    <WireIcon size={24} color={TEXT_MUTED} />
                  </View>
                )}
                <View style={styles.cardBody}>
                  <View style={styles.cardHeaderRow}>
                    <ThemedText style={styles.cardName} numberOfLines={1}>
                      {row.bonsai?.name ?? ''}
                    </ThemedText>
                    {row.overdue && (
                      <ThemedText style={styles.warnBadge}>{t('wiringOverdueBadge')}</ThemedText>
                    )}
                  </View>
                  {gaugePart && (
                    <View style={styles.cardMetaRow}>
                      <WireIcon size={12} color={TEXT_MUTED} />
                      <ThemedText style={styles.cardMeta}>{gaugePart}</ThemedText>
                    </View>
                  )}
                  <ThemedText style={[styles.cardSchedule, { color: scheduleColor(row) }]}>
                    {scheduleText(row, t)}
                  </ThemedText>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </ThemedView>
  );
}

function scheduleColor(row: WiringRow): string {
  if (row.overdue) return DANGER;
  if (row.weeksUntilUnwire != null && row.weeksUntilUnwire >= 0 && row.weeksUntilUnwire <= 2) {
    return ACCENT_GOLD;
  }
  return TEXT_SECONDARY;
}

function scheduleText(
  row: WiringRow,
  t: (k: 'wiringRowWeeks' | 'wiringUnwireInWeeks' | 'wiringUnwireOverdueWeeks') => string,
): string {
  const baseLine = t('wiringRowWeeks').replace('{weeks}', String(row.weeks));
  if (row.weeksUntilUnwire == null) return baseLine;
  if (row.weeksUntilUnwire >= 0) {
    return `${baseLine} · ${t('wiringUnwireInWeeks').replace('{weeks}', String(row.weeksUntilUnwire))}`;
  }
  return `${baseLine} · ${t('wiringUnwireOverdueWeeks').replace('{weeks}', String(Math.abs(row.weeksUntilUnwire)))}`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  // Issue #326: mockup v1.0 64×64 thumbnail (radius 8、cover photo)
  thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: BG_PRIMARY },
  thumbPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: BG_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, minWidth: 0, gap: 4 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 16, fontWeight: '500', color: TEXT_PRIMARY, flex: 1 },
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
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: TEXT_MUTED,
    letterSpacing: 0.5,
  },
  cardSchedule: { fontSize: 13, color: TEXT_SECONDARY },
});
