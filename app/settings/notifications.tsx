/**
 * 通知設定サブ画面 (Phase 1.6-T6 / Issue #330 A2a)。
 *
 * mockup v1.0 SettingsScreen「通知 [Switch] / 通知の時間帯 ›」 整合のため、
 * 既存 3 toggle (event overload / summary / watering) + 時刻設定を
 * 設定タブから本サブ画面に集約。設定タブ側は「通知設定 ›」 1 行のみに簡素化。
 *
 * Related:
 * - Issue #25 F-05 (気遣い型ポップアップ、ADR-0011)
 * - Issue #30 F-16 (当日まとめ + 水やり繰り返し通知、ADR-0014)
 *
 * 残作業 (A2b、別 Issue で track 予定):
 * - ADR-0014 §30 マスタートグル (notificationMasterEnabled) + scheduler 連動
 * - mockup の「通知の時間帯 8:00 – 20:00」表示
 *
 * testID は既存維持: e2e_event_overload_toggle / e2e_notif_summary_toggle /
 * e2e_notif_watering_toggle 等。Maestro flow 4 件 (notification-off-on /
 * watering-settings / event-overload-popup / notification-summary-tap) は
 * 前段に「通知設定 ›」 行 tap step を追加して対応。
 */
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Stack } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import { BORDER_DEFAULT } from '@/src/core/theme/colors';
import { formatDateToHhmm, parseHhmmToDate } from '@/src/features/notification/notificationTime';
import { requestNotificationPermission } from '@/src/features/notification/scheduler';
import { useSettingsStore } from '@/src/stores/settingsStore';

