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
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import { useSettingsStore } from '@/src/stores/settingsStore';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const eventOverloadEnabled = useSettingsStore((s) => s.eventOverloadEnabled);
  const setEventOverloadEnabled = useSettingsStore((s) => s.setEventOverloadEnabled);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);

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
        </View>

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
});
