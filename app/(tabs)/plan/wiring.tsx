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
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WireIcon } from '@/src/components/icons';
import { nowUtc } from '@/src/core/datetime';
import { useTranslation } from '@/src/core/i18n/i18n';
// Sess66 PR6a: theme-dependent token (BG_*/TEXT_PRIMARY/BORDER_*) は inline c.* 経由。
// TEXT_MUTED / TEXT_SECONDARY は JSX inline / function return で利用継続。
import { ACCENT_GOLD, TEXT_MUTED, TEXT_SECONDARY } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { getAllActiveBonsai } from '@/src/db/bonsaiRepository';
import { getAllActivePlannedAndLoggedEvents } from '@/src/db/eventRepository';
import { getCoverPhoto } from '@/src/db/photoRepository';
import type { Bonsai, Event } from '@/src/db/schema';
import { buildHistoryChips } from '@/src/features/event/buildHistoryChips';
import { HistoryChipRow } from '@/src/features/event/HistoryChip';
import { UNWIRE_PARTS } from '@/src/features/event/WorkLogTypeFormFields';
import {
  getBodyPart,
  getDaysSinceWired,
  getScheduledUnwireAtWithFallback,
  getWeeksSinceWired,
} from '@/src/features/wiring/wiringDuration';

/**
 * 装着状態 3 段階 (Issue #459、mockup `wiring-list.png` 整合):
 * - within_safe: scheduled_unwire_at まで余裕あり (灰)
 * - within_warning: scheduled_unwire_at まで 14 日以下 (橙、外し時期接近)
 * - overdue: scheduled_unwire_at を超過、または unwire 予定なしで 6 週超 (赤、要確認バッジ + 赤枠)
 */
type WiringStatusKind = 'within_safe' | 'within_warning' | 'overdue';

/** scheduled_unwire_at まで残り 14 日 (2 週) 以下を warning と判定。 */
const WARNING_WINDOW_DAYS = 14;

/** 既定の overdue しきい値 (scheduled_unwire_at 未指定時、wiringDuration の既定 42 日と同値)。 */
const FALLBACK_OVERDUE_DAYS = 42;

/**
 * 装着状態 3 段階を判定 (純関数、Issue #459)。
 * scheduled_unwire_at が指定されていれば「外し予定日からの残り日数」で判定。
 * 未指定なら経過日数 (装着開始から) のしきい値判定に fallback。
 */
function classifyByScheduledUnwire(
  daysSinceWired: number,
  daysUntilUnwire: number | null,
): WiringStatusKind {
  if (daysUntilUnwire != null) {
    if (daysUntilUnwire < 0) return 'overdue';
    if (daysUntilUnwire <= WARNING_WINDOW_DAYS) return 'within_warning';
    return 'within_safe';
  }
  return daysSinceWired >= FALLBACK_OVERDUE_DAYS ? 'overdue' : 'within_safe';
}

