/**
 * 設定画面 coordinator (F-11 着工で新規、Issue #12 / ADR-0007、 Phase 4 A3 で分割)。
 *
 * Stack route `/settings` (タブ外、ヘッダー戻る)。8 セクション (アカウント / 表示 / 通知 /
 * アーカイブ / 書き出し / バックアップ / その他法令 / バージョン) + 実機固有 (検索 / ヘルプ / DEV)。
 *
 * Phase 4 A3 (ADR-0045): 859 行 god を分割。
 * - 通知トグル+時刻ピッカー → NotificationSettingsSection
 * - テーマ / 鉢単位の Alert picker → useAlertPickerRow
 * - section wrapper → SettingsSection (共有)
 * - [DEV] テストデータ → DevSettingsSection (本番枝刈り)
 * coordinator は各 section の row 配線 + ナビゲーションのみ。AsyncStorage key / URL route / i18n 不変。
 */
import { Stack, useNavigation, useRouter, type Href } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import { findLanguageOption } from '@/src/core/i18n/languageOptions';
// Sess66 PR6a: BORDER_DEFAULT を inline c.border に移行 (dark cascade)。
import { ACCENT_GOLD, ON_BRAND } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { countArchivedBonsai } from '@/src/db/bonsaiRepository';
import { countAllTags } from '@/src/db/tagRepository';
import { DevSettingsSection } from '@/src/dev/DevSettingsSection';
// Sess66 PR5 (ADR-0053): SearchHeader showBack 撤去、 Expo Stack native header に統一。
// import { SearchHeader } from '@/src/features/bonsai/SearchHeader';  // 削除
import { LegalLinksRow } from '@/src/features/legal/LegalLinksRow';
import { NotificationSettingsSection } from '@/src/features/settings/NotificationSettingsSection';
import { PlanSection } from '@/src/features/settings/PlanSection';
import { SettingsSection } from '@/src/features/settings/SettingsSection';
import {
  useAlertPickerRow,
  type AlertPickerOption,
} from '@/src/features/settings/useAlertPickerRow';
import { showAdPrivacyOptionsForm } from '@/src/services/adService';
import { useOnboardingStore } from '@/src/stores/onboardingStore';
import { useProStore } from '@/src/stores/proStore';
import { useSettingsStore } from '@/src/stores/settingsStore';

