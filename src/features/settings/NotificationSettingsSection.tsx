/**
 * 設定画面の通知 section (F-16 Issue #30 / ADR-0014 Amended、 Phase 4 A3 で抽出)。
 *
 * 通知は当日まとめ 1 系統に集約 (トグル 1 つ)。
 * 行 1: 通知トグル (ON 時に OS 許可リクエスト、 デフォルト OFF)
 * 行 2: 通知時刻を変更 (ON 時のみ表示、 その場に OS 時刻ピッカー、 中間サブ画面なし)
 *
 * 振る舞いは SettingsScreen の元実装と完全同一 (純粋な抽出)。
 */
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
// Sess68 PR #C: BORDER_DEFAULT は inline c.border 化。
import { useColors } from '@/src/core/theme/useColors';
import { formatDateToHhmm, parseHhmmToDate } from '@/src/features/notification/notificationTime';
import { requestNotificationPermission } from '@/src/features/notification/scheduler';
import { triggerSummaryReschedule } from '@/src/features/notification/triggerReschedule';
import { useSettingsStore } from '@/src/stores/settingsStore';

import { SettingsSection } from './SettingsSection';

export function NotificationSettingsSection() {
  const { t } = useTranslation();
  const c = useColors();
  const entryThemed = { borderBottomColor: c.border };
  // ADR-0014 Amended: 通知は当日まとめ 1 系統に集約、トグルも 1 つ (master + summary 統合)
  const notifSummaryEnabled = useSettingsStore((s) => s.notificationDailySummaryEnabled);
  const setNotifSummaryEnabled = useSettingsStore((s) => s.setNotificationDailySummaryEnabled);
  const notifSummaryTime = useSettingsStore((s) => s.notificationDailySummaryTime);
  const setNotifSummaryTime = useSettingsStore((s) => s.setNotificationDailySummaryTime);
  // 通知時刻ピッカーを設定画面でインライン表示 (中間サブ画面 notifications.tsx 廃止)
  const [showTimePicker, setShowTimePicker] = React.useState(false);

  // ADR-0014 Amended: ON 時は通知時刻、OFF 時は「設定なし」。
  const notificationTimeRangeLabel = notifSummaryEnabled
    ? notifSummaryTime
    : t('settingsNotifTimeRangeNone');

  // 通知トグル: ON 時に OS 通知許可をリクエスト、拒否時は state を戻して案内。
  // OFF/ON いずれも triggerSummaryReschedule で当日まとめ通知を再予約 (OFF なら全 cancel)。
  const handleToggleNotification = React.useCallback(
    async (enabled: boolean) => {
      if (!enabled) {
        setNotifSummaryEnabled(false);
        void triggerSummaryReschedule(t);
        return;
      }
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotifSummaryEnabled(true);
        void triggerSummaryReschedule(t);
      } else {
        Alert.alert(
          t('settingsNotifPermissionDeniedTitle'),
          t('settingsNotifPermissionDeniedBody'),
        );
      }
    },
    [setNotifSummaryEnabled, t],
  );

  return (
    <SettingsSection title={t('settingsNotificationSection')}>
      {/* 行 1: 通知トグル */}
      <View
        style={[styles.entry, entryThemed]}
        testID="e2e_settings_notification_master_row"
        accessibilityLabel={t('settingsNotificationRowLabel')}
      >
        <View style={styles.rowInner}>
          <ThemedText type="defaultSemiBold">{t('settingsNotificationRowLabel')}</ThemedText>
          <Switch
            accessibilityRole="switch"
            accessibilityLabel={t('settingsNotificationRowLabel')}
            testID="e2e_settings_notification_master_toggle"
            value={notifSummaryEnabled}
            onValueChange={(v) => void handleToggleNotification(v)}
          />
        </View>
      </View>
      {/* 行 2: 通知時刻を変更 (通知 ON 時のみ表示)。タップでその場に OS 時刻ピッカーを開く。 */}
      {notifSummaryEnabled && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settingsNotifSummaryEditTime')}
          accessibilityValue={{ text: notificationTimeRangeLabel }}
          testID="e2e_settings_notifications_row"
          style={[styles.entry, entryThemed]}
          onPress={() => setShowTimePicker(true)}
        >
          <View style={styles.rowInner}>
            <ThemedText type="defaultSemiBold">{t('settingsNotifSummaryEditTime')}</ThemedText>
            <ThemedText style={styles.rowValue}>{notificationTimeRangeLabel}</ThemedText>
          </View>
        </Pressable>
      )}
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
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  entry: {
    padding: 16,
    borderBottomWidth: 1,
    gap: 6,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowValue: { fontSize: 14, opacity: 0.7 },
});
