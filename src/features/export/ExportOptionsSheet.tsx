/**
 * F-10 エクスポート Options Sheet (Issue #33 / ADR-0016 AC11 Options + AC12 Y4)。
 *
 * Hub のリスト系 (bonsai_csv / events_csv / species_csv / list_pdf) 行 tap で開く
 * 下からせり出す Modal。期間 / 対象 (全部/選択/タグ) / アーカイブを選び「生成して共有」。
 *
 * - RN <Modal transparent animationType="slide"> (RowActionMenu パターン、@gorhom 不使用)
 * - 種類別に意味のあるオプションだけ表示 (exportFlow.OPTION_APPLIES)
 * - 条件確定後の生成・共有・生成中オーバーレイは Hub に委譲 (onGenerate)。二重 Modal を避けるため
 *   本 Sheet は出力処理を持たない。Pro 判定も Hub 側で実施済み。
 */
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BonsaiSelectableCard } from '@/src/features/bonsai/BonsaiSelectableCard';
import { LabeledDateRow } from '@/src/components/form/LabeledDateRow';
import { nowUtc } from '@/src/core/datetime/clock';
import { LabeledSegmented } from '@/src/components/form/LabeledSegmented';
import { type TranslationKey, useTranslation } from '@/src/core/i18n/i18n';
// Sess108 PR-D (ADR-0062 Notes #5): BRAND_GREEN を撤回 (inline c.tint 経由)。 ON_BRAND は theme-invariant で保持。
import { ON_BRAND } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { getAllActiveBonsaiWithSpecies } from '@/src/db/bonsaiRepository';
import { getCoverPhoto } from '@/src/db/photoRepository';
import { getMostUsedTags, type TagRecord } from '@/src/db/tagRepository';
import { buildExportFileName, type ExportKind } from './exportFileName';
import {
  type ExportOptions,
  type ExportPeriod,
  type ExportScope,
  type ExportTypeKey,
  OPTION_APPLIES,
} from './exportFlow';
import { isStorageSufficient } from './pdfReliability';

type CardData = {
  id: string;
  name: string;
  coverUri: string | null;
  speciesCommonName: string | null;
};

const KIND_MAP: Record<ExportTypeKey, ExportKind> = {
  bonsai_csv: 'bonsai-csv',
  events_csv: 'events-csv',
  species_csv: 'species-csv',
  list_pdf: 'list-pdf',
};

const TITLE_KEY: Record<ExportTypeKey, TranslationKey> = {
  bonsai_csv: 'exportHubBonsaiCsvTitle',
  events_csv: 'exportHubEventsCsvTitle',
  species_csv: 'exportHubSpeciesCsvTitle',
  list_pdf: 'exportHubListPdfTitle',
};

type Props = {
  visible: boolean;
  type: ExportTypeKey;
  onClose: () => void;
  /** 条件確定後の生成 (生成 + 共有 + 生成中オーバーレイ) は Hub 側に委譲する。 */
  onGenerate: (opts: Omit<ExportOptions, 'lang'>) => void;
};

