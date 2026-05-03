/**
 * 設定画面 (F-11 着工で新規作成、Issue #12 / ADR-0007)。
 *
 * Related:
 * - Issue #12 F-11 (お引っ越し機能、本画面のエントリ実装)
 * - Issue #25 F-05 (気遣い型ポップアップ ON/OFF トグル)
 * - ADR-0007 (Repolog 方式 ZIP + Share Sheet)
 * - ADR-0011 (F-05 再定義)
 *
 * 設計方針:
 * - Stack route として `/settings` から到達 (タブ外に配置、ヘッダー戻るボタンで戻る)
 * - F-11 (バックアップ作成 / 復元) のエントリ + F-05 通知設定トグル
 * - 将来 (F-12 言語切替 / F-15 テーマ等) のエントリ追加は別 Issue
 * - 既存 Tab UI を弄らないために app/(tabs) の外に配置 (router.push('/settings') で開く)
 */
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import { requestNotificationPermission } from '@/src/features/notification/scheduler';
import { showAdPrivacyOptionsForm } from '@/src/services/adService';
import { useOnboardingStore } from '@/src/stores/onboardingStore';
import { useProStore } from '@/src/stores/proStore';
import { useSettingsStore } from '@/src/stores/settingsStore';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const eventOverloadEnabled = useSettingsStore((s) => s.eventOverloadEnabled);
  const setEventOverloadEnabled = useSettingsStore((s) => s.setEventOverloadEnabled);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const outdoorMode = useSettingsStore((s) => s.outdoorMode);
  const setOutdoorMode = useSettingsStore((s) => s.setOutdoorMode);
  // F-16 Phase B (Issue #30, ADR-0014): 通知設定 ON/OFF + 時刻表示
  const notifSummaryEnabled = useSettingsStore((s) => s.notificationDailySummaryEnabled);
  const setNotifSummaryEnabled = useSettingsStore((s) => s.setNotificationDailySummaryEnabled);
  const notifSummaryTime = useSettingsStore((s) => s.notificationDailySummaryTime);
  const notifWateringEnabled = useSettingsStore((s) => s.notificationWateringRepeatEnabled);
  const setNotifWateringEnabled = useSettingsStore((s) => s.setNotificationWateringRepeatEnabled);
  const notifWateringTimes = useSettingsStore((s) => s.notificationWateringRepeatTimes);
  const isPro = useProStore((s) => s.isPro);

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

  const handleAdPrivacyOptionsPress = React.useCallback(async () => {
    try {
      const shown = await showAdPrivacyOptionsForm();
      if (!shown) {
        Alert.alert(
          t('settingsAdPrivacyOptionsUnavailableTitle'),
          t('settingsAdPrivacyOptionsUnavailableBody'),
        );
      }
    } catch {
      Alert.alert(t('error'), t('settingsAdPrivacyOptionsFailedBody'));
    }
  }, [t]);

  // F-13 Phase 2d (Issue #20, ADR-0009 AC4-1): Settings からの「購入を復元」(Apple Review 3.1.1)
  const restorePro = useProStore((s) => s.restore);
  const [restoring, setRestoring] = React.useState(false);
  const handleRestorePress = React.useCallback(async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const result = await restorePro();
      Alert.alert(result.hasActive ? t('restoreSuccess') : t('restoreNotFound'));
    } catch {
      Alert.alert(t('restoreFailed'));
    } finally {
      setRestoring(false);
    }
  }, [restorePro, restoring, t]);

  const themeOptions: { value: 'system' | 'light' | 'dark'; labelKey: string }[] = [
    { value: 'system', labelKey: 'settingsThemeSystem' },
    { value: 'light', labelKey: 'settingsThemeLight' },
    { value: 'dark', labelKey: 'settingsThemeDark' },
  ];

  return (
    <ThemedView style={styles.container} testID="e2e_settings_screen">
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ThemedText type="title" style={styles.title}>
          {t('settingsTitle')}
        </ThemedText>

        {/* --- F-15 Phase A テーマ (Issue #32、ADR-0015) --- */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {t('settingsThemeSection')}
          </ThemedText>
          <View style={styles.themeRow} testID="e2e_theme_mode_row">
            {themeOptions.map((opt) => {
              const selected = themeMode === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t(opt.labelKey as Parameters<typeof t>[0])}
                  testID={`e2e_theme_mode_${opt.value}`}
                  style={[styles.themeChip, selected && styles.themeChipSelected]}
                  onPress={() => setThemeMode(opt.value)}
                >
                  <ThemedText
                    type={selected ? 'defaultSemiBold' : 'default'}
                    style={selected ? styles.themeChipTextSelected : undefined}
                  >
                    {t(opt.labelKey as Parameters<typeof t>[0])}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          {/* F-15 Phase B (Issue #32, ADR-0015): 屋外モード独立トグル (Phase C で本実装) */}
          <View style={styles.toggleRow} testID="e2e_outdoor_mode_row">
            <View style={styles.toggleLabelBox}>
              <ThemedText type="defaultSemiBold">{t('settingsOutdoorMode')}</ThemedText>
              <ThemedText style={styles.entryDesc}>{t('settingsOutdoorModeDesc')}</ThemedText>
            </View>
            <Switch
              accessibilityRole="switch"
              accessibilityLabel={t('settingsOutdoorMode')}
              testID="e2e_outdoor_mode_toggle"
              value={outdoorMode}
              onValueChange={setOutdoorMode}
            />
          </View>
        </View>

        {/* --- F-13 Phase 1b Pro / Paywall 導線 (Issue #20、ADR-0009) --- */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {t('settingsAccountSection')}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('proTitle')}
            testID="e2e_open_paywall"
            style={styles.entry}
            onPress={() => router.push('/pro' as Href)}
          >
            <View style={styles.proRow}>
              <ThemedText type="defaultSemiBold" style={styles.proRowLabel}>
                {isPro ? t('settingsAccountProActive') : t('proTitle')}
              </ThemedText>
              {isPro && (
                <View style={styles.proBadge} testID="e2e_settings_pro_badge">
                  <ThemedText style={styles.proBadgeText}>{t('proBadgeShort')}</ThemedText>
                </View>
              )}
            </View>
            <ThemedText style={styles.entryDesc}>
              {isPro ? t('settingsAccountProActiveDesc') : t('settingsAccountProInactiveDesc')}
            </ThemedText>
          </Pressable>

          {/* F-13 Phase 2d (Issue #20, ADR-0009 AC4-1): Settings からの購入復元 (Apple Review 3.1.1) */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsRestoreTitle')}
            testID="e2e_settings_restore_purchase"
            style={[styles.entry, restoring && styles.entryDisabled]}
            disabled={restoring}
            onPress={handleRestorePress}
          >
            <ThemedText type="defaultSemiBold">{t('settingsRestoreTitle')}</ThemedText>
            <ThemedText style={styles.entryDesc}>{t('settingsRestoreDesc')}</ThemedText>
          </Pressable>
        </View>

        {/* --- F-05 通知設定 (Issue #25、ADR-0011) --- */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {t('settingsNotificationSection')}
          </ThemedText>
          <View style={styles.toggleRow} testID="e2e_event_overload_toggle_row">
            <View style={styles.toggleLabelBox}>
              <ThemedText type="defaultSemiBold">{t('settingsEventOverloadToggle')}</ThemedText>
              <ThemedText style={styles.entryDesc}>
                {t('settingsEventOverloadToggleDesc')}
              </ThemedText>
            </View>
            <Switch
              accessibilityRole="switch"
              accessibilityLabel={t('settingsEventOverloadToggle')}
              testID="e2e_event_overload_toggle"
              value={eventOverloadEnabled}
              onValueChange={setEventOverloadEnabled}
            />
          </View>

          {/* F-16 Phase B (Issue #30, ADR-0014): 当日まとめ通知 + 水やり繰り返し通知トグル */}
          <View style={styles.toggleRow} testID="e2e_notif_summary_toggle_row">
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
            />
          </View>

          <View style={styles.toggleRow} testID="e2e_notif_watering_toggle_row">
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
            />
          </View>
        </View>

        {/* --- F-10 エクスポート Phase A (Issue #33、ADR-0016) --- */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {t('settingsExportSection')}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('exportCsvTitle')}
            testID="e2e_open_export_csv"
            style={styles.entry}
            onPress={() => router.push('/export/csv' as Href)}
          >
            <ThemedText type="defaultSemiBold">{t('exportCsvTitle')}</ThemedText>
            <ThemedText style={styles.entryDesc}>{t('exportCsvDesc')}</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('exportPdfTitle')}
            testID="e2e_open_export_pdf"
            style={styles.entry}
            onPress={() => router.push('/export/pdf' as Href)}
          >
            <ThemedText type="defaultSemiBold">{t('exportPdfTitle')}</ThemedText>
            <ThemedText style={styles.entryDesc}>{t('exportPdfDesc')}</ThemedText>
          </Pressable>
          {/* F-10 Phase K (Issue #33, ADR-0016 AC2 list_pdf): 全盆栽リスト PDF 導線 */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsExportListPdfTitle')}
            testID="e2e_open_export_list_pdf"
            style={styles.entry}
            onPress={() => router.push('/export/list-pdf' as Href)}
          >
            <ThemedText type="defaultSemiBold">{t('settingsExportListPdfTitle')}</ThemedText>
            <ThemedText style={styles.entryDesc}>{t('settingsExportListPdfDesc')}</ThemedText>
          </Pressable>
        </View>

        {/* --- F-09 検索 (Issue #31、ADR-0008 改訂) --- */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {t('settingsSearchSection')}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('searchAction')}
            testID="e2e_open_search"
            style={styles.entry}
            onPress={() => router.push('/search' as Href)}
          >
            <ThemedText type="defaultSemiBold">{t('searchAction')}</ThemedText>
            <ThemedText style={styles.entryDesc}>{t('searchDesc')}</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('tagsManagerTitle')}
            testID="e2e_open_tags"
            style={styles.entry}
            onPress={() => router.push('/tags' as Href)}
          >
            <ThemedText type="defaultSemiBold">{t('tagsManagerTitle')}</ThemedText>
            <ThemedText style={styles.entryDesc}>{t('tagsManagerDesc')}</ThemedText>
          </Pressable>
        </View>

        {/* --- F-LEGAL-001 Phase A 広告のプライバシー設定 (Issue #37、ADR-0017、Free のみ表示) --- */}
        {!isPro && (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              {t('settingsAdPrivacySection')}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('settingsAdPrivacyOptionsTitle')}
              testID="e2e_open_ad_privacy_options"
              style={styles.entry}
              onPress={handleAdPrivacyOptionsPress}
            >
              <ThemedText type="defaultSemiBold">{t('settingsAdPrivacyOptionsTitle')}</ThemedText>
              <ThemedText style={styles.entryDesc}>{t('settingsAdPrivacyOptionsDesc')}</ThemedText>
            </Pressable>
          </View>
        )}

        {/* --- F-11 お引っ越し --- */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {t('settingsBackupSection')}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('backupExportTitle')}
            testID="e2e_open_backup_export"
            style={styles.entry}
            onPress={() => router.push('/backup/export' as Href)}
          >
            <ThemedText type="defaultSemiBold">{t('backupExportTitle')}</ThemedText>
            <ThemedText style={styles.entryDesc}>{t('backupExportDesc')}</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('backupImportTitle')}
            testID="e2e_open_backup_import"
            style={styles.entry}
            onPress={() => router.push('/backup/import' as Href)}
          >
            <ThemedText type="defaultSemiBold">{t('backupImportTitle')}</ThemedText>
            <ThemedText style={styles.entryDesc}>{t('backupImportDesc')}</ThemedText>
          </Pressable>
        </View>

        {/* --- F-26 Phase H ヘルプ (Issue #26、ADR-0018): チュートリアル再表示 --- */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {t('settingsHelpSection')}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsTutorialReplayTitle')}
            testID="e2e_open_tutorial_replay"
            style={styles.entry}
            onPress={() => {
              // resetTutorial() で tut1-5 をリセット → /onboarding/tut/tut1 へ
              useOnboardingStore.getState().resetTutorial();
              useOnboardingStore.getState().setCompleted(false);
              router.push('/onboarding/tut/tut1' as Href);
            }}
          >
            <ThemedText type="defaultSemiBold">{t('settingsTutorialReplayTitle')}</ThemedText>
            <ThemedText style={styles.entryDesc}>{t('settingsTutorialReplayDesc')}</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  title: { marginBottom: 8 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 14, opacity: 0.7, textTransform: 'uppercase' },
  entry: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 6,
  },
  entryDesc: { fontSize: 13, opacity: 0.7, lineHeight: 18 },
  entryDisabled: { opacity: 0.6 },
  toggleRow: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleLabelBox: { flex: 1, gap: 4 },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  themeChipSelected: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  themeChipTextSelected: { color: '#FFFFFF' },
  proRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proRowLabel: { flex: 1 },
  proBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#2E7D32',
  },
  proBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
});