type WiringRow = {
  event: Event;
  bonsai: Bonsai | undefined;
  weeks: number;
  scheduledUnwireAt: string | null;
  /** unwire 予定までの残週数 (null = 未指定、負値は overdue)。 */
  weeksUntilUnwire: number | null;
  /** 装着状態 3 段階 (Issue #459)。 */
  kind: WiringStatusKind;
  /** payload から body_part 生値。work-log-confirm への initialBodyPart プリセット用。 */
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

  // 「外す」tap → work-log-confirm (type=unwiring) へ遷移。
  // 元 wiring の body_part を initialBodyPart として渡しプリセット (Sess41 アプローチC)。
  // 保存後は WorkLogConfirmScreen の既存動作で記録タブ (カレンダー) へ遷移。
  const handleUnwire = useCallback(
    (row: WiringRow) => {
      const bonsaiName = row.bonsai?.name ?? '';
      let url = `/work-log-confirm?bonsaiName=${encodeURIComponent(bonsaiName)}&bonsaiId=${row.event.bonsaiId}&type=unwiring`;
      if (row.part && (UNWIRE_PARTS as readonly string[]).includes(row.part)) {
        url += `&initialBodyPart=${row.part}`;
      }
      router.push(url as Href);
    },
    [router],
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
      const scheduledUnwireAt = getScheduledUnwireAtWithFallback(latestWiring);
      let weeksUntilUnwire: number | null = null;
      if (scheduledUnwireAt) {
        const diffMs = new Date(scheduledUnwireAt).getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / 86_400_000);
        weeksUntilUnwire = Math.ceil(Math.abs(diffDays) / 7) * (diffDays >= 0 ? 1 : -1);
      }
      // Issue #459: scheduled_unwire_at までの残り日数で 3 段階判定
      // (旧 classifyWiringDuration は scheduled_unwire_at を考慮しないため、
      //  予定内でも 6 週超で overdue と誤判定していた)。
      const daysUntilUnwire = scheduledUnwireAt
        ? Math.ceil((new Date(scheduledUnwireAt).getTime() - today.getTime()) / 86_400_000)
        : null;
      const kind = classifyByScheduledUnwire(days, daysUntilUnwire);
      rows.push({
        event: latestWiring,
        bonsai: bonsaiMap.get(bId),
        weeks,
        scheduledUnwireAt,
        weeksUntilUnwire,
        kind,
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
            const chips = buildHistoryChips(row.event);
            return (
              <Pressable
                key={row.event.id}
                accessibilityRole="button"
                accessibilityLabel={row.bonsai?.name ?? ''}
                style={[
                  styles.card,
                  { backgroundColor: c.surface, borderColor: c.border },
                  row.kind === 'overdue' && { borderColor: c.dangerColor },
                ]}
                onPress={() => router.push(`/(tabs)/bonsai/${row.event.bonsaiId}` as Href)}
                testID={`e2e_wiring_row_${row.event.id}`}
              >
                {/* Issue #326: mockup v1.0 各行 64×64 サムネ (radius 8)、photo なしは placeholder */}
                {row.bonsai && photoMap.get(row.bonsai.id) ? (
                  <Image
                    source={{ uri: photoMap.get(row.bonsai.id)! }}
                    style={[styles.thumb, { backgroundColor: c.background }]}
                    contentFit="cover"
                    testID={`e2e_wiring_thumb_${row.event.id}`}
                  />
                ) : (
                  <View
                    style={[styles.thumbPlaceholder, { backgroundColor: c.background }]}
                    testID={`e2e_wiring_thumb_placeholder_${row.event.id}`}
                  >
                    <WireIcon size={24} color={TEXT_MUTED} />
                  </View>
                )}
                <View style={styles.cardBody}>
                  <View style={styles.cardHeaderRow}>
                    <ThemedText style={[styles.cardName, { color: c.text }]} numberOfLines={1}>
                      {row.bonsai?.name ?? ''}
                    </ThemedText>
                    {row.kind === 'overdue' && (
                      <ThemedText style={[styles.warnBadge, { color: c.dangerColor }]}>
                        {t('wiringOverdueBadge')}
                      </ThemedText>
                    )}
                  </View>
                  {chips.length > 0 && <HistoryChipRow chips={chips} />}
                  <ThemedText
                    style={[styles.cardSchedule, { color: scheduleColor(row, c.dangerColor) }]}
                  >
                    {scheduleText(row, t)}
                  </ThemedText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${row.bonsai?.name ?? ''} ${t('wiringRowUnwireAction')}`}
                  testID={`e2e_wiring_row_unwire_${row.event.id}`}
                  style={[styles.unwireButton, { borderColor: c.tint }]}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    handleUnwire(row);
                  }}
                  hitSlop={20}
                >
                  <ThemedText style={[styles.unwireButtonText, { color: c.tint }]}>
                    {t('wiringRowUnwireAction')}
                  </ThemedText>
                </Pressable>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </ThemedView>
  );
}

function scheduleColor(row: WiringRow, dangerColor: string): string {
  if (row.kind === 'overdue') return dangerColor;
  if (row.kind === 'within_warning') return ACCENT_GOLD;
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
  // Sess95 PR-3: 旧 FAB 用 96 → 24 (FAB は Sess72 ADR-0054 で廃止済、 過剰余白の整理)
  listContent: { padding: 16, gap: 8, paddingBottom: 24 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 32 },
  // Sess66 PR6a: bg/border は inline c.* (dark cascade)。
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 96,
  },
  // Issue #326: mockup v1.0 64×64 thumbnail (radius 8、cover photo)
  thumb: { width: 64, height: 64, borderRadius: 8 },
  thumbPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Issue #325: 「外す」アクションボタン (mockup v1.0 整合、rounded + border)
  unwireButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    // Sess108 PR-D: borderColor は inline c.tint (dark cascade)
  },
  unwireButtonText: { fontSize: 13, fontWeight: '500' /* color は inline c.tint */ },
  cardBody: { flex: 1, minWidth: 0, gap: 4 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // Sess66 PR6a: color は inline c.text (dark cascade)。
  cardName: { fontSize: 16, fontWeight: '500', flex: 1 },
  warnBadge: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(139,46,46,0.1)',
    borderRadius: 4,
    letterSpacing: 0.6,
  },
  // Sess66 PR6a: scheduleColor() で動的指定 (上書き)、 fallback も inline c.textSecondary 推奨。
  cardSchedule: { fontSize: 13 },
});
