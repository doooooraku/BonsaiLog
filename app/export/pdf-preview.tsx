/**
 * F-10 個別盆栽 PDF 出力確認画面 (Issue #33 / ADR-0016)。
 *
 * pdf.tsx の picker で盆栽を選ぶと遷移。下部の「出力する」で PDF を生成し OS 共有 (Share Sheet) で開く。
 *
 * Sess50: アプリ内 WebView プレビューを廃止 (多写真で Android WebView の tile memory 上限により
 * 真っ白になる実機バグ、react-native-webview #2683)。生成 → OS 共有に一本化し、出力は 3 段階
 * フォールバック (generateBonsaiPdfWithFallback、画質ダウン・全枚数維持) で確実に成功させる。
 * ADR-0016 AC48 を「OS ビューア (Share Sheet) で確認」に amend。
 */
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { FormScreenHeader } from '@/src/components/form/FormScreenHeader';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_PRIMARY,
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  ON_BRAND,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { prepareBonsaiPdf } from '@/src/features/export/exportFlow';
import { GeneratingOverlay } from '@/src/features/export/GeneratingOverlay';
import { generateBonsaiPdfWithFallback } from '@/src/features/export/pdfExport';
import type { AttemptNumber } from '@/src/features/export/pdfReliability';

type Prep = {
  name: string;
  photoCount: number;
  coverUri: string | null;
  buildHtmlForAttempt: (attempt: AttemptNumber) => Promise<string>;
};

export default function ExportPdfPreviewScreen() {
  const { t, lang } = useTranslation();
  const insets = useSafeAreaInsets();
  const { bonsaiId } = useLocalSearchParams<{ bonsaiId: string }>();
  const [prep, setPrep] = useState<Prep | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!bonsaiId) return;
    prepareBonsaiPdf(bonsaiId, lang, t)
      .then((r) => {
        if (alive) setPrep(r);
      })
      .catch(() => {
        if (alive) Alert.alert(t('error'), t('exportPdfFailedBody'));
      });
    return () => {
      alive = false;
    };
  }, [bonsaiId, lang, t]);

  const handleExport = async () => {
    if (sharing || !prep) return;
    setSharing(true);
    try {
      await generateBonsaiPdfWithFallback({
        buildHtmlForAttempt: prep.buildHtmlForAttempt,
        photoCount: prep.photoCount,
        shareDialogTitle: t('exportPdfShareTitle'),
      });
    } catch {
      Alert.alert(t('error'), t('exportPdfFailedBody'));
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.container} testID="e2e_export_pdf_preview_screen">
      <FormScreenHeader title={prep?.name || 'PDF'} testID="e2e_export_pdf_preview_header" />

      {prep ? (
        <View style={styles.body}>
          {prep.coverUri ? (
            <Image source={{ uri: prep.coverUri }} style={styles.cover} contentFit="cover" />
          ) : null}
          <ThemedText style={styles.desc}>{t('exportPdfConfirmBody')}</ThemedText>
        </View>
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
          style={[styles.cta, (sharing || !prep) && styles.ctaBusy]}
          onPress={handleExport}
          disabled={sharing || !prep}
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
  body: { flex: 1, padding: 24, alignItems: 'center', gap: 20 },
  cover: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
  },
  desc: { fontSize: 14, lineHeight: 21, color: TEXT_SECONDARY, textAlign: 'center' },
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
