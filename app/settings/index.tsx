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
import { useTranslation, setPseudoMode, getPseudoMode } from '@/src/core/i18n/i18n';
import { findLanguageOption } from '@/src/core/i18n/languageOptions';
import { ACCENT_GOLD, BG_SURFACE, BORDER_DEFAULT, ON_BRAND } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { countArchivedBonsai } from '@/src/db/bonsaiRepository';
import { countAllTags } from '@/src/db/tagRepository';
import { SearchHeader } from '@/src/features/bonsai/SearchHeader';
import { clearAllData, seedTestData, seedTestDataEn } from '@/src/dev/seedTestData';
import { requestNotificationPermission } from '@/src/features/notification/scheduler';
import { triggerSummaryReschedule } from '@/src/features/notification/triggerReschedule';
import { showAdPrivacyOptionsForm } from '@/src/services/adService';
import { useOnboardingStore } from '@/src/stores/onboardingStore';
import { useProStore } from '@/src/stores/proStore';
import { useSettingsStore } from '@/src/stores/settingsStore';

/**
 * Phase 1.6-T6 (Issue #330 A4-2): mockup v1.0 整合の section wrapper。
 * section header (mono uppercase) → white surface card (radius 12 + overflow hidden) +
 * 内部 entries の構造を統一。`type` で section title type を切替 (DEV は subtitle)。
 */
