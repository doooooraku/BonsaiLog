/**
 * 横断水やり Calendar — 日付タップ時の詳細 BottomSheet。
 *
 * 当日の watering events を時刻順で表示。各 entry tap で盆栽詳細画面に遷移。
 *
 * Props:
 * - dateKey: YYYY-MM-DD (タップされた日付)
 * - events: 当日の watering events (親側で filter 済)
 * - bonsaiById: 盆栽 lookup map (id → BonsaiWithSpecies)
 * - onClose: sheet 閉じ callback (親が selectedDateKey クリア等)
 * - onPressEntry: entry タップ callback (盆栽詳細画面遷移)
 */
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import React, { forwardRef, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChevronRightIcon } from '@/src/components/icons';
import { getTzOffsetMin } from '@/src/core/datetime';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_PRIMARY,
  BORDER_DEFAULT,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import type { BonsaiWithSpecies } from '@/src/db/bonsaiRepository';
import type { Event } from '@/src/db/schema';

type Props = {
  dateKey: string | null;
  events: readonly Event[];
  bonsaiById: ReadonlyMap<string, BonsaiWithSpecies>;
  onClose: () => void;
  onPressEntry: (bonsaiId: string) => void;
};

export const WateringDayDetailSheet = forwardRef<BottomSheet, Props>(
  function WateringDayDetailSheet({ dateKey, events, bonsaiById, onClose, onPressEntry }, ref) {
    const { t } = useTranslation();
    const c = useColors();
    const snapPoints = useMemo(() => ['55%', '85%'], []);

    // events を occurredAtUtc 昇順 (古い → 新しい) でソート (同一日内の時系列、UI 通例)。
    const sortedEvents = useMemo(
      () => [...events].sort((a, b) => a.occurredAtUtc.localeCompare(b.occurredAtUtc)),
      [events],
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onChange={(idx) => {
          if (idx === -1) onClose();
        }}
        backgroundStyle={{ backgroundColor: c.background }}
        handleIndicatorStyle={{ backgroundColor: c.border }}
      >
        <BottomSheetView style={styles.body}>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            {dateKey != null
              ? t('wateringDayDetailTitle').replace('{date}', dateKey)
              : t('wateringDayDetailTitle').replace('{date}', '')}
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            {t('wateringDayDetailCount').replace('{count}', String(sortedEvents.length))}
          </ThemedText>

          {sortedEvents.length === 0 ? (
            <View style={styles.empty}>
              <ThemedText style={styles.emptyText}>{t('wateringDayDetailEmpty')}</ThemedText>
            </View>
          ) : (
            sortedEvents.map((ev) => {
              const b = bonsaiById.get(ev.bonsaiId);
              const time = formatLocalTime(ev.occurredAtUtc);
              return (
                <Pressable
                  key={ev.id}
                  accessibilityRole="button"
                  accessibilityLabel={b?.name ?? ev.bonsaiId}
                  style={styles.row}
                  onPress={() => onPressEntry(ev.bonsaiId)}
                  testID={`e2e_watering_day_entry_${ev.id}`}
                >
                  <View style={styles.rowMain}>
                    <ThemedText style={styles.rowName}>{b?.name ?? '―'}</ThemedText>
                    {b?.species?.commonName != null && (
                      <ThemedText style={styles.rowSpecies}>{b.species.commonName}</ThemedText>
                    )}
                  </View>
                  <ThemedText style={styles.rowTime}>{time}</ThemedText>
                  <ChevronRightIcon size={20} color={TEXT_MUTED} />
                </Pressable>
              );
            })
          )}
        </BottomSheetView>
      </BottomSheet>
    );
  },
);

/** ISO 8601 UTC → ローカル HH:mm (端末 TZ)。 */
function formatLocalTime(iso: string): string {
  try {
    const date = new Date(iso);
    const tzOffsetMin = getTzOffsetMin();
    const local = new Date(date.getTime() + tzOffsetMin * 60 * 1000);
    const h = String(local.getUTCHours()).padStart(2, '0');
    const m = String(local.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  } catch {
    return iso.slice(11, 16);
  }
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  title: { fontSize: 17, color: TEXT_PRIMARY },
  subtitle: { fontSize: 13, color: TEXT_SECONDARY, marginBottom: 8 },
  empty: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { color: TEXT_MUTED, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 10,
    backgroundColor: BG_PRIMARY,
    minHeight: 56,
  },
  rowMain: { flex: 1, gap: 2, minWidth: 0 },
  rowName: { fontSize: 15, fontWeight: '500', color: TEXT_PRIMARY },
  rowSpecies: { fontSize: 12, color: TEXT_SECONDARY },
  rowTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: TEXT_SECONDARY,
    letterSpacing: 0.6,
  },
});
