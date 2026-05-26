/**
 * F-10 CSV プレビュー画面 (Issue #33 / ADR-0016 AC11 CSV Preview = 7 画面目)。
 *
 * Options Sheet (CSV 3 種) の「プレビュー」で遷移。条件を JSON パラメータで受け取り
 * loadCsvForPreview で CSV 文字列を生成。Excel 風の表 / 生テキストを切替表示し、
 * 共有ボタンで shareExportFile (cacheDirectory → Share Sheet)。
 */
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FormScreenHeader } from '@/src/components/form/FormScreenHeader';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_PRIMARY,
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  ON_BRAND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { CSV_BOM } from '@/src/features/export/csvExport';
import {
  type ExportOptions,
  loadCsvForPreview,
  shareExportFile,
} from '@/src/features/export/exportFlow';

/** RFC 4180 の 1 行を cell 配列へ。escapeCsvField の "" エスケープに対応。 */
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuote = true;
    } else if (c === ',') {
      cells.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  cells.push(cur);
  return cells;
}

export default function ExportCsvPreviewScreen() {
  const { t, lang } = useTranslation();
  const { opts: optsParam } = useLocalSearchParams<{ opts: string }>();
  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState<'grid' | 'text'>('grid');
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

  // BOM を除去して行 → cell へ分解 (表表示用)
  const rows = useMemo(() => {
    if (!csv) return [];
    const body = csv.startsWith(CSV_BOM) ? csv.slice(CSV_BOM.length) : csv;
    return body.split('\r\n').map(parseCsvLine);
  }, [csv]);

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

      <View style={styles.toggleRow}>
        {(['grid', 'text'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={[styles.toggle, mode === m && styles.toggleOn]}
            testID={`e2e_export_csv_preview_${m}`}
          >
            <ThemedText style={[styles.toggleText, mode === m && styles.toggleTextOn]}>
              {m === 'grid' ? t('exportCsvPreviewGrid') : t('exportCsvPreviewText')}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {csv === null ? (
        <View style={styles.loading}>
          <ActivityIndicator color={BRAND_GREEN} />
        </View>
      ) : mode === 'grid' ? (
        <ScrollView
          style={styles.gridScroll}
          nestedScrollEnabled
          testID="e2e_export_csv_preview_grid_view"
        >
          <ScrollView horizontal nestedScrollEnabled>
            <View>
              {rows.map((cells, ri) => (
                <View key={ri} style={[styles.gridRow, ri === 0 && styles.gridHeaderRow]}>
                  {cells.map((cell, ci) => (
                    <View key={ci} style={styles.gridCell}>
                      <ThemedText style={[styles.cellText, ri === 0 && styles.headerCellText]}>
                        {cell}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
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

const CELL_WIDTH = 120;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_PRIMARY },
  toggleRow: { flexDirection: 'row', gap: 8, padding: 12 },
  toggle: {
    minHeight: 36,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
  },
  toggleOn: { backgroundColor: BRAND_GREEN, borderColor: BRAND_GREEN },
  toggleText: { fontSize: 13, color: TEXT_SECONDARY },
  toggleTextOn: { color: ON_BRAND, fontWeight: '500' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gridScroll: { flex: 1 },
  gridRow: { flexDirection: 'row' },
  gridHeaderRow: { backgroundColor: BG_SURFACE },
  gridCell: {
    width: CELL_WIDTH,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 0.5,
    borderColor: BORDER_DEFAULT,
  },
  cellText: { fontSize: 12, color: TEXT_PRIMARY },
  headerCellText: { fontWeight: '700' },
  textScroll: { flex: 1, paddingHorizontal: 16 },
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