function SettingsSection({
  title,
  titleType = 'defaultSemiBold',
  children,
}: {
  title: string;
  titleType?: 'defaultSemiBold' | 'subtitle';
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <ThemedText type={titleType} style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  // ADR-0014 Amended: 通知は当日まとめ 1 系統に集約、トグルも 1 つ (master + summary 統合)
  const notifSummaryEnabled = useSettingsStore((s) => s.notificationDailySummaryEnabled);
  const setNotifSummaryEnabled = useSettingsStore((s) => s.setNotificationDailySummaryEnabled);
  const notifSummaryTime = useSettingsStore((s) => s.notificationDailySummaryTime);
  const isPro = useProStore((s) => s.isPro);
  const planType = useProStore((s) => s.planType);

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

  // Issue #457 Phase 5: アーカイブ済み盆栽 件数を画面表示時に取得 (mockup `settings-tab-01.png`
  // の row right value 整合「3 件」)。取得失敗時は 0 のままで UI 影響なし。
  const [archivedCount, setArchivedCount] = React.useState<number>(0);
  // Sess9 PR-5: タグ件数を「タグを管理」 行 right value に表示 (アーカイブ盆栽と同パターン)
  const [tagCount, setTagCount] = React.useState<number>(0);
  React.useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const [archived, tags] = await Promise.all([countArchivedBonsai(), countAllTags()]);
        if (mounted) {
          setArchivedCount(archived);
          setTagCount(tags);
        }
      } catch {
        // count 取得失敗は 0 のまま (UX 影響少)
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
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

  // ADR-0014 Amended: 通知は当日まとめ 1 系統のみ。ON 時は通知時刻、OFF 時は「設定なし」。
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

  // Sess14 PR-L: 鉢サイズ単位 (cm/mm/inch) row。 themeOptions と同 pattern (Alert + 3 choice)。
  const potUnit = useSettingsStore((s) => s.potUnit);
  const setPotUnit = useSettingsStore((s) => s.setPotUnit);
  const potUnitOptions: { value: 'cm' | 'mm' | 'inch'; labelKey: string }[] = [
    { value: 'cm', labelKey: 'settingsPotUnitCm' },
    { value: 'mm', labelKey: 'settingsPotUnitMm' },
    { value: 'inch', labelKey: 'settingsPotUnitInch' },
  ];
  const currentPotUnitLabel = React.useMemo(() => {
    const opt = potUnitOptions.find((o) => o.value === potUnit);
    return opt ? t(opt.labelKey as Parameters<typeof t>[0]) : potUnit;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [potUnit, t]);
  const handlePotUnitPress = React.useCallback(() => {
    Alert.alert(t('settingsPotUnit'), undefined, [
      ...potUnitOptions.map((opt) => ({
        text: t(opt.labelKey as Parameters<typeof t>[0]),
        onPress: () => setPotUnit(opt.value),
      })),
      { text: t('cancel'), style: 'cancel' as const },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, setPotUnit]);

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_settings_screen"
    >
      {/* ADR-0020 Phase 7 / Issue #255: SearchHeader (タイトル「設定」+ 検索)。
          設定タブ自身では Cog 遷移ボタンは不要のため showSettings={false}。 */}
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

        {/* --- 1. F-13 Phase 1b Pro / Paywall 導線 (Issue #20、ADR-0009) ---
            Issue #457 Phase 2: mockup `settings-tab-01.png` 整合の 1 行 row レイアウト
            (label 「プラン」 + Free/Lifetime badge + Upgrade CTA badge)。
            旧 2 行 stacked (title + entryDesc) は廃止。 */}
        <SettingsSection title={t('settingsAccountSection')}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('proTitle')}
            testID="e2e_open_paywall"
            style={styles.entry}
            onPress={() => router.push('/pro' as Href)}
          >
            <View style={styles.rowInner}>
              <ThemedText type="defaultSemiBold">{t('settingsPlanLabel')}</ThemedText>
              <View style={styles.rowRight}>
                <View
                  style={[styles.planStatusBadge, isPro && styles.planStatusBadgePro]}
                  testID="e2e_settings_plan_status_badge"
                >
                  <ThemedText
                    style={[styles.planStatusBadgeText, isPro && styles.planStatusBadgeTextPro]}
                  >
                    {planType === 'lifetime'
                      ? t('proPlanLifetimeTitle')
                      : isPro
                        ? t('proBadgeShort')
                        : t('proPlanFreeTitle')}
                  </ThemedText>
                </View>
                {!isPro && (
                  <View style={styles.planUpgradeBadge} testID="e2e_settings_plan_upgrade_cta">
                    <ThemedText style={styles.planUpgradeBadgeText}>
                      {t('settingsPlanUpgradeBadge')}
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
          </Pressable>

          {/* F-13 Phase 2d (Issue #20, ADR-0009 AC4-1): Settings からの購入復元 (Apple Review 3.1.1) */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsRestoreTitle')}
            accessibilityHint={t('settingsRestoreDesc')}
            testID="e2e_settings_restore_purchase"
            style={[styles.entry, restoring && styles.entryDisabled]}
            disabled={restoring}
            onPress={handleRestorePress}
          >
            <View style={styles.rowInner}>
              <ThemedText type="defaultSemiBold">{t('settingsRestoreTitle')}</ThemedText>
              <ThemedText style={styles.chevron}>›</ThemedText>
            </View>
          </Pressable>
        </SettingsSection>

        {/* --- 2. F-15 表示 (テーマ、Issue #32、ADR-0015) + 言語 (ADR-0004) --- */}
        <SettingsSection title={t('settingsThemeSection')}>
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
          {/* Sess14 PR-L: 鉢サイズ単位 (cm/mm/inch) 3-segment row。 言語/テーマの下に配置。 */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsPotUnit')}
            accessibilityValue={{ text: potUnit }}
            testID="e2e_pot_unit_row"
            style={styles.entry}
            onPress={handlePotUnitPress}
          >
            <View style={styles.rowInner}>
              <ThemedText type="defaultSemiBold">{t('settingsPotUnit')}</ThemedText>
              <View style={styles.rowRight}>
                <ThemedText style={styles.rowValue}>{currentPotUnitLabel}</ThemedText>
                <ThemedText style={styles.chevron}>›</ThemedText>
              </View>
            </View>
          </Pressable>
        </SettingsSection>

        {/* --- 3. F-16 通知設定 (Issue #30、ADR-0014 Amended) ---
            通知は当日まとめ 1 系統に集約。トグルも 1 つ (旧 master + summary 統合)。
            行 1: 「通知 [Switch]」 — ON 時に OS 許可をリクエスト (デフォルト OFF)
            行 2: 「通知時刻 [HH:MM] ›」 — ON 時のみ表示、タップでサブ画面 /settings/notifications。 */}
        <SettingsSection title={t('settingsNotificationSection')}>
          {/* 行 1: 通知トグル */}
          <View
            style={styles.entry}
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
          {/* 行 2: 通知時刻 (サブ画面遷移)、通知 ON 時のみ表示 */}
          {notifSummaryEnabled && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('settingsNotifSummaryEditTime')}
              accessibilityValue={{ text: notificationTimeRangeLabel }}
              testID="e2e_settings_notifications_row"
              style={styles.entry}
              onPress={() => router.push('/settings/notifications' as Href)}
            >
              <View style={styles.rowInner}>
                <ThemedText type="defaultSemiBold">{t('settingsNotifSummaryEditTime')}</ThemedText>
                <View style={styles.rowRight}>
                  <ThemedText style={styles.rowValue}>{notificationTimeRangeLabel}</ThemedText>
                  <ThemedText style={styles.chevron}>›</ThemedText>
                </View>
              </View>
            </Pressable>
          )}
        </SettingsSection>

        {/* --- 4. アーカイブ (Phase 1.6-T3 新規、Issue #330 AC) --- */}
        <SettingsSection title={t('settingsArchiveSection')}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsArchiveTitle')}
            accessibilityHint={t('settingsArchiveDesc')}
            testID="e2e_open_archive"
            style={styles.entry}
            onPress={() => router.push('/settings/archived' as Href)}
          >
            <View style={styles.rowInner}>
              <ThemedText type="defaultSemiBold">{t('settingsArchiveTitle')}</ThemedText>
              <View style={styles.rowRight}>
                <ThemedText style={styles.rowValue} testID="e2e_archived_count_value">
                  {t('settingsArchivedCountValue').replace('{count}', String(archivedCount))}
                </ThemedText>
                <ThemedText style={styles.chevron}>›</ThemedText>
              </View>
            </View>
          </Pressable>
        </SettingsSection>

        {/* --- 5. F-10 書き出し Phase A (Issue #33、ADR-0016) ---
            mockup v1.0「CSV エクスポート PRO」「PDF エクスポート PRO」整合の
            label + PRO badge + chevron 構造。Pro 制限ロジックは export/* 各画面側 */}
        <SettingsSection title={t('settingsExportSection')}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('exportCsvTitle')}
            accessibilityHint={t('exportCsvDesc')}
            testID="e2e_open_export_csv"
            style={styles.entry}
            onPress={() => router.push('/export/csv' as Href)}
          >
            <View style={styles.rowInner}>
              <ThemedText type="defaultSemiBold">{t('exportCsvTitle')}</ThemedText>
              <View style={styles.rowRight}>
                <View style={styles.proBadgeRow}>
                  <ThemedText style={styles.proBadgeRowText}>{t('proBadgeShort')}</ThemedText>
                </View>
                <ThemedText style={styles.chevron}>›</ThemedText>
              </View>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('exportPdfTitle')}
            accessibilityHint={t('exportPdfDesc')}
            testID="e2e_open_export_pdf"
            style={styles.entry}
            onPress={() => router.push('/export/pdf' as Href)}
          >
            <View style={styles.rowInner}>
              <ThemedText type="defaultSemiBold">{t('exportPdfTitle')}</ThemedText>
              <View style={styles.rowRight}>
                <View style={styles.proBadgeRow}>
                  <ThemedText style={styles.proBadgeRowText}>{t('proBadgeShort')}</ThemedText>
                </View>
                <ThemedText style={styles.chevron}>›</ThemedText>
              </View>
            </View>
          </Pressable>
          {/* F-10 Phase K (Issue #33, ADR-0016 AC2 list_pdf): 全盆栽リスト PDF 導線 */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsExportListPdfTitle')}
            accessibilityHint={t('settingsExportListPdfDesc')}
            testID="e2e_open_export_list_pdf"
            style={styles.entry}
            onPress={() => router.push('/export/list-pdf' as Href)}
          >
            <View style={styles.rowInner}>
              <ThemedText type="defaultSemiBold">{t('settingsExportListPdfTitle')}</ThemedText>
              <View style={styles.rowRight}>
                <View style={styles.proBadgeRow}>
                  <ThemedText style={styles.proBadgeRowText}>{t('proBadgeShort')}</ThemedText>
                </View>
                <ThemedText style={styles.chevron}>›</ThemedText>
              </View>
            </View>
          </Pressable>
        </SettingsSection>

        {/* --- 6. F-11 バックアップ (Phase 1.6-T3 で位置変更、お引っ越し → バックアップ) --- */}
        <SettingsSection title={t('settingsBackupSection')}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('backupExportTitle')}
            accessibilityHint={t('backupExportDesc')}
            testID="e2e_open_backup_export"
            style={styles.entry}
            onPress={() => router.push('/backup/export' as Href)}
          >
            <View style={styles.rowInner}>
              <ThemedText type="defaultSemiBold">{t('backupExportTitle')}</ThemedText>
              <ThemedText style={styles.chevron}>›</ThemedText>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('backupImportTitle')}
            accessibilityHint={t('backupImportDesc')}
            testID="e2e_open_backup_import"
            style={styles.entry}
            onPress={() => router.push('/backup/import' as Href)}
          >
            <View style={styles.rowInner}>
              <ThemedText type="defaultSemiBold">{t('backupImportTitle')}</ThemedText>
              <ThemedText style={styles.chevron}>›</ThemedText>
            </View>
          </Pressable>
        </SettingsSection>

        {/* --- 7. その他/法令 (Phase 1.6-T3 新規、Issue #330 AC) --- */}
        <SettingsSection title={t('settingsLegalSection')}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsLegalTerms')}
            testID="e2e_open_legal_terms"
            style={styles.entry}
            onPress={() => {
              Alert.alert(t('settingsLegalTerms'), 'docs/legal/terms.md (準備中)');
            }}
          >
            <View style={styles.rowInner}>
              <ThemedText type="defaultSemiBold">{t('settingsLegalTerms')}</ThemedText>
              <ThemedText style={styles.chevron}>›</ThemedText>
            </View>
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
            <View style={styles.rowInner}>
              <ThemedText type="defaultSemiBold">{t('settingsLegalPrivacy')}</ThemedText>
              <ThemedText style={styles.chevron}>›</ThemedText>
            </View>
          </Pressable>
          {/* AdMob プライバシーオプション (Free のみ表示、既存 F-LEGAL-001 Phase A 流用) */}
          {!isPro && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('settingsAdPrivacyOptionsTitle')}
              accessibilityHint={t('settingsAdPrivacyOptionsDesc')}
              testID="e2e_open_ad_privacy_options"
              style={styles.entry}
              onPress={handleAdPrivacyOptionsPress}
            >
              <View style={styles.rowInner}>
                <ThemedText type="defaultSemiBold">{t('settingsAdPrivacyOptionsTitle')}</ThemedText>
                <ThemedText style={styles.chevron}>›</ThemedText>
              </View>
            </Pressable>
          )}
        </SettingsSection>

        {/* --- 8. バージョン (Phase 1.6-T3 新規、Issue #330 AC) ---
            mockup v1.0「アプリバージョン 1.0.0」整合の label + value 行 (chevron 無し、read-only)。 */}
        <SettingsSection title={t('settingsVersionSection')}>
          <View style={styles.entry} testID="e2e_settings_version_row">
            <View style={styles.rowInner}>
              <ThemedText type="defaultSemiBold">{t('settingsVersionLabel')}</ThemedText>
              <ThemedText style={styles.rowValue}>1.0.0</ThemedText>
            </View>
          </View>
        </SettingsSection>

        {/* --- (実機固有) F-09 検索 (Issue #31、ADR-0008 改訂) --- */}
        <SettingsSection title={t('settingsSearchSection')}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('searchAction')}
            accessibilityHint={t('searchDesc')}
            testID="e2e_open_search"
            style={styles.entry}
            onPress={() => router.push('/(tabs)/look-back/search' as Href)}
          >
            <View style={styles.rowInner}>
              <ThemedText type="defaultSemiBold">{t('searchAction')}</ThemedText>
              <ThemedText style={styles.chevron}>›</ThemedText>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('tagsManagerTitle')}
            accessibilityHint={t('tagsManagerDesc')}
            testID="e2e_open_tags"
            style={styles.entry}
            onPress={() => router.push('/tags' as Href)}
          >
            <View style={styles.rowInner}>
              <ThemedText type="defaultSemiBold">{t('tagsManagerTitle')}</ThemedText>
              <View style={styles.rowRight}>
                <ThemedText style={styles.rowValue} testID="e2e_tags_count_value">
                  {t('settingsTagsCountValue').replace('{count}', String(tagCount))}
                </ThemedText>
                <ThemedText style={styles.chevron}>›</ThemedText>
              </View>
            </View>
          </Pressable>
        </SettingsSection>

        {/* --- (実機固有) F-26 Phase H ヘルプ (Issue #26、ADR-0018): チュートリアル再表示 --- */}
        <SettingsSection title={t('settingsHelpSection')}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsTutorialReplayTitle')}
            accessibilityHint={t('settingsTutorialReplayDesc')}
            testID="e2e_open_tutorial_replay"
            style={styles.entry}
            onPress={() => {
              // resetTutorial() で tut1-5 をリセット → /onboarding/tut/tut1 へ
              useOnboardingStore.getState().resetTutorial();
              useOnboardingStore.getState().setCompleted(false);
              router.push('/onboarding/tut/tut1' as Href);
            }}
          >
            <View style={styles.rowInner}>
              <ThemedText type="defaultSemiBold">{t('settingsTutorialReplayTitle')}</ThemedText>
              <ThemedText style={styles.chevron}>›</ThemedText>
            </View>
          </Pressable>
        </SettingsSection>

        {/* __DEV__ 限定 + ui-diff pipeline preview build 用 unlock (Sess2 PR-4、2026-05-17):
            preview-local-apk profile では `__DEV__=false` (Release config) のため seed button が消える。
            EXPO_PUBLIC_SEED_FORCE=1 (eas.json で preview-local-apk のみ設定) で unlock し、
            ui-diff Maestro flow が seed 投入を実行できるようにする。
            production build (eas.json で env 未設定) では枝刈りされ含まれない。 */}
        {(__DEV__ || process.env.EXPO_PUBLIC_SEED_FORCE === '1') && (
          <SettingsSection title="[DEV] テストデータ" titleType="subtitle">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="seed test data (Japanese)"
              testID="e2e_dev_seed_button"
              style={styles.entry}
              onPress={async () => {
                try {
                  const result = await seedTestData();
                  if (result.skipped === 'already_seeded') {
                    Alert.alert(
                      'テストデータ',
                      `既に ${result.bonsaiCount} 件の盆栽があります。 先に「全データ削除」 してから再投入してください。`,
                    );
                  } else {
                    Alert.alert(
                      'テストデータ投入完了',
                      `盆栽 ${result.bonsaiCount} 件 (+ アーカイブ ${result.archivedCount}) / 写真 ${result.photoCount} 枚 / 記録 ${result.eventCount} 件 (+ ゴミ箱 ${result.trashedCount})`,
                    );
                  }
                } catch (err) {
                  Alert.alert('seed エラー', String(err));
                }
              }}
            >
              <ThemedText type="defaultSemiBold">テストデータを投入 (日本語)</ThemedText>
              <ThemedText style={styles.entryDesc}>
                盆栽 11 件 (active 10 + archived 1) + 写真 9 枚 + タグ 8 件 + 全 13 種 events 約 80+
                件
              </ThemedText>
            </Pressable>
            {/* Sess10 PR-2: 英語版テストデータ (Marcus persona / Western 名前 / 英語 dialog)。
                既存 Maestro flow は JA 名前依存のため、 EN 投入は demo / SS 撮影 / 英語 UX 確認用。 */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="seed test data (English)"
              testID="e2e_dev_seed_en_button"
              style={styles.entry}
              onPress={async () => {
                try {
                  const result = await seedTestDataEn();
                  if (result.skipped === 'already_seeded') {
                    Alert.alert(
                      'Test data',
                      `${result.bonsaiCount} bonsai already exist. Please clear all data first.`,
                    );
                  } else {
                    Alert.alert(
                      'Test data inserted',
                      `${result.bonsaiCount} bonsai (+ ${result.archivedCount} archived) / ${result.photoCount} photos / ${result.eventCount} records (+ ${result.trashedCount} trashed)`,
                    );
                  }
                } catch (err) {
                  Alert.alert('Seed error', String(err));
                }
              }}
            >
              <ThemedText type="defaultSemiBold">Insert test data (English)</ThemedText>
              <ThemedText style={styles.entryDesc}>
                11 bonsai (10 active + 1 archived) + 9 photos + 8 tags + ~80 records (all 13 event
                types)
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
            {/* Sess20 PR-0.5 (ADR-0033 D4): Pseudo-localization toggle (__DEV__ only)。
                全 string を [xx-{原文}-xx] で 2 倍長化、 UI 崩れ (overflow / 文字切れ) 事前検出。
                本番 build (__DEV__=false) では完全無効。 */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="toggle pseudo-localization"
              testID="e2e_dev_pseudo_toggle"
              style={styles.entry}
              onPress={() => {
                const current = getPseudoMode();
                setPseudoMode(!current);
                Alert.alert(
                  'Pseudo-loc',
                  current
                    ? 'OFF: 通常表示に戻りました'
                    : 'ON: [xx-{原文}-xx] で 2 倍長化、 全画面で UI 崩れを確認',
                );
              }}
            >
              <ThemedText type="defaultSemiBold">Pseudo-loc toggle (UI 崩れ検出)</ThemedText>
              <ThemedText style={styles.entryDesc}>
                ADR-0033 D4: 全 string を [xx-{'{'}原文{'}'}-xx] で wrap、 button truncation /
                overflow 事前検出
              </ThemedText>
            </Pressable>
          </SettingsSection>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // backgroundColor は useColors の c.background で動的指定
  container: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  // Phase 1.6-T6 (Issue #330 A4-2): mockup v1.0 整合の section card wrapper。
  // 各 section header (mono uppercase) 直下に white surface card (radius 12 +
  // overflow hidden) を配置、内部の entry を border-bottom 1px divider で区切る。
  // section 内 gap 0 = card 内で密着、最終 entry の下にも divider が薄く見える
  // (mockup screenshot 整合)。
  section: { gap: 8 },
  sectionCard: {
    backgroundColor: BG_SURFACE,
    borderRadius: 12,
    overflow: 'hidden',
  },
  // mockup v1.0 monetization-screens.jsx SettingsScreen SectionHeader 整合 (C1 PR、mono 風 small caps)
  sectionTitle: { fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.5 },
  entry: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
    gap: 6,
  },
  entryDesc: { fontSize: 13, opacity: 0.7, lineHeight: 18 },
  entryDisabled: { opacity: 0.6 },
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
  // Issue #457 Phase 2: 「プラン」 row の 3 要素 (label + 状態 badge + Upgrade CTA)
  // mockup `settings-tab-01.png` 整合: Free/Pro/Lifetime のステータス表示 + 緑 CTA。
  planStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: BG_SURFACE,
  },
  planStatusBadgePro: { borderColor: ACCENT_GOLD, backgroundColor: ACCENT_GOLD },
  planStatusBadgeText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
  planStatusBadgeTextPro: { color: ON_BRAND },
  planUpgradeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#1F3A2E', // BRAND_GREEN を直接参照 (color util 重複 import 回避)
  },
  planUpgradeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  // 旧 (Issue #457 Phase 2 で廃止)、削除候補だが後方互換のため残置 (settings 内未参照)。
  proRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proRowLabel: { flex: 1 },
  proBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: ACCENT_GOLD,
  },
  proBadgeText: { color: ON_BRAND, fontSize: 11, fontWeight: '700' },
  // Phase 1.6-T6 (Issue #330 A4-1): 行 value 位置の PRO badge (label + PRO + chevron 構造)。
  // proBadge より小さく、灰色ベースで mockup の `PRO` 表記整合。
  proBadgeRow: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: ACCENT_GOLD,
  },
  proBadgeRowText: {
    color: ON_BRAND,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
