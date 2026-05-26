/**
 * F-10 個別盆栽 PDF — 盆栽 picker 画面 (Issue #33 / ADR-0016)。
 *
 * 「1 本ずつの 1 ページレポート」は per-bonsai 選択が本質のため、Hub からは
 * Options Sheet ではなくこの picker へ遷移する。
 *
 * フロー:
 * 1. Pro 判定 (useProStore.isPro) — Free は Paywall 案内
 * 2. 盆栽を選ぶ → pdf-preview 画面 (WebView プレビュー + 共有) へ遷移
 */
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FormScreenHeader } from '@/src/components/form/FormScreenHeader';
import { useTranslation } from '@/src/core/i18n/i18n';
import { BG_PRIMARY, BORDER_DEFAULT, BRAND_GREEN, ON_BRAND } from '@/src/core/theme/colors';
import { getAllActiveBonsai } from '@/src/db/bonsaiRepository';
import type { Bonsai } from '@/src/db/schema';
import { useGoToPaywall } from '@/src/features/pro/useGoToPaywall';
import { useProStore } from '@/src/stores/proStore';

export default function ExportPdfScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isPro = useProStore((s) => s.isPro);
  const goToPaywall = useGoToPaywall();
  const [bonsaiList, setBonsaiList] = React.useState<Bonsai[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      getAllActiveBonsai()
        .then(setBonsaiList)
        .catch(() => setBonsaiList([]));
    }, []),
  );

  const handlePick = (bonsai: Bonsai) => {
    if (!isPro) {
      goToPaywall(t('exportProRequiredTitle'), t('exportProRequiredBody'));
      return;
    }
    router.push(`/export/pdf-preview?bonsaiId=${bonsai.id}` as Href);
  };

  return (
    <ThemedView style={styles.container} testID="e2e_export_pdf_screen">
      <FormScreenHeader title={t('exportHubBonsaiPdfTitle')} testID="e2e_export_pdf_header" />
      <ScrollView contentContainerStyle={styles.scroll}>
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
              style={styles.action}
              onPress={() => handlePick(b)}
            >
              <ThemedText style={styles.actionText}>{t('exportPdfAction')}</ThemedText>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_PRIMARY },
  scroll: { padding: 16, gap: 12 },
  desc: { fontSize: 13, opacity: 0.7, marginBottom: 12, lineHeight: 18 },
  empty: { textAlign: 'center', opacity: 0.7, paddingVertical: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
  },
  rowMain: { flex: 1 },
  action: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 48,
    minWidth: 64,
    borderRadius: 12,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: ON_BRAND, fontWeight: '600' },
});
