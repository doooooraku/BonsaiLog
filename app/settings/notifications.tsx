/**
 * 通知時刻サブ画面 (ADR-0014 Amended)。
 *
 * 通知は当日まとめの 1 系統に集約され、ON/OFF トグルは設定タブ本体に統合された。
 * 本画面は「通知 ON 時の発火時刻」を変更するだけのシンプルな時刻設定画面。
 * 設定タブ本体の「通知時刻 ›」行 (通知 ON 時のみ表示) からのみ到達する。
 *
 * Related:
 * - Issue #30 F-16 (当日まとめ通知、ADR-0014)
 * - 旧: master/summary トグル + 水やり通知トグルは廃止 (ADR-0014 Amended)
 */
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Stack } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import { BORDER_DEFAULT } from '@/src/core/theme/colors';
import { formatDateToHhmm, parseHhmmToDate } from '@/src/features/notification/notificationTime';
import { triggerSummaryReschedule } from '@/src/features/notification/triggerReschedule';
import { useSettingsStore } from '@/src/stores/settingsStore';

export default function SettingsNotificationsScreen() {
  const { t } = useTranslation();

  const notifSummaryTime = useSettingsStore((s) => s.notificationDailySummaryTime);
  const setNotifSummaryTime = useSettingsStore((s) => s.setNotificationDailySummaryTime);
  const [showTimePicker, setShowTimePicker] = React.useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']} testID="e2e_settings_notifications_screen">
      <Stack.Screen options={{ title: t('settingsNotifSummaryEditTime') }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settingsNotifSummaryEditTime')}
          testID="e2e_notif_summary_edit_time"
          style={styles.entry}
          onPress={() => setShowTimePicker(true)}
        >
          <ThemedText type="defaultSemiBold">{t('settingsNotifSummaryEditTime')}</ThemedText>
          <ThemedText style={styles.entryDesc}>{notifSummaryTime}</ThemedText>
        </Pressable>
        {showTimePicker && (
          <DateTimePicker
            testID="e2e_notif_summary_time_picker"
            value={parseHhmmToDate(notifSummaryTime, new Date(Date.now()))}
            mode="time"
            is24Hour
            onChange={(event: DateTimePickerEvent, date?: Date) => {
              setShowTimePicker(false);
              if (event.type === 'set' && date) {
                setNotifSummaryTime(formatDateToHhmm(date));
                // 時刻変更を当日まとめ通知に即時反映 (再予約)
                void triggerSummaryReschedule(t);
              }
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  entry: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    gap: 6,
  },
  entryDesc: { fontSize: 13, opacity: 0.7, lineHeight: 18 },
});
