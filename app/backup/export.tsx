/**
 * F-11 バックアップ作成画面 (Issue #12 / ADR-0007)。
 *
 * フロー:
 * 1. 「バックアップを作成」ボタンタップ
 * 2. exportBackup() 実行 (写真リサイズ → DB スナップショット → ZIP → Share Sheet 起動)
 * 3. Share Sheet 完了 / キャンセル後にトーストで結果表示
 *
 * UI 上の責務:
 * - 暗号化なし警告 (constraints §5-1) を必ず表示
 * - エラー時は BackupError.code 別にメッセージ切り替え
 * - 二重実行防止 (loading state 中はボタン無効)
 */
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import { BackupError, exportBackup } from '@/src/features/backup/backupService';

export default function BackupExportScreen() {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportBackup();
      Alert.alert(t('backupExportSuccess'));
    } catch (error) {
      if (error instanceof BackupError) {
        switch (error.code) {
          case 'unsupported':
            Alert.alert(t('backupUnsupportedTitle'), t('backupUnsupportedBody'));
            break;
          case 'share':
            Alert.alert(t('backupShareUnavailableTitle'), t('backupShareUnavailableBody'));
            break;
          case 'size':
            Alert.alert(t('backupSizeLimitTitle'), t('backupSizeLimitBody'));
            break;
          case 'invalid':
            Alert.alert(t('backupInvalidTitle'), t('backupInvalidBody'));
            break;
          default:
            Alert.alert(t('backupExportFailed'));
        }
      } else {
        Alert.alert(t('backupExportFailed'));
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <ThemedView style={styles.container} testID="e2e_backup_export_screen">
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="title" style={styles.title}>
          {t('backupExportTitle')}
        </ThemedText>
        <ThemedText style={styles.body}>{t('backupExportDesc')}</ThemedText>

        {/* 暗号化なし警告 (constraints §5-1) */}
        <View style={styles.warningBox}>
          <ThemedText style={styles.warningText}>{t('backupEncryptionWarning')}</ThemedText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('backupExportAction')}
          testID="e2e_backup_export_action"
          style={[styles.primaryButton, exporting && styles.disabledButton]}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.primaryButtonText}>{t('backupExportAction')}</ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  title: { marginBottom: 8 },
  body: { lineHeight: 22 },
  warningBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 193, 7, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.4)',
  },
  warningText: { fontSize: 13, lineHeight: 18 },
  primaryButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  disabledButton: { opacity: 0.6 },
});
