/**
 * F-10 全盆栽リスト PDF プレビュー画面 (Issue #33 / ADR-0016 AC11 PDF List Preview)。
 *
 * Options Sheet (list_pdf) の「プレビュー」で遷移。条件 (期間/対象/アーカイブ) を
 * JSON パラメータで受け取り loadListPdfHtml で HTML 生成 → WebView 表示。
 * 上部バーの共有ボタンで generateAndShareListPdf。
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { BackIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/core/i18n/i18n';
import { type ExportOptions, loadListPdfHtml } from '@/src/features/export/exportFlow';
import { GeneratingOverlay } from '@/src/features/export/GeneratingOverlay';
import { generateAndShareListPdf } from '@/src/features/export/pdfExport';

const READER_BG = '#3A3833';

export default function ExportListPreviewScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { opts: optsParam } = useLocalSearchParams<{ opts: string }>();
  const [html, setHtml] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let alive = true;
    let opts: ExportOptions;
    try {
      opts = { ...(JSON.parse(optsParam ?? '{}') as Omit<ExportOptions, 'lang'>), lang };
    } catch {
      Alert.alert(t('error'), t('exportListPdfFailedBody'));
      return;
    }
    loadListPdfHtml(opts, t)
      .then((r) => {
        if (alive) setHtml(r.html);
      })
      .catch(() => {
        if (alive) Alert.alert(t('error'), t('exportListPdfFailedBody'));
      });
    return () => {
      alive = false;
    };
  }, [optsParam, lang, t]);

  const handleShare = async () => {
    if (sharing || !html) return;
    setSharing(true);
    try {
      await generateAndShareListPdf(html, t('exportListPdfShareTitle'));
    } catch {
      Alert.alert(t('error'), t('exportListPdfFailedBody'));
    } finally {
      setSharing(false);
    }
  };

  return (
    <View
      style={[styles.container, { paddingTop: insets.top }]}
      testID="e2e_export_list_preview_screen"
    >
      <View style={styles.bar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('back')}
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.iconBtn}
          testID="e2e_export_list_preview_back"
        >
          <BackIcon size={22} color="#F7F3E8" />
        </Pressable>
        <View style={styles.barCenter}>
          <ThemedText style={styles.barTitle} numberOfLines={1}>
            {t('exportListPdfCoverTitle')}.pdf
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('exportPreviewShare')}
          hitSlop={8}
          onPress={handleShare}
          disabled={sharing || !html}
          style={styles.iconBtn}
          testID="e2e_export_list_preview_share"
        >
          {sharing ? (
            <ActivityIndicator color="#F7F3E8" />
          ) : (
            <ThemedText style={styles.shareText}>{t('exportPreviewShare')}</ThemedText>
          )}
        </Pressable>
      </View>

      {html ? (
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={styles.web}
          javaScriptEnabled={false}
          testID="e2e_export_list_preview_webview"
        />
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color="#F7F3E8" />
        </View>
      )}

      <GeneratingOverlay visible={sharing} onCancel={() => setSharing(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: READER_BG },
  bar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  iconBtn: { minWidth: 56, height: 44, alignItems: 'center', justifyContent: 'center' },
  barCenter: { flex: 1, alignItems: 'center' },
  barTitle: { fontSize: 14, fontWeight: '500', color: '#F7F3E8' },
  shareText: { fontSize: 14, fontWeight: '500', color: '#F7F3E8' },
  web: { flex: 1, backgroundColor: '#FFFFFF' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
