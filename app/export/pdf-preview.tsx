/**
 * F-10 個別盆栽 PDF プレビュー画面 (Issue #33 / ADR-0016 AC11 PDF Bonsai Preview)。
 *
 * pdf.tsx の picker で盆栽を選ぶと遷移。印刷と同一の HTML (buildBonsaiPdfHtml) を
 * react-native-webview で表示し、下部の「出力する」ボタンで generateAndShareBonsaiPdf。
 * 写真は base64 inline 済みなので WKWebView の file:// 制約は発生しない (ADR-0016)。
 *
 * Sess49 追補2: 独自ダークバー + 右上「共有」を廃止し、他画面と同じ FormScreenHeader +
 * 下部「出力する」CTA (CSV 動線と一貫) に統一。
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
import { loadBonsaiPdfHtml } from '@/src/features/export/exportFlow';
import { GeneratingOverlay } from '@/src/features/export/GeneratingOverlay';
import { generateAndShareBonsaiPdf } from '@/src/features/export/pdfExport';

export default function ExportPdfPreviewScreen() {
  const { t, lang } = useTranslation();
  const insets = useSafeAreaInsets();
  const { bonsaiId } = useLocalSearchParams<{ bonsaiId: string }>();
  const [html, setHtml] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [photoCount, setPhotoCount] = useState(0);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!bonsaiId) return;
    loadBonsaiPdfHtml(bonsaiId, lang, t)
      .then((r) => {
        if (!alive) return;
        setHtml(r.html);
        setName(r.name);
        setPhotoCount(r.photoCount);
      })
      .catch(() => {
        if (alive) Alert.alert(t('error'), t('exportPdfFailedBody'));
      });
    return () => {
      alive = false;
    };
  }, [bonsaiId, lang, t]);

  const handleExport = async () => {
    if (sharing || !html) return;
    setSharing(true);
    try {
      await generateAndShareBonsaiPdf(html, t('exportPdfShareTitle'), { photoCount });
    } catch {
      Alert.alert(t('error'), t('exportPdfFailedBody'));
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.container} testID="e2e_export_pdf_preview_screen">
      <FormScreenHeader title={name || 'PDF'} testID="e2e_export_pdf_preview_header" />

      {html ? (
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={styles.web}
          javaScriptEnabled={false}
          testID="e2e_export_pdf_preview_webview"
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
          testID="e2e_export_pdf_preview_generate"
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
