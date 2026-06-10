/**
 * NotificationCard — まとめ通知時刻表示 + 編集 card (Sess93 PR-4、 ADR-0014 Notes Amended)。
 *
 * Sess93 議論 検討漏れ (C) 案 C 採用:
 *   - 旧モック「予定日に通知する toggle + 時刻」 = ADR-0014「当日まとめ 1 系統のみ」 と矛盾
 *   - 採用: toggle 削除、 時刻のみ表示 + 編集可、 説明文で「個別通知ではなく まとめ通知」 と明示
 *   - 通知全停止は 設定画面の 通知設定で行う (= 説明文で 案内)
 *
 * Sess94 PR-A 改修 (= ClaudeDesign モック寄せ、 機能 keep):
 *   - BellIcon + ClockIcon を row 左に inline 追加 (= モック「🔔/🕐 アイコン」 整合)
 *   - 機能 (= まとめ通知 1 系統、 ADR-0014) は完全 keep、 toggle 図形 + 「予定日に通知する」 文言は採用しない
 *     (= 機能と矛盾する見せ方 = user 誤認リスク)
 *
 * 用途:
 *   - RecurrenceFormScreen (= 定期予定 入力画面で 通知時刻を 直接編集可能)
 *
 * 設計:
 *   - settingsStore.notificationDailySummaryTime を 直接 read/write (= 朝のまとめ通知時刻 SoT)
 *   - DateTimePicker (= @react-native-community/datetimepicker) で 時刻選択
 *   - 「毎朝」 と限定しない (= user 真意: 朝以外の時刻も指定可)
 */
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BellIcon, ClockIcon } from '@/src/components/icons';
import { nowUtc } from '@/src/core/datetime';
import { useTranslation } from '@/src/core/i18n/i18n';
import { useColors } from '@/src/core/theme/useColors';
// Sess93 PR-4: NotificationCard は 設定画面と同じ通知時刻 SoT (= settingsStore.notificationDailySummaryTime)
// を 編集する役割。 components 層から features/stores への 1 本 edge を 議論で許容済 (= 案 C 採用、
// user の「画面遷移せず inline 編集」 要件)。 NotificationSettingsSection と完全同 logic。
/* eslint-disable boundaries/dependencies */
import { formatDateToHhmm, parseHhmmToDate } from '@/src/features/notification/notificationTime';
import { triggerSummaryReschedule } from '@/src/features/notification/triggerReschedule';
import { useSettingsStore } from '@/src/stores/settingsStore';
/* eslint-enable boundaries/dependencies */

export function NotificationCard({ disabled = false }: { disabled?: boolean }) {
  const { t } = useTranslation();
  const c = useColors();
  const notifTime = useSettingsStore((s) => s.notificationDailySummaryTime);
  const setNotifTime = useSettingsStore((s) => s.setNotificationDailySummaryTime);

  const [showTimePicker, setShowTimePicker] = React.useState(false);

  const handleTimeChange = React.useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      setShowTimePicker(false);
      if (event.type === 'set' && selectedDate) {
        const hhmm = formatDateToHhmm(selectedDate);
        setNotifTime(hhmm);
        void triggerSummaryReschedule(t);
      }
    },
    [setNotifTime, t],
  );

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.sectionLabel, { color: c.text }]}>
        {t('notificationCardSectionLabel')}
      </ThemedText>
      <View
        style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
        testID="e2e_notification_card"
      >
        <View style={styles.row}>
          <View style={styles.rowLabelWrap}>
            <BellIcon size={18} color={c.text} />
            <ThemedText style={[styles.rowLabel, { color: c.text }]}>
              {t('notificationCardSummaryLabel')}
            </ThemedText>
          </View>
        </View>
        <View style={[styles.divider, { backgroundColor: c.border }]} />
        <Pressable
          onPress={() => setShowTimePicker(true)}
          disabled={disabled}
          style={({ pressed }) => [styles.row, styles.rowPressable, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={`${t('notificationCardTimeLabel')}: ${notifTime}`}
          testID="e2e_notification_card_time_row"
        >
          <View style={styles.rowLabelWrap}>
            <ClockIcon size={18} color={c.text} />
            <ThemedText style={[styles.rowLabel, { color: c.text }]}>
              {t('notificationCardTimeLabel')}
            </ThemedText>
          </View>
          <View style={styles.rowValueWrap}>
            <ThemedText style={[styles.rowValue, { color: c.tint }]}>{notifTime}</ThemedText>
            <ThemedText style={[styles.chevron, { color: c.textSecondary }]}>›</ThemedText>
          </View>
        </Pressable>
      </View>
      <ThemedText style={[styles.hint, { color: c.textSecondary }]}>
        {t('notificationCardHint')}
      </ThemedText>
      {showTimePicker ? (
        <DateTimePicker
          value={parseHhmmToDate(notifTime, new Date(nowUtc()))}
          mode="time"
          display="default"
          is24Hour
          onChange={handleTimeChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  rowPressable: {},
  // Sess94 PR-A: icon + label の inline 並び (= ClaudeDesign モック整合、 機能 keep)
  rowLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
  rowValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  chevron: {
    fontSize: 18,
  },
  divider: {
    height: 1,
  },
  hint: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
});
