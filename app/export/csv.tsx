/**
 * F-10 エクスポート Phase A — events CSV エクスポート画面 (Issue #33 / ADR-0016)。
 *
 * フロー:
 * 1. Pro 判定 (`useProStore.isPro`) — Free は Paywall 案内 Alert (PaywallScreen は F-13 Phase 1+ で実装)
 * 2. Pro なら eventsToCsvString → cacheDirectory に書き出し → expo-sharing.shareAsync で Share Sheet
 * 3. 二重実行防止 (busy state)
 *
 * Phase A スコープ: events のみ CSV (全盆栽の作業ログを 1 ファイルに集約)
 * Phase B (別 PR): bonsai / photos / tags の CSV、PDF (Repolog `pdfService.ts` 流用)、7 画面構成
 */
import { File, Paths } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import { eventsToCsvString } from '@/src/features/export/csvExport';
import { isStorageSufficient } from '@/src/features/export/pdfReliability';
import { getDb } from '@/src/db/db';
import type { Event } from '@/src/db/schema';
import { useProStore } from '@/src/stores/proStore';

export default function ExportCsvScreen() {
  const { t } = useTranslation();
  const isPro = useProStore((s) => s.isPro);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    if (busy) return;
    if (!isPro) {
      Alert.alert(t('exportProRequiredTitle'), t('exportProRequiredBody'));
      return;
    }
    // F-10 Phase M (Issue #33, ADR-0016 AC7): ストレージ事前チェック
    // pdf.tsx / list-pdf.tsx と同じパターン (Phase L #127)、CSV にも適用
    try {
      const freeBytes = await LegacyFileSystem.getFreeDiskStorageAsync();
      if (!isStorageSufficient(freeBytes)) {
        Alert.alert(t('exportStorageLowTitle'), t('exportStorageLowBody'));
        return;
      }
    } catch {
      // チェックスキップ (AC7-2 仕様)
    }
    setBusy(true);
    try {
      // 全盆栽のアクティブ events を取得 (deleted_at IS NULL)。Phase A は単純化のため日付範囲指定なし。
      const db = await getDb();
      const events = await db.getAllAsync<Event>(
        'SELECT * FROM events WHERE deleted_at IS NULL ORDER BY occurred_at_utc DESC;',
      );
      const csv = eventsToCsvString(events);
      const fileName = `bonsailog-events-${new Date().toISOString().slice(0, 10)}.csv`;
      const file = new File(Paths.cache, fileName);
      if (file.exists) {
        file.delete();
      }
      file.create();
      file.write(csv);

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(t('exportShareUnavailableTitle'), t('exportShareUnavailableBody'));
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: t('exportCsvShareTitle'),
        UTI: 'public.comma-separated-values-text',
      });
      Alert.alert(
        t('exportCsvSuccess'),
        t('exportCsvSuccessDetail').replace('{count}', String(events.length)),
      );
    } catch (error) {
      Alert.alert(t('exportCsvFailed'), String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container} testID="e2e_export_csv_screen">
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="title" style={styles.title}>
          {t('exportCsvTitle')}
        </ThemedText>
        <ThemedText style={styles.body}>{t('exportCsvDesc')}</ThemedText>

        {!isPro && (
          <View style={styles.proNotice} testID="e2e_export_pro_notice">
            <ThemedText style={styles.proNoticeText}>{t('exportProRequiredBody')}</ThemedText>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('exportCsvAction')}
          testID="e2e_export_csv_action"
          style={[styles.primaryButton, (busy || !isPro) && styles.disabledButton]}
          onPress={handleExport}
          disabled={busy || !isPro}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.primaryButtonText}>{t('exportCsvAction')}</ThemedText>
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
  proNotice: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(46, 125, 50, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.4)',
  },
  proNoticeText: { fontSize: 13, lineHeight: 18 },
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
