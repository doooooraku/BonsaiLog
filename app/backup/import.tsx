/**
 * F-11 バックアップ復元画面 (Issue #12 / ADR-0007)。
 *
 * フロー:
 * 1. 「バックアップから復元」ボタンタップ
 * 2. 警告ダイアログ「既存データに追加されます (上書きはしません)」
 * 3. importBackup() 実行 (ピッカー → ZIP 解凍 → manifest 検証 → 写真コピー → DB マージ)
 * 4. 結果アラート (件数表示) または BackupError.code 別エラー
 *
 * 設計方針:
 * - マージは Append のみ (ID 重複は skip)、上書きしない (ADR-0007)
 * - 二重実行防止 (importing state 中はボタン無効)
 * - キャンセル (importBackup が null 返却) は無音
 */
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import { BackupError, importBackup } from '@/src/features/backup/backupService';

export default function BackupImportScreen() {
  const { t } = useTranslation();
  const [importing, setImporting] = useState(false);

  const runImport = async () => {
    if (importing) return;
    setImporting(true);
    try {
      const result = await importBackup();
      if (result == null) {
        return;
      }
      const detail = t('backupImportSuccessDetail')
        .replace('{bonsai}', String(result.bonsai))
        .replace('{events}', String(result.events))
        .replace('{photos}', String(result.photos));
      Alert.alert(t('backupImportSuccess'), detail);
    } catch (error) {
      if (error instanceof BackupError) {
        switch (error.code) {
          case 'unsupported':
            Alert.alert(t('backupUnsupportedTitle'), t('backupUnsupportedBody'));
            break;
          case 'schema':
            Alert.alert(t('backupSchemaMismatchTitle'), t('backupSchemaMismatchBody'));
            break;
          case 'invalid':
            Alert.alert(t('backupInvalidTitle'), t('backupInvalidBody'));
            break;
          case 'size':
            Alert.alert(t('backupSizeLimitTitle'), t('backupSizeLimitBody'));
            break;
          default:
            Alert.alert(t('backupImportFailed'));
        }
      } else {
        Alert.alert(t('backupImportFailed'));
      }
    } finally {
      setImporting(false);
    }
  };

  const handleImport = () => {
    Alert.alert(t('backupImportWarningTitle'), t('backupImportWarningBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('backupImportAction'), style: 'default', onPress: runImport },
    ]);
  };

  return (
    <ThemedView style={styles.container} testID="e2e_backup_import_screen">
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="title" style={styles.title}>
          {t('backupImportTitle')}
        </ThemedText>
        <ThemedText style={styles.body}>{t('backupImportDesc')}</ThemedText>

        <View style={styles.warningBox}>
          <ThemedText style={styles.warningText}>{t('backupImportWarningBody')}</ThemedText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('backupImportAction')}
          testID="e2e_backup_import_action"
          style={[styles.primaryButton, importing && styles.disabledButton]}
          onPress={handleImport}
          disabled={importing}
        >
          {importing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.primaryButtonText}>{t('backupImportAction')}</ThemedText>
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
