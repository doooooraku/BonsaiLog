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
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import { findLanguageOption } from '@/src/core/i18n/languageOptions';
import { ACCENT_GOLD, BORDER_DEFAULT, ON_BRAND } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { formatDateToHhmm, parseHhmmToDate } from '@/src/features/notification/notificationTime';
import { requestNotificationPermission } from '@/src/features/notification/scheduler';
import { SearchHeader } from '@/src/features/bonsai/SearchHeader';
import { clearAllData, seedTestData } from '@/src/dev/seedTestData';
import { showAdPrivacyOptionsForm } from '@/src/services/adService';
import { useOnboardingStore } from '@/src/stores/onboardingStore';
import { useProStore } from '@/src/stores/proStore';
import { useSettingsStore } from '@/src/stores/settingsStore';

export default function SettingsScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const eventOverloadEnabled = useSettingsStore((s) => s.eventOverloadEnabled);
  const setEventOverloadEnabled = useSettingsStore((s) => s.setEventOverloadEnabled);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
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
  const isPro = useProStore((s) => s.isPro);
  const planType = useProStore((s) => s.planType);

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

  // Phase 1.6-T6 (Issue #330 A1): mockup v1.0 SettingsScreen「テーマ」行を
  // 3 chip 横並びから 1 行 list (label / value / chevron) + Alert ダイアログに変更。
  // themeMode 3 種 (system/light/dark) は維持、UI 表現のみ整合。
  const currentThemeLabel = React.useMemo(() => {
    const opt = themeOptions.find((o) => o.value === themeMode);
    return opt ? t(opt.labelKey as Parameters<typeof t>[0]) : '';
    // themeOptions は labelKey が変わらない限り再計算不要、配列リテラル毎回新規だが
    // 中身は固定。t / themeMode のみ依存とする。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeMode, t]);

  // Phase 1.6-T6 (Issue #330 A3): mockup v1.0 SettingsScreen「言語 日本語 ›」 整合のため、
  // 現在の言語の native 表記を value 表示する。
  const currentLanguageLabel = React.useMemo(() => {
    return findLanguageOption(lang)?.native ?? lang;
  }, [lang]);

  const handleThemePress = React.useCallback(() => {
    Alert.alert(t('settingsThemeRowLabel'), undefined, [
      ...themeOptions.map((opt) => ({
        text: t(opt.labelKey as Parameters<typeof t>[0]),
        onPress: () => setThemeMode(opt.value),
      })),
      { text: t('cancel'), style: 'cancel' as const },
    ]);
    // themeOptions は ref 不変 (上記コメント参照)、setThemeMode は store action で安定
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, setThemeMode]);

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_settings_screen"
    >
      {/* ADR-0020 Phase 7 / Issue #255: SearchHeader (タイトル「設定」+ 検索)。
          設定タブ自身では Cog 遷移ボタンは不要のため showSettings={false}。
          屋外モードは下の独立トグル (toggleRow) に集約。 */}
      <SearchHeader
        title={t('tabSettings')}
        testIdSuffix="settings"
        showSearch={false}
        showSettings={false}
      />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* === Phase 1.6-T3 (Issue #330): mockup v1.0 SettingsScreen 8 セクション順序整合 ===
            1. アカウント・プラン → 2. 表示 → 3. 通知 → 4. アーカイブ → 5. 書き出し
            → 6. バックアップ → 7. その他 (法令) → 8. バージョン
            実機固有 (検索 / ヘルプ / DEV) は末尾に配置。 */}

        {/* --- 1. F-13 Phase 1b Pro / Paywall 導線 (Issue #20、ADR-0009) --- */}
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
                {planType === 'lifetime'
                  ? t('settingsAccountProLifetimeTitle')
                  : isPro
                    ? t('settingsAccountProActive')
                    : t('proTitle')}
              </ThemedText>
              {isPro && (
                <View style={styles.proBadge} testID="e2e_settings_pro_badge">
                  <ThemedText style={styles.proBadgeText}>{t('proBadgeShort')}</ThemedText>
                </View>
              )}
            </View>
            <ThemedText style={styles.entryDesc}>
              {planType === 'lifetime'
                ? t('settingsAccountProLifetimeDesc')
                : isPro
                  ? t('settingsAccountProActiveDesc')
                  : t('settingsAccountProInactiveDesc')}
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

        {/* --- 2. F-15 表示 (テーマ、Issue #32、ADR-0015) + 言語 (ADR-0004) --- */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {t('settingsThemeSection')}
          </ThemedText>
          {/* Phase 1.6-T6 (Issue #330 A3): mockup v1.0「言語 日本語 ›」整合。
              タップで /settings/language に遷移、現在の言語の native 表記を value 表示。 */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsLanguageRowLabel')}
            accessibilityValue={{ text: currentLanguageLabel }}
            testID="e2e_settings_language_row"
            style={styles.entry}
            onPress={() => router.push('/settings/language' as Href)}
          >
            <View style={styles.rowInner}>
              <ThemedText type="defaultSemiBold">{t('settingsLanguageRowLabel')}</ThemedText>
              <View style={styles.rowRight}>
                <ThemedText style={styles.rowValue}>{currentLanguageLabel}</ThemedText>
                <ThemedText style={styles.chevron}>›</ThemedText>
              </View>
            </View>
          </Pressable>
          {/* Phase 1.6-T6 (Issue #330 A1): mockup v1.0 「テーマ システム設定に従う ›」 整合の
              1 行 list 形式。タップで Alert ダイアログを開き、3 mode から選択する。 */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsThemeRowLabel')}
            accessibilityValue={{ text: currentThemeLabel }}
            testID="e2e_theme_mode_row"
            style={styles.entry}
            onPress={handleThemePress}
          >
            <View style={styles.rowInner}>
              <ThemedText type="defaultSemiBold">{t('settingsThemeRowLabel')}</ThemedText>
              <View style={styles.rowRight}>
                <ThemedText style={styles.rowValue}>{currentThemeLabel}</ThemedText>
                <ThemedText style={styles.chevron}>›</ThemedText>
              </View>
            </View>
          </Pressable>
        </View>

        {/* --- 3. F-05 通知設定 (Issue #25、ADR-0011) --- */}
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
          {/* F-16 Phase C (Issue #30): 通知時刻変更 (DateTimePicker)、ON 時のみ表示 */}
          {notifSummaryEnabled && (
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

        {/* --- 4. アーカイブ (Phase 1.6-T3 新規、Issue #330 AC) --- */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {t('settingsArchiveSection')}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsArchiveTitle')}
            testID="e2e_open_archive"
            style={styles.entry}
            onPress={() => {
              Alert.alert(t('settingsArchiveTitle'), t('settingsArchiveDesc'));
            }}
          >
            <ThemedText type="defaultSemiBold">{t('settingsArchiveTitle')}</ThemedText>
            <ThemedText style={styles.entryDesc}>{t('settingsArchiveDesc')}</ThemedText>
          </Pressable>
        </View>

        {/* --- 5. F-10 書き出し Phase A (Issue #33、ADR-0016) --- */}
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

        {/* --- 6. F-11 バックアップ (Phase 1.6-T3 で位置変更、お引っ越し → バックアップ) --- */}
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

        {/* --- 7. その他/法令 (Phase 1.6-T3 新規、Issue #330 AC) --- */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {t('settingsLegalSection')}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsLegalTerms')}
            testID="e2e_open_legal_terms"
            style={styles.entry}
            onPress={() => {
              Alert.alert(t('settingsLegalTerms'), 'docs/legal/terms.md (準備中)');
            }}
          >
            <ThemedText type="defaultSemiBold">{t('settingsLegalTerms')}</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsLegalPrivacy')}
            testID="e2e_open_legal_privacy"
            style={styles.entry}
            onPress={() => {
              Alert.alert(t('settingsLegalPrivacy'), 'docs/legal/privacy.md (準備中)');
            }}
          >
            <ThemedText type="defaultSemiBold">{t('settingsLegalPrivacy')}</ThemedText>
          </Pressable>
          {/* AdMob プライバシーオプション (Free のみ表示、既存 F-LEGAL-001 Phase A 流用) */}
          {!isPro && (
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
          )}
        </View>

        {/* --- 8. バージョン (Phase 1.6-T3 新規、Issue #330 AC) --- */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {t('settingsVersionSection')}
          </ThemedText>
          <View style={styles.entry} testID="e2e_settings_version_row">
            <ThemedText type="defaultSemiBold">{t('settingsVersionLabel')}</ThemedText>
            <ThemedText style={styles.entryDesc}>1.0.0</ThemedText>
          </View>
        </View>

        {/* --- (実機固有) F-09 検索 (Issue #31、ADR-0008 改訂) --- */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {t('settingsSearchSection')}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('searchAction')}
            testID="e2e_open_search"
            style={styles.entry}
            onPress={() => router.push('/(tabs)/look-back/search' as Href)}
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

        {/* --- (実機固有) F-26 Phase H ヘルプ (Issue #26、ADR-0018): チュートリアル再表示 --- */}
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

        {/* __DEV__ 限定: 開発者セクション (T1-4 / Issue #355、ui-diff pipeline 用テストデータ投入)。
            production build には含まれない (Babel が __DEV__ === false で枝刈り)。 */}
        {__DEV__ && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              [DEV] テストデータ
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="seed test data"
              testID="e2e_dev_seed_button"
              style={styles.entry}
              onPress={async () => {
                try {
                  const result = await seedTestData();
                  if (result.skipped === 'already_seeded') {
                    Alert.alert(
                      'テストデータ',
                      `既に ${result.bonsaiCount} 件の盆栽があります。先に「全データ削除」してから再投入してください。`,
                    );
                  } else {
                    Alert.alert(
                      'テストデータ投入完了',
                      `盆栽 ${result.bonsaiCount} 件 / 写真 ${result.photoCount} 枚 / 記録 ${result.eventCount} 件`,
                    );
                  }
                } catch (err) {
                  Alert.alert('seed エラー', String(err));
                }
              }}
            >
              <ThemedText type="defaultSemiBold">テストデータを投入</ThemedText>
              <ThemedText style={styles.entryDesc}>
                盆栽 3 件 + 写真 2 枚 + タグ 3 件 + 水やり記録 15 件
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="clear all data"
              testID="e2e_dev_clear_button"
              style={styles.entry}
              onPress={() => {
                Alert.alert(
                  '全データ削除',
                  '盆栽 / 写真 / タグ / 記録をすべて削除します。樹種マスタ (50 種) は残ります。',
                  [
                    { text: 'キャンセル', style: 'cancel' },
                    {
                      text: '削除',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await clearAllData();
                          Alert.alert('削除完了', '全データを削除しました。');
                        } catch (err) {
                          Alert.alert('削除エラー', String(err));
                        }
                      },
                    },
                  ],
                );
              }}
            >
              <ThemedText type="defaultSemiBold">全データ削除</ThemedText>
              <ThemedText style={styles.entryDesc}>
                盆栽 / 写真 / タグ / 記録をリセット (確認 Alert あり)
              </ThemedText>
            </Pressable>
            {/* Phase 1.5-T5: ui-diff onboarding-welcome flow 用 reset (__DEV__ 限定、本番では枝刈り)。
                onboarding.completed=false に戻して /onboarding/welcome に遷移する。 */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="reset onboarding"
              testID="e2e_dev_reset_onboarding"
              style={styles.entry}
              onPress={() => {
                useOnboardingStore.getState().resetTutorial();
                useOnboardingStore.getState().setCompleted(false);
                router.replace('/onboarding/welcome' as Href);
              }}
            >
              <ThemedText type="defaultSemiBold">Onboarding をリセット</ThemedText>
              <ThemedText style={styles.entryDesc}>
                onboarding.completed=false に戻して Welcome 画面を再表示 (ui-diff flow 用)
              </ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // backgroundColor は useColors の c.background で動的指定
  container: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  title: { marginBottom: 8 },
  section: { gap: 12 },
  // mockup v1.0 monetization-screens.jsx SettingsScreen SectionHeader 整合 (C1 PR、mono 風 small caps)
  sectionTitle: { fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.5 },
  entry: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    gap: 6,
  },
  entryDesc: { fontSize: 13, opacity: 0.7, lineHeight: 18 },
  entryDisabled: { opacity: 0.6 },
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
  // Phase 1.6-T6 (Issue #330 A1): list-row 共通 style (label / value / chevron)。
  // A4 で他行にも展開予定。
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: 14, opacity: 0.7 },
  chevron: { fontSize: 18, opacity: 0.5, lineHeight: 18 },
  proRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proRowLabel: { flex: 1 },
  proBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: ACCENT_GOLD,
  },
  proBadgeText: { color: ON_BRAND, fontSize: 11, fontWeight: '700' },
});
