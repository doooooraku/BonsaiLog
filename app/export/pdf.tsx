/**
 * F-10 Phase B — 個別盆栽 PDF エクスポート画面 (Issue #33 / ADR-0016)。
 *
 * フロー:
 * 1. Pro 判定 (`useProStore.isPro`) — Free は Paywall 案内 Alert
 * 2. 盆栽選択 (簡易リスト)
 * 3. 選択 → events 取得 → buildBonsaiPdfHtml → generateAndShareBonsaiPdf
 * 4. 二重実行防止 (busy)
 *
 * Phase C 以降スコープ:
 * - 全盆栽リスト PDF (表紙 + リスト + 統計)
 * - 写真 base64 inline
 * - 3 段階フォールバック (full → reduced → tiny)
 * - 進捗バー
 * - 詳細選択 UI (期間 / 樹種フィルタ)
 */
import { useFocusEffect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import { getAllActiveBonsai, getBonsaiWithSpecies } from '@/src/db/bonsaiRepository';
import { getActiveEventsByBonsai } from '@/src/db/eventRepository';
import type { Bonsai } from '@/src/db/schema';
import { buildBonsaiPdfHtml, generateAndShareBonsaiPdf } from '@/src/features/export/pdfExport';
import { useProStore } from '@/src/stores/proStore';

export default function ExportPdfScreen() {
  const { t, lang } = useTranslation();
  const isPro = useProStore((s) => s.isPro);
  const [bonsaiList, setBonsaiList] = React.useState<Bonsai[]>([]);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      getAllActiveBonsai()
        .then(setBonsaiList)
        .catch(() => setBonsaiList([]));
    }, []),
  );

  const handleExport = async (bonsai: Bonsai) => {
    if (busyId !== null) return;
    if (!isPro) {
      Alert.alert(t('exportProRequiredTitle'), t('exportProRequiredBody'));
      return;
    }
    setBusyId(bonsai.id);
    try {
      const detail = await getBonsaiWithSpecies(bonsai.id, lang);
      const events = await getActiveEventsByBonsai(bonsai.id);
      const html = buildBonsaiPdfHtml({
        bonsai: { name: bonsai.name, style: bonsai.style, acquiredAt: bonsai.acquiredAt },
        speciesCommonName: detail?.species?.commonName ?? null,
        events,
        title: t('exportPdfTitle'),
        labelSpecies: t('bonsaiFieldSpecies'),
        labelStyle: t('bonsaiFieldStyle'),
        labelAcquiredAt: t('bonsaiFieldAcquiredAt'),
        labelEventsTitle: t('eventsTitle'),
        labelEventDate: t('exportPdfHeaderDate'),
        labelEventType: t('exportPdfHeaderType'),
        labelEventNote: t('exportPdfHeaderNote'),
        footerNote: t('exportPdfFooterNote'),
      });
      await generateAndShareBonsaiPdf(html, t('exportPdfShareTitle'));
    } catch {
      Alert.alert(t('error'), t('exportPdfFailedBody'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ThemedView style={styles.container} testID="e2e_export_pdf_screen">
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="title" style={styles.title}>
          {t('exportPdfTitle')}
        </ThemedText>
        <ThemedText style={styles.desc}>{t('exportPdfDesc')}</ThemedText>

        {bonsaiList.length === 0 && (
          <ThemedText style={styles.empty}>{t('bonsaiListEmptyTitle')}</ThemedText>
        )}

        {bonsaiList.map((b) => (
          <View key={b.id} style={styles.row}>
            <View style={styles.rowMain}>
              <ThemedText type="defaultSemiBold">{b.name}</ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('exportPdfAction')}
              testID={`e2e_export_pdf_${b.id}`}
              style={[styles.action, busyId === b.id && styles.actionBusy]}
              disabled={busyId !== null}
              onPress={() => void handleExport(b)}
            >
              {busyId === b.id ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.actionText}>{t('exportPdfAction')}</ThemedText>
              )}
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  title: { marginBottom: 8 },
  desc: { fontSize: 13, opacity: 0.7, marginBottom: 12, lineHeight: 18 },
  empty: { textAlign: 'center', opacity: 0.7, paddingVertical: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  rowMain: { flex: 1 },
  action: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2E7D32',
  },
  actionBusy: { backgroundColor: '#9E9E9E' },
  actionText: { color: '#FFFFFF', fontWeight: '600' },
});