export default function SettingsNotificationsScreen() {
  const { t } = useTranslation();

  // ADR-0014 §30 / Issue #423: マスタートグル OFF 時は全 toggle を grey out + 注意 banner 表示
  const notificationMasterEnabled = useSettingsStore((s) => s.notificationMasterEnabled);
  const masterOff = !notificationMasterEnabled;

  const eventOverloadEnabled = useSettingsStore((s) => s.eventOverloadEnabled);
  const setEventOverloadEnabled = useSettingsStore((s) => s.setEventOverloadEnabled);

  // F-16 Phase B (Issue #30, ADR-0014): 通知設定 ON/OFF + 時刻表示
  const notifSummaryEnabled = useSettingsStore((s) => s.notificationDailySummaryEnabled);
  const setNotifSummaryEnabled = useSettingsStore((s) => s.setNotificationDailySummaryEnabled);
  const notifSummaryTime = useSettingsStore((s) => s.notificationDailySummaryTime);
  const setNotifSummaryTime = useSettingsStore((s) => s.setNotificationDailySummaryTime);
  // F-16 Phase C (Issue #30): DateTimePicker による時刻編集
  const [showSummaryTimePicker, setShowSummaryTimePicker] = React.useState(false);

  const notifWateringEnabled = useSettingsStore((s) => s.notificationWateringRepeatEnabled);
  const setNotifWateringEnabled = useSettingsStore((s) => s.setNotificationWateringRepeatEnabled);
  const notifWateringTimes = useSettingsStore((s) => s.notificationWateringRepeatTimes);

  // ON 時に OS permission をリクエスト、拒否されたら state を戻す。Phase C で datetimepicker による時刻編集を追加。
  const handleToggleNotifSummary = React.useCallback(
    async (enabled: boolean) => {
      if (!enabled) {
        setNotifSummaryEnabled(false);
        return;
      }
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotifSummaryEnabled(true);
      } else {
        Alert.alert(
          t('settingsNotifPermissionDeniedTitle'),
          t('settingsNotifPermissionDeniedBody'),
        );
      }
    },
    [setNotifSummaryEnabled, t],
  );

  const handleToggleNotifWatering = React.useCallback(
    async (enabled: boolean) => {
      if (!enabled) {
        setNotifWateringEnabled(false);
        return;
      }
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotifWateringEnabled(true);
      } else {
        Alert.alert(
          t('settingsNotifPermissionDeniedTitle'),
          t('settingsNotifPermissionDeniedBody'),
        );
      }
    },
    [setNotifWateringEnabled, t],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']} testID="e2e_settings_notifications_screen">
      <Stack.Screen options={{ title: t('settingsNotifTimeRangeRowLabel') }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ADR-0014 §30 / Issue #423: master OFF 時の注意 banner */}
        {masterOff && (
          <View style={styles.masterOffBanner} testID="e2e_settings_notif_master_off_banner">
            <ThemedText style={styles.masterOffBannerText}>
              {t('settingsNotifMasterOffBanner')}
            </ThemedText>
          </View>
        )}
        <View
          style={[styles.toggleRow, masterOff && styles.toggleRowDisabled]}
          testID="e2e_event_overload_toggle_row"
        >
          <View style={styles.toggleLabelBox}>
            <ThemedText type="defaultSemiBold">{t('settingsEventOverloadToggle')}</ThemedText>
            <ThemedText style={styles.entryDesc}>{t('settingsEventOverloadToggleDesc')}</ThemedText>
          </View>
          <Switch
            accessibilityRole="switch"
            accessibilityLabel={t('settingsEventOverloadToggle')}
            testID="e2e_event_overload_toggle"
            value={eventOverloadEnabled}
            onValueChange={setEventOverloadEnabled}
            disabled={masterOff}
          />
        </View>

        {/* F-16 Phase B (Issue #30, ADR-0014): 当日まとめ通知 + 水やり繰り返し通知トグル */}
        <View
          style={[styles.toggleRow, masterOff && styles.toggleRowDisabled]}
          testID="e2e_notif_summary_toggle_row"
        >
          <View style={styles.toggleLabelBox}>
            <ThemedText type="defaultSemiBold">{t('settingsNotifSummaryToggle')}</ThemedText>
            <ThemedText style={styles.entryDesc}>
              {t('settingsNotifSummaryToggleDesc').replace('{time}', notifSummaryTime)}
            </ThemedText>
          </View>
          <Switch
            accessibilityRole="switch"
            accessibilityLabel={t('settingsNotifSummaryToggle')}
            testID="e2e_notif_summary_toggle"
            value={notifSummaryEnabled}
            onValueChange={(v) => void handleToggleNotifSummary(v)}
            disabled={masterOff}
          />
        </View>
        {/* F-16 Phase C (Issue #30): 通知時刻変更 (DateTimePicker)、ON 時のみ表示 */}
        {notifSummaryEnabled && !masterOff && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsNotifSummaryEditTime')}
            testID="e2e_notif_summary_edit_time"
            style={styles.entry}
            onPress={() => setShowSummaryTimePicker(true)}
          >
            <ThemedText type="defaultSemiBold">{t('settingsNotifSummaryEditTime')}</ThemedText>
            <ThemedText style={styles.entryDesc}>{notifSummaryTime}</ThemedText>
          </Pressable>
        )}
        {showSummaryTimePicker && (
          <DateTimePicker
            testID="e2e_notif_summary_time_picker"
            value={parseHhmmToDate(notifSummaryTime, new Date(Date.now()))}
            mode="time"
            is24Hour
            onChange={(event: DateTimePickerEvent, date?: Date) => {
              setShowSummaryTimePicker(false);
              if (event.type === 'set' && date) {
                setNotifSummaryTime(formatDateToHhmm(date));
              }
            }}
          />
        )}

        <View
          style={[styles.toggleRow, masterOff && styles.toggleRowDisabled]}
          testID="e2e_notif_watering_toggle_row"
        >
          <View style={styles.toggleLabelBox}>
            <ThemedText type="defaultSemiBold">{t('settingsNotifWateringToggle')}</ThemedText>
            <ThemedText style={styles.entryDesc}>
              {t('settingsNotifWateringToggleDesc').replace(
                '{times}',
                notifWateringTimes.join(', '),
              )}
            </ThemedText>
          </View>
          <Switch
            accessibilityRole="switch"
            accessibilityLabel={t('settingsNotifWateringToggle')}
            testID="e2e_notif_watering_toggle"
            value={notifWateringEnabled}
            onValueChange={(v) => void handleToggleNotifWatering(v)}
            disabled={masterOff}
          />
        </View>
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
  toggleRow: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleLabelBox: { flex: 1, gap: 4 },
  // Phase 1.6-T6 (Issue #423): master OFF 時の grey out + 注意 banner
  toggleRowDisabled: { opacity: 0.4 },
  masterOffBanner: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFF4E1',
    borderWidth: 1,
    borderColor: '#E6C067',
  },
  masterOffBannerText: { fontSize: 13, lineHeight: 18, color: '#7A5A1F' },
});
