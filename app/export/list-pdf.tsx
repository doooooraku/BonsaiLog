/**
 * F-10 Phase K — 全盆栽リスト PDF エクスポート画面 (Issue #33 / ADR-0016 AC2 list_pdf)。
 *
 * フロー:
 * 1. Pro 判定 (`useProStore.isPro`) — Free は Paywall 案内 Alert
 * 2. ボタン 1 つで全盆栽 + 全 events を取得 → 統計集計
 * 3. buildBonsaiListPdfHtml で HTML 生成
 * 4. generateAndShareListPdf で印刷 + 共有
 */
import * as LegacyFileSystem from 'expo-file-system/legacy';
import React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import { getAllActiveBonsaiWithSpecies } from '@/src/db/bonsaiRepository';
import { getActiveEventsByBonsai } from '@/src/db/eventRepository';
import {
  buildBonsaiListPdfHtml,
  type BonsaiListRow,
  type ListPdfStats,
} from '@/src/features/export/listPdfExport';
import { BG_PRIMARY, BRAND_GREEN, DISABLED_BG, ON_BRAND } from '@/src/core/theme/colors';
import { generateAndShareListPdf } from '@/src/features/export/pdfExport';
import { isStorageSufficient } from '@/src/features/export/pdfReliability';
import { useGoToPaywall } from '@/src/features/pro/useGoToPaywall';
import { useProStore } from '@/src/stores/proStore';

export default function ExportListPdfScreen() {
  const { t, lang } = useTranslation();
  const isPro = useProStore((s) => s.isPro);
  const goToPaywall = useGoToPaywall();
  const [busy, setBusy] = React.useState(false);

  const handleExport = async () => {
    if (busy) return;
    if (!isPro) {
      goToPaywall(t('exportProRequiredTitle'), t('exportProRequiredBody'));
      return;
    }
    // F-10 Phase L (Issue #33, ADR-0016 AC7): ストレージ事前チェック
    // getFreeDiskStorageAsync 失敗時はチェックスキップ (AC7-2 仕様)
    try {
      const freeBytes = await LegacyFileSystem.getFreeDiskStorageAsync();
      if (!isStorageSufficient(freeBytes)) {
        Alert.alert(t('exportStorageLowTitle'), t('exportStorageLowBody'));
        return;
      }
    } catch {
      // チェックスキップ (PDF 生成側で BlankPdfError 等で対応)
    }
    setBusy(true);
    try {
      const bonsaiList = await getAllActiveBonsaiWithSpecies(lang);

      // 各盆栽の events を集計
      const eventsByBonsai = await Promise.all(
        bonsaiList.map((b) => getActiveEventsByBonsai(b.id)),
      );

      // リスト行を組み立て (BonsaiWithSpecies は Bonsai & { species } の inline 型)
      const rows: BonsaiListRow[] = bonsaiList.map((b, i) => ({
        id: b.id,
        name: b.name,
        speciesName: b.species?.commonName ?? null,
        acquiredAt: b.acquiredAt,
        eventCount: eventsByBonsai[i].length,
      }));

      // 統計集計
      const allEvents = eventsByBonsai.flat();
      const typeBreakdown = allEvents.reduce<Record<string, number>>((acc, e) => {
        acc[e.type] = (acc[e.type] ?? 0) + 1;
        return acc;
      }, {});
      const speciesBreakdown = bonsaiList.reduce<Record<string, number>>((acc, b) => {
        const name = b.species?.commonName;
        if (name) acc[name] = (acc[name] ?? 0) + 1;
        return acc;
      }, {});
      const stats: ListPdfStats = {
        totalEvents: allEvents.length,
        typeBreakdown,
        speciesBreakdown,
      };

      const generatedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const html = buildBonsaiListPdfHtml({
        bonsaiList: rows,
        stats,
        texts: {
          coverTitle: t('exportListPdfCoverTitle'),
          coverSubtitleTemplate: t('exportListPdfCoverSubtitle'),
          generatedAtLabel: t('exportListPdfGeneratedAt'),
          generatedAtValue: generatedAt,
          listSectionTitle: t('exportListPdfListSection'),
          listColumnName: t('bonsaiFieldName'),
          listColumnSpecies: t('bonsaiFieldSpecies'),
          listColumnAcquiredAt: t('bonsaiFieldAcquiredAt'),
          listColumnEventCount: t('exportListPdfAction'),
          statsSectionTitle: t('exportListPdfStatsSection'),
          statsTotalLabel: t('exportListPdfTotal'),
          statsTypeBreakdownTitle: t('exportListPdfTypeBreakdown'),
          statsSpeciesBreakdownTitle: t('exportListPdfSpeciesBreakdown'),
          footerNote: t('exportListPdfFooter'),
        },
      });

      await generateAndShareListPdf(html, t('exportListPdfShareTitle'));
    } catch {
      Alert.alert(t('error'), t('exportListPdfFailedBody'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container} testID="e2e_export_list_pdf_screen">
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="title" style={styles.title}>
          {t('exportListPdfTitle')}
        </ThemedText>
        <ThemedText style={styles.desc}>{t('exportListPdfDesc')}</ThemedText>

        <View style={styles.actionWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('exportListPdfAction')}
            testID="e2e_export_list_pdf_action"
            style={[styles.action, busy && styles.actionBusy]}
            disabled={busy}
            onPress={() => void handleExport()}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.actionText}>{t('exportListPdfAction')}</ThemedText>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_PRIMARY },
  scroll: { padding: 16, gap: 12 },
  title: { marginBottom: 8 },
  desc: { fontSize: 13, opacity: 0.7, marginBottom: 16, lineHeight: 18 },
  actionWrap: { paddingTop: 16 },
  action: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBusy: { backgroundColor: DISABLED_BG },
  actionText: { color: ON_BRAND, fontWeight: '600' },
});
