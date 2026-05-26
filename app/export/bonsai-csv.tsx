/**
 * F-10 エクスポート — 盆栽一覧 CSV エクスポート画面 (Issue #33 / ADR-0016 AC2 bonsai_csv)。
 *
 * フロー (csv.tsx と同一パターン):
 * 1. Pro 判定 (useProStore.isPro) — Free は Paywall 案内
 * 2. ストレージ事前チェック (AC7)
 * 3. getAllActiveBonsaiWithSpecies → bonsaiToCsvString → cacheDirectory → Share Sheet
 * 4. 二重実行防止 (busy)
 */
import { File, Paths } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FormScreenHeader } from '@/src/components/form/FormScreenHeader';
import { useTranslation } from '@/src/core/i18n/i18n';
import { BG_PRIMARY, BRAND_GREEN, BRAND_GREEN_BG, ON_BRAND } from '@/src/core/theme/colors';
import { getAllActiveBonsaiWithSpecies } from '@/src/db/bonsaiRepository';
import { type BonsaiForCsv, bonsaiToCsvString } from '@/src/features/export/csvExport';
import { isStorageSufficient } from '@/src/features/export/pdfReliability';
import { useGoToPaywall } from '@/src/features/pro/useGoToPaywall';
import { useProStore } from '@/src/stores/proStore';

export default function ExportBonsaiCsvScreen() {
  const { t, lang } = useTranslation();
  const isPro = useProStore((s) => s.isPro);
  const goToPaywall = useGoToPaywall();
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    if (busy) return;
    if (!isPro) {
      goToPaywall(t('exportProRequiredTitle'), t('exportProRequiredBody'));
      return;
    }
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
      const withSpecies = await getAllActiveBonsaiWithSpecies(lang);
      const rows: BonsaiForCsv[] = withSpecies.map((b) => ({
        ...b,
        speciesName: b.species?.commonName ?? '',
      }));
      const csv = bonsaiToCsvString(rows);
      const fileName = `bonsailog-bonsai-${new Date().toISOString().slice(0, 10)}.csv`;
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
        t('exportBonsaiCsvSuccess'),
        t('exportBonsaiCsvSuccessDetail').replace('{count}', String(rows.length)),
      );
    } catch (error) {
      Alert.alert(t('exportCsvFailed'), String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container} testID="e2e_export_bonsai_csv_screen">
      <FormScreenHeader
        title={t('exportHubBonsaiCsvTitle')}
        testID="e2e_export_bonsai_csv_header"
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText style={styles.body}>{t('exportBonsaiCsvDesc')}</ThemedText>

        {!isPro && (
          <View style={styles.proNotice} testID="e2e_export_pro_notice">
            <ThemedText style={styles.proNoticeText}>{t('exportProRequiredBody')}</ThemedText>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('exportBonsaiCsvAction')}
          testID="e2e_export_bonsai_csv_action"
          style={[styles.primaryButton, (busy || !isPro) && styles.disabledButton]}
          onPress={handleExport}
          disabled={busy || !isPro}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.primaryButtonText}>{t('exportBonsaiCsvAction')}</ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_PRIMARY },
  scroll: { padding: 16, gap: 16 },
  body: { lineHeight: 22 },
  proNotice: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: BRAND_GREEN_BG,
    borderWidth: 1,
    borderColor: BRAND_GREEN,
  },
  proNoticeText: { fontSize: 13, lineHeight: 18 },
  primaryButton: {
    marginTop: 8,
    paddingVertical: 14,
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: ON_BRAND, fontSize: 17, fontWeight: '600' },
  disabledButton: { opacity: 0.6 },
});
