/**
 * F-10 エクスポート Hub 画面 (Issue #33 / ADR-0016 AC11 Hub)。
 *
 * 役割: 5 種類のエクスポート (CSV×3 / PDF×2) を 1 画面に集約した「玄関」。
 * CSV セクション (盆栽一覧 / 作業履歴 / 樹種別サマリ) と PDF セクション
 * (個別盆栽レポート / 全盆栽リスト) に分けて表示。
 *
 * 行 tap の挙動:
 * - Free: Paywall へ (useGoToPaywall)
 * - bonsai_pdf: 個別選択が本質なので専用 picker (app/export/pdf.tsx) へ遷移
 * - それ以外 (リスト系 4 種): Options Sheet を開く (期間 / 対象 / アーカイブ)
 *
 * 生成は Hub が一元管理 (Sess55): Sheet は条件を集めて onGenerate で返すだけ。Hub が Sheet を
 * 閉じ → GeneratingOverlay (種別名 + バッジ、PDF はキャンセル可) を出し → runExport → 完了 Alert。
 * これで「Sheet の Modal 上にさらに Modal」という二重 Modal を避ける。
 *
 * mockup v1.0 (04-Export.html) 整合。Pro 限定は ADR-0009 / 0011 / 0016 が正
 * (mockup の「全件 Free」注記は下書きとして不採用)。
 */
import { useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FormScreenHeader } from '@/src/components/form/FormScreenHeader';
import { useScrollPreservation } from '@/src/core/hooks/useScrollPreservation';
import { ChevronRightIcon } from '@/src/components/icons';
import { type TranslationKey, useTranslation } from '@/src/core/i18n/i18n';
// Sess66 PR6a.1: theme-dependent token を inline c.* に (dark cascade)。
import { useColors } from '@/src/core/theme/useColors';
import { ExportFormatBadge, type ExportFmt } from '@/src/features/export/ExportFormatBadge';
import { ExportOptionsSheet } from '@/src/features/export/ExportOptionsSheet';
import type { ExportOptions, ExportTypeKey } from '@/src/features/export/exportFlow';
import { runExport } from '@/src/features/export/exportFlow';
import { GeneratingOverlay } from '@/src/features/export/GeneratingOverlay';
import { useGoToPaywall } from '@/src/features/pro/useGoToPaywall';
import { useProStore } from '@/src/stores/proStore';

type ExportTypeDef = {
  k: string;
  fmt: ExportFmt;
  titleKey: TranslationKey;
  subKey: TranslationKey;
};

const EXPORT_TYPES: readonly ExportTypeDef[] = [
  {
    k: 'bonsai_csv',
    fmt: 'CSV',
    titleKey: 'exportHubBonsaiCsvTitle',
    subKey: 'exportHubBonsaiCsvSub',
  },
  {
    k: 'events_csv',
    fmt: 'CSV',
    titleKey: 'exportHubEventsCsvTitle',
    subKey: 'exportHubEventsCsvSub',
  },
  {
    k: 'species_csv',
    fmt: 'CSV',
    titleKey: 'exportHubSpeciesCsvTitle',
    subKey: 'exportHubSpeciesCsvSub',
  },
  {
    k: 'bonsai_pdf',
    fmt: 'PDF',
    titleKey: 'exportHubBonsaiPdfTitle',
    subKey: 'exportHubBonsaiPdfSub',
  },
  { k: 'list_pdf', fmt: 'PDF', titleKey: 'exportHubListPdfTitle', subKey: 'exportHubListPdfSub' },
];

function ExportRow({ def, onPress }: { def: ExportTypeDef; onPress: () => void }) {
  const { t } = useTranslation();
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(def.titleKey)}
      testID={`e2e_export_hub_row_${def.k}`}
      style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}
      onPress={onPress}
    >
      <ExportFormatBadge fmt={def.fmt} />
      <View style={styles.rowMain}>
        <View style={styles.rowTitleLine}>
          <ThemedText type="defaultSemiBold" style={[styles.rowTitle, { color: c.text }]}>
            {t(def.titleKey)}
          </ThemedText>
          <View style={styles.proBadge}>
            <ThemedText style={[styles.proBadgeText, { color: c.text }]}>
              {t('proBadgeShort')}
            </ThemedText>
          </View>
        </View>
        <ThemedText style={[styles.rowSub, { color: c.textSecondary }]}>{t(def.subKey)}</ThemedText>
      </View>
      <ChevronRightIcon size={16} color={c.textMuted} />
    </Pressable>
  );
}

