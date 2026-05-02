/**
 * 設定画面 (F-11 着工で新規作成、Issue #12 / ADR-0007)。
 *
 * Related:
 * - Issue #12 F-11 (お引っ越し機能、本画面のエントリ実装)
 * - ADR-0007 (Repolog 方式 ZIP + Share Sheet)
 *
 * 設計方針:
 * - Stack route として `/settings` から到達 (タブ外に配置、ヘッダー戻るボタンで戻る)
 * - 本セッションでは F-11 (バックアップ作成 / 復元) のエントリのみ実装
 * - 将来 (F-12 言語切替 / F-15 テーマ等) のエントリ追加は別 Issue
 * - 既存 Tab UI を弄らないために app/(tabs) の外に配置 (router.push('/settings') で開く)
 */
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <ThemedView style={styles.container} testID="e2e_settings_screen">
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ThemedText type="title" style={styles.title}>
          {t('settingsTitle')}
        </ThemedText>

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
});
