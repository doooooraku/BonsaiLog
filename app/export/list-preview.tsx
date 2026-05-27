/**
 * F-10 全盆栽リスト PDF プレビュー画面 (Issue #33 / ADR-0016 AC11 PDF List Preview)。
 *
 * Options Sheet (list_pdf) の「プレビュー」で遷移。条件 (期間/対象/アーカイブ) を
 * JSON パラメータで受け取り loadListPdfHtml で HTML 生成 → WebView 表示。
 * 下部の「出力する」ボタンで generateAndShareListPdf。
 *
 * Sess49 追補2: 独自ダークバー + 右上「共有」を廃止し、FormScreenHeader + 下部 CTA に統一。
 */
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { FormScreenHeader } from '@/src/components/form/FormScreenHeader';
import { useTranslation } from '@/src/core/i18n/i18n';
import { BG_PRIMARY, BORDER_DEFAULT, BRAND_GREEN, ON_BRAND } from '@/src/core/theme/colors';
import { type ExportOptions, loadListPdfHtml } from '@/src/features/export/exportFlow';
import { GeneratingOverlay } from '@/src/features/export/GeneratingOverlay';
import { generateAndShareListPdf } from '@/src/features/export/pdfExport';

export default function ExportListPreviewScreen() {
  const { t, lang } = useTranslation();
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

  const handleExport = async () => {
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
    <View style={styles.container} testID="e2e_export_list_preview_screen">
      <FormScreenHeader
        title={t('exportListPdfCoverTitle')}
        testID="e2e_export_list_preview_header"
      />

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
          <ActivityIndicator color={BRAND_GREEN} />
        </View>
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('exportOptExport')}
          testID="e2e_export_list_preview_generate"
          style={[styles.cta, (sharing || !html) && styles.ctaBusy]}
          onPress={handleExport}
          disabled={sharing || !html}
        >
          {sharing ? (
            <ActivityIndicator color={ON_BRAND} />
          ) : (
            <ThemedText style={styles.ctaText}>{t('exportOptExport')}</ThemedText>
          )}
        </Pressable>
      </View>

      <GeneratingOverlay visible={sharing} onCancel={() => setSharing(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_PRIMARY },
  web: { flex: 1, backgroundColor: '#FFFFFF' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER_DEFAULT,
    backgroundColor: BG_PRIMARY,
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