export default function ExportHubScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const c = useColors();
  // Sess95 PR-3: hardcode paddingBottom 40 → insets.bottom + 24 (edge-to-edge ナビバー対応)。
  const insets = useSafeAreaInsets();
  const isPro = useProStore((s) => s.isPro);
  const goToPaywall = useGoToPaywall();
  const [sheetType, setSheetType] = useState<ExportTypeKey | null>(null);
  const [generating, setGenerating] = useState<ExportTypeKey | null>(null);
  // Sess72 PR-4 (ADR-0040 D5 予定 / R-63 予定): 個別盆栽 PDF (export/pdf) への push 戻りで
  // Hub の scroll 位置が 0 リセットされる挙動を hook で解消。
  const scrollRef = React.useRef<ScrollView>(null);
  // Sess95 PR-2: onContentSizeChange 追加 (戻り後の非同期 layout 変動 race 対応、 hook JSDoc 参照)。
  const { onScroll, onContentSizeChange, scrollEventThrottle } = useScrollPreservation(scrollRef);

  const handlePick = (k: string) => {
    if (!isPro) {
      goToPaywall(t('exportProRequiredTitle'), t('exportProRequiredBody'));
      return;
    }
    if (k === 'bonsai_pdf') {
      router.push('/export/pdf' as Href);
      return;
    }
    setSheetType(k as ExportTypeKey);
  };

  const handleGenerate = async (opts: Omit<ExportOptions, 'lang'>) => {
    setSheetType(null);
    setGenerating(opts.type);
    try {
      const result = await runExport({ ...opts, lang }, t);
      Alert.alert(
        t('exportGenericSuccess'),
        t('exportGenericSuccessDetail').replace('{count}', String(result.count)),
      );
    } catch (error) {
      Alert.alert(t('exportCsvFailed'), String(error));
    } finally {
      setGenerating(null);
    }
  };

  const csvTypes = EXPORT_TYPES.filter((d) => d.fmt === 'CSV');
  const pdfTypes = EXPORT_TYPES.filter((d) => d.fmt === 'PDF');

  const generatingDef = generating ? EXPORT_TYPES.find((d) => d.k === generating) : undefined;
  const generatingFmt: ExportFmt = generatingDef?.fmt ?? 'CSV';

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_export_hub_screen"
    >
      <FormScreenHeader title={t('settingsExportSection')} testID="e2e_export_hub_header" />
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        onContentSizeChange={onContentSizeChange}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
      >
        <View style={styles.hero}>
          <ThemedText style={[styles.heroTitle, { color: c.text }]}>
            {t('exportHubHeroTitle')}
          </ThemedText>
          <ThemedText style={[styles.heroBody, { color: c.textSecondary }]}>
            {t('exportHubHeroBody')}
          </ThemedText>
        </View>

        <ThemedText style={[styles.sectionLabel, { color: c.textMuted }]}>
          {t('exportHubCsvSection')}
        </ThemedText>
        {csvTypes.map((def) => (
          <ExportRow key={def.k} def={def} onPress={() => handlePick(def.k)} />
        ))}

        <ThemedText style={[styles.sectionLabel, styles.sectionLabelPdf]}>
          {t('exportHubPdfSection')}
        </ThemedText>
        {pdfTypes.map((def) => (
          <ExportRow key={def.k} def={def} onPress={() => handlePick(def.k)} />
        ))}
      </ScrollView>

      <ExportOptionsSheet
        visible={sheetType !== null}
        type={sheetType ?? 'events_csv'}
        onClose={() => setSheetType(null)}
        onGenerate={handleGenerate}
      />

      <GeneratingOverlay
        visible={generating !== null}
        format={generatingFmt}
        title={
          generatingDef
            ? t('exportGeneratingNamed').replace('{name}', t(generatingDef.titleKey))
            : t('exportGeneratingTitle')
        }
        showCancel={generatingFmt === 'PDF'}
        delayMs={generatingFmt === 'PDF' ? 0 : 250}
        onCancel={() => setGenerating(null)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // Sess66 PR6a.1: bg/border/text color は inline c.* (dark cascade)。
  container: { flex: 1 },
  scroll: { padding: 16 }, // paddingBottom は inline insets.bottom + 24 (Sess95 PR-3)
  hero: { marginBottom: 20 },
  heroTitle: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 22,
    lineHeight: 32,
  },
  heroBody: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.4,
    marginTop: 8,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionLabelPdf: { marginTop: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 6,
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 12,
  },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  rowTitle: { fontSize: 15 },
  rowSub: { fontSize: 12, marginTop: 2, lineHeight: 18 },
  proBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(198,158,72,0.18)',
  },
  proBadgeText: { fontSize: 9, letterSpacing: 0.6, fontWeight: '600' },
});
