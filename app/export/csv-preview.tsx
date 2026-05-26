/**
 * F-10 CSV プレビュー画面 (Issue #33 / ADR-0016 AC11 CSV Preview = 7 画面目)。
 *
 * Options Sheet (CSV 3 種) の「プレビュー」で遷移。条件を JSON パラメータで受け取り
 * loadCsvForPreview で CSV 文字列を生成し生テキストで表示。
 * 共有ボタンで shareExportFile (cacheDirectory → Share Sheet)。
 */
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FormScreenHeader } from '@/src/components/form/FormScreenHeader';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_PRIMARY,
  BORDER_DEFAULT,
  BRAND_GREEN,
  ON_BRAND,
  TEXT_PRIMARY,
} from '@/src/core/theme/colors';
import {
  type ExportOptions,
  loadCsvForPreview,
  shareExportFile,
} from '@/src/features/export/exportFlow';

export default function ExportCsvPreviewScreen() {
  const { t, lang } = useTranslation();
  const { opts: optsParam } = useLocalSearchParams<{ opts: string }>();
  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let alive = true;
    let opts: ExportOptions;
    try {
      opts = { ...(JSON.parse(optsParam ?? '{}') as Omit<ExportOptions, 'lang'>), lang };
    } catch {
      Alert.alert(t('error'), t('exportCsvFailed'));
      return;
    }
    loadCsvForPreview(opts, t)
      .then((r) => {
        if (!alive) return;
        setCsv(r.csv);
        setFileName(r.fileName);
      })
      .catch(() => {
        if (alive) Alert.alert(t('error'), t('exportCsvFailed'));
      });
    return () => {
      alive = false;
    };
  }, [optsParam, lang, t]);

  const handleShare = async () => {
    if (sharing || !csv) return;
    setSharing(true);
    try {
      await shareExportFile(fileName, csv, t);
    } catch {
      Alert.alert(t('error'), t('exportCsvFailed'));
    } finally {
      setSharing(false);
    }
  };

  return (
    <ThemedView style={styles.container} testID="e2e_export_csv_preview_screen">
      <FormScreenHeader title={t('exportCsvTitle')} testID="e2e_export_csv_preview_header" />

      {csv === null ? (
        <View style={styles.loading}>
          <ActivityIndicator color={BRAND_GREEN} />
        </View>
      ) : (
        <ScrollView style={styles.textScroll} testID="e2e_export_csv_preview_text_view">
          <ThemedText style={styles.rawText}>{csv}</ThemedText>
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('exportPreviewShare')}
          testID="e2e_export_csv_preview_share"
          style={[styles.cta, sharing && styles.ctaBusy]}
          onPress={handleShare}
          disabled={sharing || csv === null}
        >
          {sharing ? (
            <ActivityIndicator color={ON_BRAND} />
          ) : (
            <ThemedText style={styles.ctaText}>{t('exportPreviewShare')}</ThemedText>
          )}
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_PRIMARY },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  textScroll: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  rawText: { fontSize: 11, color: TEXT_PRIMARY, lineHeight: 18 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: BORDER_DEFAULT,
  },
  cta: {
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBusy: { opacity: 0.6 },
  ctaText: { color: ON_BRAND, fontSize: 17, fontWeight: '600' },
});