export function ExportOptionsSheet({ visible, type, onClose, onGenerate }: Props) {
  const { t, lang } = useTranslation();
  const c = useColors();
  const [period, setPeriod] = useState<ExportPeriod>('all');
  const [scope, setScope] = useState<ExportScope>('all');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [tagId, setTagId] = useState<string | undefined>(undefined);
  const [bonsaiCards, setBonsaiCards] = useState<CardData[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);

  const showPeriod = OPTION_APPLIES.period.has(type);
  const showScope = OPTION_APPLIES.scope.has(type);
  const showArchived = OPTION_APPLIES.includeArchived.has(type);

  // sheet が開くたびに条件をリセット (前回の選択を持ち越さない)
  // Sess108 PR-E (React Compiler 整合): visible/type 変化時の form reset は React 推奨「key prop で
  // remount」 pattern もあり得るが、 ExportOptionsSheet は Modal wrapper を呼出側 (ExportTabScreen) で
  // visible 制御している都合上 component swap 不可。 reset 用途は block disable + reason 明示で意図維持。
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- modal open 時の form reset (UX 要件) */
    if (visible) {
      setPeriod('all');
      setScope('all');
      setIncludeArchived(false);
      setDateFrom('');
      setDateTo('');
      setSelectedIds([]);
      setTagId(undefined);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [visible, type]);

  useEffect(() => {
    if (!visible || !showScope) return;
    let cancelled = false;
    // 樹種＋写真を並走取得し BonsaiSelectableCard で表示するための CardData を構築
    // (Sess56: ExportOptionsSheet と BonsaiMultiSelectScreen で同じ atom を共用)。
    async function load() {
      try {
        const bonsai = await getAllActiveBonsaiWithSpecies(lang);
        const cards = await Promise.all(
          bonsai.map(async (b) => {
            const cover = await getCoverPhoto(b.id);
            return {
              id: b.id,
              name: b.name,
              coverUri: cover?.absoluteUri ?? null,
              speciesCommonName: b.species?.commonName ?? null,
            } satisfies CardData;
          }),
        );
        if (!cancelled) setBonsaiCards(cards);
      } catch {
        if (!cancelled) setBonsaiCards([]);
      }
    }
    void load();
    getMostUsedTags(50)
      .then((next) => {
        if (!cancelled) setTags(next);
      })
      .catch(() => {
        if (!cancelled) setTags([]);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, showScope, lang]);

  const fileName = buildExportFileName({
    kind: KIND_MAP[type],
    ext: type === 'list_pdf' ? 'pdf' : 'csv',
    date: new Date(nowUtc() as string),
  });

  const toggleBonsai = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleGenerate = async () => {
    if (showScope && scope === 'selected' && selectedIds.length === 0) {
      Alert.alert(t('exportOptScopeEmptyTitle'), t('exportOptScopeEmptyBody'));
      return;
    }
    if (showScope && scope === 'tag' && !tagId) {
      Alert.alert(t('exportOptScopeEmptyTitle'), t('exportOptTagEmptyBody'));
      return;
    }
    try {
      const freeBytes = await LegacyFileSystem.getFreeDiskStorageAsync();
      if (!isStorageSufficient(freeBytes)) {
        Alert.alert(t('exportStorageLowTitle'), t('exportStorageLowBody'));
        return;
      }
    } catch {
      // チェックスキップ (AC7-2)
    }
    const opts: Omit<ExportOptions, 'lang'> = {
      type,
      period: showPeriod ? period : 'all',
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      scope: showScope ? scope : 'all',
      selectedBonsaiIds: scope === 'selected' ? selectedIds : undefined,
      tagId: scope === 'tag' ? tagId : undefined,
      includeArchived: showArchived ? includeArchived : false,
    };

    // 全 4 種 (CSV 3 + list_pdf) を中間画面なしで即出力。生成 + 共有 + 生成中オーバーレイは
    // Hub 側に委譲する (Sheet の Modal 上にさらに Modal を重ねる二重 Modal を回避)。
    onGenerate(opts);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} testID="e2e_export_options_backdrop">
        <Pressable
          style={[styles.sheet, { backgroundColor: c.background }]}
          onPress={(e) => e.stopPropagation()}
          testID="e2e_export_options_sheet"
        >
          <View style={[styles.grabber, { backgroundColor: c.border }]} />
          <ThemedText type="defaultSemiBold" style={styles.sheetTitle}>
            {t(TITLE_KEY[type])}
          </ThemedText>

          <ScrollView contentContainerStyle={styles.scroll}>
            {showPeriod && (
              <View style={styles.field}>
                <LabeledSegmented
                  label={t('exportOptPeriodLabel')}
                  items={[
                    { v: 'all', l: t('exportOptPeriodAll') },
                    { v: '30d', l: t('exportOptPeriod30d') },
                    { v: '1y', l: t('exportOptPeriod1y') },
                    { v: 'custom', l: t('exportOptPeriodCustom') },
                  ]}
                  value={period}
                  onChange={(v) => setPeriod(v as ExportPeriod)}
                />
                {period === 'custom' && (
                  <View style={styles.dateRange}>
                    <LabeledDateRow
                      label={t('exportOptDateFrom')}
                      value={dateFrom}
                      onChangeText={setDateFrom}
                      maxToday
                    />
                    <LabeledDateRow
                      label={t('exportOptDateTo')}
                      value={dateTo}
                      onChangeText={setDateTo}
                      maxToday
                    />
                  </View>
                )}
              </View>
            )}

            {showScope && (
              <View style={styles.field}>
                <LabeledSegmented
                  label={t('exportOptScopeLabel')}
                  items={[
                    { v: 'all', l: t('exportOptScopeAll') },
                    { v: 'selected', l: t('exportOptScopeSelected') },
                    { v: 'tag', l: t('exportOptScopeTag') },
                  ]}
                  value={scope}
                  onChange={(v) => setScope(v as ExportScope)}
                />
                {scope === 'selected' && (
                  <View style={styles.pickList}>
                    <ThemedText style={[styles.pickHint, { color: c.textMuted }]}>
                      {t('exportOptSelectedCount').replace('{count}', String(selectedIds.length))}
                    </ThemedText>
                    {bonsaiCards.map((card) => (
                      <BonsaiSelectableCard
                        key={card.id}
                        id={card.id}
                        name={card.name}
                        coverUri={card.coverUri}
                        speciesCommonName={card.speciesCommonName}
                        selected={selectedIds.includes(card.id)}
                        onPress={toggleBonsai}
                        testID={`e2e_export_opt_bonsai_${card.id}`}
                      />
                    ))}
                  </View>
                )}
                {scope === 'tag' && (
                  <View style={styles.tagWrap}>
                    {tags.length === 0 ? (
                      <ThemedText style={[styles.pickHint, { color: c.textMuted }]}>
                        {t('exportOptNoTags')}
                      </ThemedText>
                    ) : (
                      tags.map((tg) => {
                        const on = tagId === tg.id;
                        return (
                          <Pressable
                            key={tg.id}
                            style={[
                              styles.tagChip,
                              { borderColor: c.border, backgroundColor: c.surface },
                              on && { borderColor: c.tint, backgroundColor: c.tint },
                            ]}
                            onPress={() => setTagId(on ? undefined : tg.id)}
                            testID={`e2e_export_opt_tag_${tg.id}`}
                          >
                            <ThemedText
                              style={[
                                styles.tagChipText,
                                { color: c.textSecondary },
                                on && styles.tagChipTextOn,
                              ]}
                            >
                              {tg.name}
                            </ThemedText>
                          </Pressable>
                        );
                      })
                    )}
                  </View>
                )}
              </View>
            )}

            {showArchived && (
              <View style={styles.field}>
                <Pressable
                  style={[styles.toggle, { borderColor: c.border, backgroundColor: c.surface }]}
                  onPress={() => setIncludeArchived((v) => !v)}
                  testID="e2e_export_opt_archived"
                >
                  <ThemedText style={styles.toggleLabel}>
                    {t('exportOptIncludeArchived')}
                  </ThemedText>
                  <View
                    style={[
                      styles.switch,
                      { backgroundColor: c.border },
                      includeArchived && { backgroundColor: c.tint },
                    ]}
                  >
                    <View style={[styles.knob, includeArchived && styles.knobOn]} />
                  </View>
                </Pressable>
              </View>
            )}

            <View style={styles.field}>
              <ThemedText style={[styles.fieldLabel, { color: c.textSecondary }]}>
                {t('exportOptFilenameLabel')}
              </ThemedText>
              <View
                style={[styles.filenameBox, { borderColor: c.border, backgroundColor: c.surface }]}
              >
                <ThemedText style={[styles.filenameText, { color: c.textSecondary }]}>
                  {fileName}
                </ThemedText>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: c.border }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('exportOptExport')}
              testID="e2e_export_options_generate"
              style={[styles.cta, { backgroundColor: c.tint }]}
              onPress={handleGenerate}
            >
              <ThemedText style={styles.ctaText}>{t('exportOptExport')}</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(26,26,26,0.4)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '82%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  sheetTitle: { textAlign: 'center', fontSize: 18, paddingHorizontal: 24, paddingBottom: 8 },
  scroll: { paddingHorizontal: 16, paddingBottom: 16 },
  field: { marginBottom: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '500', marginBottom: 8 },
  dateRange: { marginTop: 10, gap: 8 },
  pickList: { marginTop: 8, gap: 8 },
  pickHint: { fontSize: 12, marginBottom: 4 },
  tagWrap: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    minHeight: 36,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
  },
  // Sess108 PR-D: tagChipOn の borderColor / backgroundColor は inline c.tint (dark cascade)
  tagChipText: { fontSize: 13 },
  tagChipTextOn: { color: ON_BRAND },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  toggleLabel: { fontSize: 14 },
  switch: { width: 36, height: 22, borderRadius: 11, padding: 2 },
  // Sess108 PR-D: switchOn の backgroundColor は inline c.tint (dark cascade)
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: ON_BRAND },
  knobOn: { alignSelf: 'flex-end' },
  filenameBox: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  filenameText: { fontSize: 13 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  // Sess108 PR-D: cta の backgroundColor は inline c.tint (dark cascade)
  cta: {
    minHeight: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: ON_BRAND, fontSize: 17, fontWeight: '600' },
});
