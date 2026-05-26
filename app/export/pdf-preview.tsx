/**
 * F-10 個別盆栽 PDF プレビュー画面 (Issue #33 / ADR-0016 AC11 PDF Bonsai Preview)。
 *
 * pdf.tsx の picker で盆栽を選ぶと遷移。印刷と同一の HTML (buildBonsaiPdfHtml) を
 * react-native-webview で表示し、上部バーの共有ボタンで generateAndShareBonsaiPdf。
 * 写真は base64 inline 済みなので WKWebView の file:// 制約は発生しない (ADR-0016)。
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { BackIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/core/i18n/i18n';
import { loadBonsaiPdfHtml } from '@/src/features/export/exportFlow';
import { GeneratingOverlay } from '@/src/features/export/GeneratingOverlay';
import { generateAndShareBonsaiPdf } from '@/src/features/export/pdfExport';

const READER_BG = '#3A3833';

export default function ExportPdfPreviewScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
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

  const handleShare = async () => {
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
    <View
      style={[styles.container, { paddingTop: insets.top }]}
      testID="e2e_export_pdf_preview_screen"
    >
      <View style={styles.bar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('back')}
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.iconBtn}
          testID="e2e_export_pdf_preview_back"
        >
          <BackIcon size={22} color="#F7F3E8" />
        </Pressable>
        <View style={styles.barCenter}>
          <ThemedText style={styles.barTitle} numberOfLines={1}>
            {name ? `${name}.pdf` : 'PDF'}
          </ThemedText>
          <ThemedText style={styles.barSub}>1 / 1</ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('exportPreviewShare')}
          hitSlop={8}
          onPress={handleShare}
          disabled={sharing || !html}
          style={styles.iconBtn}
          testID="e2e_export_pdf_preview_share"
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
          testID="e2e_export_pdf_preview_webview"
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
  barSub: { fontSize: 10, color: 'rgba(247,243,232,0.5)', marginTop: 2 },
  shareText: { fontSize: 14, fontWeight: '500', color: '#F7F3E8' },
  web: { flex: 1, backgroundColor: '#FFFFFF' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
