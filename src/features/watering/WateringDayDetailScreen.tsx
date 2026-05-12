/**
 * 横断水やり日付詳細画面 (Phase G4 part 1、ADR-0024 Accepted)。
 *
 * 旧 `WateringDayDetailSheet.tsx` (`@gorhom/bottom-sheet` snap 55%/85%) を画面化、
 * `(modals)/watering-day-detail` route で `presentation: 'formSheet'` 配下に配置。
 *
 * 当日の watering events を時刻順で表示、entry tap で `setWateringDayDetailEntry(bonsaiId)` +
 * `router.back()` で caller に返却 → caller が `consumeWateringDayDetailEntry()` で取得 →
 * 盆栽詳細画面に遷移。
 */
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
import { usePickerStore } from '@/src/stores/pickerStore';

export default function WateringDayDetailScreen() {
  const { t } = useTranslation();
  const ctx = usePickerStore((s) => s.wateringDayDetailContext);

  const sortedEvents = React.useMemo(
    () =>
      ctx == null
        ? []
        : [...ctx.events].sort((a, b) => a.occurredAtUtc.localeCompare(b.occurredAtUtc)),
    [ctx],
  );

  if (ctx == null) return null;
  const { dateKey, bonsaiById } = ctx;

  const handlePressEntry = (bonsaiId: string) => {
    usePickerStore.getState().setWateringDayDetailEntry(bonsaiId);
    router.back();
  };

  return (
    <View style={styles.body} testID="e2e_watering_day_detail_screen">
      <ThemedText type="defaultSemiBold" style={styles.title}>
        {t('wateringDayDetailTitle').replace('{date}', dateKey)}
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        {t('wateringDayDetailCount').replace('{count}', String(sortedEvents.length))}
      </ThemedText>

      <ScrollView contentContainerStyle={styles.list}>
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
                onPress={() => handlePressEntry(ev.bonsaiId)}
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
      </ScrollView>
    </View>
  );
}

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
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 8 },
  title: { fontSize: 17, color: TEXT_PRIMARY },
  subtitle: { fontSize: 13, color: TEXT_SECONDARY, marginBottom: 8 },
  list: { gap: 8, paddingBottom: 16 },
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
