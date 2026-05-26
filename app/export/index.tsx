/**
 * F-10 エクスポート Hub 画面 (Issue #33 / ADR-0016 AC11 Hub)。
 *
 * 役割: 5 種類のエクスポート (CSV×3 / PDF×2) を 1 画面に集約した「玄関」。
 * CSV セクション (盆栽一覧 / 作業履歴 / 樹種別サマリ) と PDF セクション
 * (個別盆栽レポート / 全盆栽リスト) に分けて表示し、各行 tap で種類別画面へ遷移。
 *
 * Pro 制限ロジックは遷移先の各画面側 (useProStore.isPro + useGoToPaywall)。
 * mockup v1.0 (04-Export.html ExportHubScreen) 整合。Design は下書き、Pro 限定は
 * ADR-0009 / 0011 / 0016 が正 (mockup の「全件 Free」注記は不採用)。
 */
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FormScreenHeader } from '@/src/components/form/FormScreenHeader';
import { ChevronRightIcon } from '@/src/components/icons';
import { type TranslationKey, useTranslation } from '@/src/core/i18n/i18n';
import {
  ACCENT_GOLD,
  BG_PRIMARY,
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';

type ExportFmt = 'CSV' | 'PDF';

type ExportTypeDef = {
  k: string;
  fmt: ExportFmt;
  route: string;
  titleKey: TranslationKey;
  subKey: TranslationKey;
};

const EXPORT_TYPES: readonly ExportTypeDef[] = [
  {
    k: 'bonsai_csv',
    fmt: 'CSV',
    route: '/export/bonsai-csv',
    titleKey: 'exportHubBonsaiCsvTitle',
    subKey: 'exportHubBonsaiCsvSub',
  },
  {
    k: 'events_csv',
    fmt: 'CSV',
    route: '/export/csv',
    titleKey: 'exportHubEventsCsvTitle',
    subKey: 'exportHubEventsCsvSub',
  },
  {
    k: 'species_csv',
    fmt: 'CSV',
    route: '/export/species-csv',
    titleKey: 'exportHubSpeciesCsvTitle',
    subKey: 'exportHubSpeciesCsvSub',
  },
  {
    k: 'bonsai_pdf',
    fmt: 'PDF',
    route: '/export/pdf',
    titleKey: 'exportHubBonsaiPdfTitle',
    subKey: 'exportHubBonsaiPdfSub',
  },
  {
    k: 'list_pdf',
    fmt: 'PDF',
    route: '/export/list-pdf',
    titleKey: 'exportHubListPdfTitle',
    subKey: 'exportHubListPdfSub',
  },
];

function FormatBadge({ fmt }: { fmt: ExportFmt }) {
  const isCsv = fmt === 'CSV';
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isCsv ? 'rgba(31,58,46,0.08)' : 'rgba(198,158,72,0.14)',
          borderColor: isCsv ? BRAND_GREEN : ACCENT_GOLD,
        },
      ]}
    >
      <ThemedText style={[styles.badgeText, { color: isCsv ? BRAND_GREEN : '#8c6b25' }]}>
        {fmt}
      </ThemedText>
    </View>
  );
}

function ExportRow({ def, onPress }: { def: ExportTypeDef; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(def.titleKey)}
      testID={`e2e_export_hub_row_${def.k}`}
      style={styles.row}
      onPress={onPress}
    >
      <FormatBadge fmt={def.fmt} />
      <View style={styles.rowMain}>
        <View style={styles.rowTitleLine}>
          <ThemedText type="defaultSemiBold" style={styles.rowTitle}>
            {t(def.titleKey)}
          </ThemedText>
          <View style={styles.proBadge}>
            <ThemedText style={styles.proBadgeText}>{t('proBadgeShort')}</ThemedText>
          </View>
        </View>
        <ThemedText style={styles.rowSub}>{t(def.subKey)}</ThemedText>
      </View>
      <ChevronRightIcon size={16} color={TEXT_MUTED} />
    </Pressable>
  );
}

export default function ExportHubScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const csvTypes = EXPORT_TYPES.filter((d) => d.fmt === 'CSV');
  const pdfTypes = EXPORT_TYPES.filter((d) => d.fmt === 'PDF');

  return (
    <ThemedView style={styles.container} testID="e2e_export_hub_screen">
      <FormScreenHeader title={t('settingsExportSection')} testID="e2e_export_hub_header" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <ThemedText style={styles.heroTitle}>{t('exportHubHeroTitle')}</ThemedText>
          <ThemedText style={styles.heroBody}>{t('exportHubHeroBody')}</ThemedText>
        </View>

        <ThemedText style={styles.sectionLabel}>{t('exportHubCsvSection')}</ThemedText>
        {csvTypes.map((def) => (
          <ExportRow key={def.k} def={def} onPress={() => router.push(def.route as Href)} />
        ))}

        <ThemedText style={[styles.sectionLabel, styles.sectionLabelPdf]}>
          {t('exportHubPdfSection')}
        </ThemedText>
        {pdfTypes.map((def) => (
          <ExportRow key={def.k} def={def} onPress={() => router.push(def.route as Href)} />
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_PRIMARY },
  scroll: { padding: 16, paddingBottom: 40 },
  hero: { marginBottom: 20 },
  heroTitle: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 22,
    lineHeight: 32,
    color: TEXT_PRIMARY,
  },
  heroBody: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: TEXT_SECONDARY,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.4,
    color: TEXT_MUTED,
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
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  rowTitle: { fontSize: 15, color: TEXT_PRIMARY },
  rowSub: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2, lineHeight: 18 },
  proBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(198,158,72,0.18)',
  },
  proBadgeText: { fontSize: 9, letterSpacing: 0.6, color: TEXT_PRIMARY, fontWeight: '600' },
});
