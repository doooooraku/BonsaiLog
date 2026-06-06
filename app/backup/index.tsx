/**
 * F-11 お引っ越し（バックアップ）統合画面 (Issue #12 / ADR-0007)。
 *
 * 旧 app/backup/export.tsx + app/backup/import.tsx を 1 画面に統合 (Repolog 方式)。
 * 「作成」と「復元」は 1 つの引っ越し体験なので 1 画面で完結させる。
 *
 * UI 上の責務:
 * - 作成: 暗号化なし警告 (constraints §5-1) を必ず表示
 * - 復元: 実行前に確認ダイアログ「既存データに追加 (上書きしない)」
 * - 二重実行防止 (exporting / importing 中は両ボタン無効)
 * - エラーは BackupError.code 別にメッセージ切り替え
 * - 色は BRAND_GREEN / ON_BRAND トークン経由 (旧 import.tsx の #2E7D32 直書き drift 解消)
 */
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
// Sess66 PR6a: TEXT_SECONDARY を inline c.textSecondary に移行 (dark cascade)。
// Sess70 PR-C3: BRAND_GREEN / ON_BRAND を scheme-aware (c.tint / c.onTint) に移行
// (15765 「復元する」 outline button 沈み解消、 ADR-0015/0052 Sess69 PR-A Amendment 整合)。
import { useColors } from '@/src/core/theme/useColors';
import { BackupError, exportBackup, importBackup } from '@/src/features/backup/backupService';

export default function BackupScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const busy = exporting || importing;

  const handleExport = async () => {
    if (busy) return;
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

  const runImport = async () => {
    if (busy) return;
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
    if (busy) return;
    Alert.alert(t('backupImportWarningTitle'), t('backupImportWarningBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('backupImportAction'), style: 'default', onPress: () => void runImport() },
    ]);
  };

  return (
    <ThemedView style={styles.container} testID="e2e_backup_screen">
      <Stack.Screen options={{ title: t('backupTitle') }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* --- バックアップを作成 --- */}
        <View style={styles.section}>
          <ThemedText type="title" style={styles.title}>
            {t('backupExportTitle')}
          </ThemedText>
          <ThemedText style={styles.body}>{t('backupExportDesc')}</ThemedText>

          {/* 暗号化なし注記 (constraints §5-1: クラウド保存は自己責任を明示)。枠なし 1 行 */}
          <ThemedText style={[styles.note, { color: c.textSecondary }]}>
            {t('backupEncryptionWarning')}
          </ThemedText>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('backupExportAction')}
            accessibilityHint={t('backupExportDesc')}
            testID="e2e_backup_export_action"
            style={[
              styles.primaryButton,
              { backgroundColor: c.tint },
              busy && styles.disabledButton,
            ]}
            onPress={handleExport}
            disabled={busy}
          >
            {exporting ? (
              <ActivityIndicator color={c.onTint} />
            ) : (
              <ThemedText style={[styles.primaryButtonText, { color: c.onTint }]}>
                {t('backupExportAction')}
              </ThemedText>
            )}
          </Pressable>
        </View>

        <View style={styles.divider} />

        {/* --- バックアップから復元 --- */}
        <View style={styles.section}>
          <ThemedText type="title" style={styles.title}>
            {t('backupImportTitle')}
          </ThemedText>
          <ThemedText style={styles.body}>{t('backupImportDesc')}</ThemedText>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('backupImportAction')}
            accessibilityHint={t('backupImportDesc')}
            testID="e2e_backup_import_action"
            style={[styles.secondaryButton, { borderColor: c.tint }, busy && styles.disabledButton]}
            onPress={handleImport}
            disabled={busy}
          >
            {importing ? (
              <ActivityIndicator color={c.tint} />
            ) : (
              <ThemedText style={[styles.secondaryButtonText, { color: c.tint }]}>
                {t('backupImportAction')}
              </ThemedText>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  section: { gap: 12 },
  title: { marginBottom: 4 },
  body: { lineHeight: 22 },
  // Sess66 PR6a: color は inline c.textSecondary (dark cascade)。
  note: { fontSize: 12, lineHeight: 17 },
  divider: { height: 1, backgroundColor: 'rgba(0, 0, 0, 0.08)', marginVertical: 4 },
  // Sess70 PR-C3: bg / border / color は inline c.tint / c.onTint (scheme-aware)。
  primaryButton: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: { fontSize: 17, fontWeight: '600' },
  secondaryButton: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  secondaryButtonText: { fontSize: 17, fontWeight: '600' },
  disabledButton: { opacity: 0.6 },
});
