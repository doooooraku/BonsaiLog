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

  return (
    <ThemedView style={styles.container} testID="e2e_settings_screen">
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ThemedText type="title" style={styles.title}>
          {t('settingsTitle')}
        </ThemedText>

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
});