export default function SettingsScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const c = useColors();
  const isPro = useProStore((s) => s.isPro);

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

  // Issue #457 Phase 5: アーカイブ済み盆栽 + タグ 件数を表示時に取得。失敗時は 0 のまま。
  const [archivedCount, setArchivedCount] = React.useState<number>(0);
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

  // Phase 1.6-T6 (Issue #330 A3): mockup v1.0「言語 日本語 ›」整合、 現在言語の native 表記を value 表示。
  const currentLanguageLabel = React.useMemo(() => {
    return findLanguageOption(lang)?.native ?? lang;
  }, [lang]);

  // Sess74 PR-3 (ADR-0053 Amendment / E2): 言語切替直後の Stack header transient re-render 漏れ
  // を回避するため、 useNavigation().setOptions で動的更新 (lang dependency)。
  React.useEffect(() => {
    navigation.setOptions({ title: t('tabSettings') });
  }, [navigation, t, lang]);

  // Phase 1.6-T6 (Issue #330 A1): テーマ 3 mode を 1 行 list + Alert (themeMode 維持、 UI 表現のみ整合)。
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const themeOptions: AlertPickerOption<'system' | 'light' | 'dark'>[] = [
    { value: 'system', labelKey: 'settingsThemeSystem' },
    { value: 'light', labelKey: 'settingsThemeLight' },
    { value: 'dark', labelKey: 'settingsThemeDark' },
  ];
  const themePicker = useAlertPickerRow({
    titleKey: 'settingsThemeRowLabel',
    options: themeOptions,
    value: themeMode,
    setValue: setThemeMode,
  });

  // Sess14 PR-L: 鉢サイズ単位 (cm/mm/inch) row。 テーマと同 pattern (Alert + 3 choice)。
  const potUnit = useSettingsStore((s) => s.potUnit);
  const setPotUnit = useSettingsStore((s) => s.setPotUnit);
  const potUnitOptions: AlertPickerOption<'cm' | 'mm' | 'inch'>[] = [
    { value: 'cm', labelKey: 'settingsPotUnitCm' },
    { value: 'mm', labelKey: 'settingsPotUnitMm' },
    { value: 'inch', labelKey: 'settingsPotUnitInch' },
  ];
  const potUnitPicker = useAlertPickerRow({
    titleKey: 'settingsPotUnit',
    options: potUnitOptions,
    value: potUnit,
    setValue: setPotUnit,
  });

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_settings_screen"
    >
      {/* Sess66 PR5 (ADR-0053): Expo Stack native header に SoT 統一。 旧 SearchHeader showBack
          自前 (Sess65 PR1) は撤去、 OS native の戻るボタン + headerTintColor (c.text) を採用。
          OS HIG / Material Design 準拠で a11y / RTL / swipe-back ジェスチャを native 享受。 */}
      <Stack.Screen options={{ title: t('tabSettings') }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* === mockup v1.0 SettingsScreen 8 セクション順序 (Issue #330): アカウント→表示→通知→
            アーカイブ→書き出し→バックアップ→その他法令→バージョン。実機固有 (検索/ヘルプ/DEV) は末尾。 */}

        {/* --- 1. F-13 Pro / Paywall 導線 + 購入復元 (Issue #20、ADR-0009) --- */}
        <PlanSection />

        {/* --- 2. F-15 表示 (テーマ Issue #32 ADR-0015) + 言語 (ADR-0004) + 鉢単位 --- */}
        <SettingsSection title={t('settingsThemeSection')}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsLanguageRowLabel')}
            accessibilityValue={{ text: currentLanguageLabel }}
            testID="e2e_settings_language_row"
            style={[styles.entry, { borderBottomColor: c.border }]}
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsThemeRowLabel')}
            accessibilityValue={{ text: themePicker.currentLabel }}
            testID="e2e_theme_mode_row"
            style={[styles.entry, { borderBottomColor: c.border }]}
            onPress={themePicker.onPress}
          >
            <View style={styles.rowInner}>
              <ThemedText type="defaultSemiBold">{t('settingsThemeRowLabel')}</ThemedText>
              <View style={styles.rowRight}>
                <ThemedText style={styles.rowValue}>{themePicker.currentLabel}</ThemedText>
                <ThemedText style={styles.chevron}>›</ThemedText>
              </View>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsPotUnit')}
            accessibilityValue={{ text: potUnit }}
            testID="e2e_pot_unit_row"
            style={[styles.entry, { borderBottomColor: c.border }]}
            onPress={potUnitPicker.onPress}
          >
            <View style={styles.rowInner}>
              <ThemedText type="defaultSemiBold">{t('settingsPotUnit')}</ThemedText>
              <View style={styles.rowRight}>
                <ThemedText style={styles.rowValue}>{potUnitPicker.currentLabel}</ThemedText>
                <ThemedText style={styles.chevron}>›</ThemedText>
              </View>
            </View>
          </Pressable>
        </SettingsSection>

        {/* --- 3. F-16 通知設定 (Issue #30、ADR-0014 Amended) --- */}
        <NotificationSettingsSection />

        {/* --- 4. アーカイブ (Issue #330 AC) --- */}
        <SettingsSection title={t('settingsArchiveSection')}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsArchiveTitle')}
            accessibilityHint={t('settingsArchiveDesc')}
            testID="e2e_open_archive"
            style={[styles.entry, { borderBottomColor: c.border }]}
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

        {/* --- 5. F-10 エクスポート (Issue #33、ADR-0016) → Hub へ単一エントリ --- */}
        <SettingsSection title={t('settingsExportSection')}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsExportSection')}
            accessibilityHint={t('exportHubHeroBody')}
            testID="e2e_open_export_hub"
            style={[styles.entry, { borderBottomColor: c.border }]}
            onPress={() => router.push('/export' as Href)}
          >
            <View style={styles.rowInner}>
              <ThemedText type="defaultSemiBold">{t('settingsExportSection')}</ThemedText>
              <View style={styles.rowRight}>
                <View style={styles.proBadgeRow}>
                  <ThemedText style={styles.proBadgeRowText}>{t('proBadgeShort')}</ThemedText>
                </View>
                <ThemedText style={styles.chevron}>›</ThemedText>
              </View>
            </View>
          </Pressable>
        </SettingsSection>

        {/* --- 6. F-11 お引っ越し (作成/復元を 1 画面 /backup に統合) --- */}
        <SettingsSection title={t('settingsBackupSection')}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('backupTitle')}
            accessibilityHint={t('backupExportDesc')}
            testID="e2e_open_backup"
            style={[styles.entry, { borderBottomColor: c.border }]}
            onPress={() => router.push('/backup' as Href)}
          >
            <View style={styles.rowInner}>
              <ThemedText type="defaultSemiBold">{t('backupTitle')}</ThemedText>
              <ThemedText style={styles.chevron}>›</ThemedText>
            </View>
          </Pressable>
        </SettingsSection>

        {/* --- 7. その他/法令 (Issue #330 AC + Sess57: Linking 化) --- */}
        <SettingsSection title={t('settingsLegalSection')}>
          <LegalLinksRow />
          {/* AdMob プライバシーオプション (Free のみ表示、 既存 F-LEGAL-001 Phase A 流用) */}
          {!isPro && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('settingsAdPrivacyOptionsTitle')}
              accessibilityHint={t('settingsAdPrivacyOptionsDesc')}
              testID="e2e_open_ad_privacy_options"
              style={[styles.entry, { borderBottomColor: c.border }]}
              onPress={handleAdPrivacyOptionsPress}
            >
              <View style={styles.rowInner}>
                <ThemedText type="defaultSemiBold">{t('settingsAdPrivacyOptionsTitle')}</ThemedText>
                <ThemedText style={styles.chevron}>›</ThemedText>
              </View>
            </Pressable>
          )}
        </SettingsSection>

        {/* Sess57: バージョン section 廃止 (UI ノイズ削減、 app-factory 共通ルール)。 */}

        {/* --- (実機固有) F-09 検索 (Issue #31) --- */}
        <SettingsSection title={t('settingsSearchSection')}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('searchAction')}
            accessibilityHint={t('searchDesc')}
            testID="e2e_open_search"
            style={[styles.entry, { borderBottomColor: c.border }]}
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
            style={[styles.entry, { borderBottomColor: c.border }]}
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
            style={[styles.entry, { borderBottomColor: c.border }]}
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

        {/* __DEV__ 限定 + ui-diff preview build 用 unlock (EXPO_PUBLIC_SEED_FORCE=1)。
            production build (env 未設定) では枝刈りされ含まれない。 */}
        {(__DEV__ || process.env.EXPO_PUBLIC_SEED_FORCE === '1') && <DevSettingsSection />}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // backgroundColor / borderBottomColor は useColors の c.background / c.border で動的指定 (Sess66 PR6a)。
  container: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  entry: {
    padding: 16,
    borderBottomWidth: 1,
    gap: 6,
  },
  // Phase 1.6-T6 (Issue #330 A1): list-row 共通 style (label / value / chevron)。
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: 14, opacity: 0.7 },
  chevron: { fontSize: 18, opacity: 0.5, lineHeight: 18 },
  // Phase 1.6-T6 (Issue #330 A4-1): 行 value 位置の PRO badge (export row、 label + PRO + chevron)。
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
