/**
 * 盆栽新規登録 BottomSheet (T2-1、Tier 2 着手 PR)。
 *
 * mockup `home-screens.jsx CreateBonsaiScreen` (L?) に整合する BottomSheet モーダル化の最小スコープ。
 * 旧 `app/(tabs)/bonsai/new.tsx` (独立 page) を BottomSheet に移植 — 機能維持のみ、機能追加は T2-2 以降。
 *
 * 既存 4 項目 (name / 樹種 / 樹形 / 取得日) を BottomSheet 内 ScrollView に配置:
 * - name (必須、64 字)
 * - 樹種選択 (検索 + inline list、50 種)
 * - 樹形選択 (chip、10 種)
 * - 取得日 (YYYY-MM-DD inline 入力、Tier 2 後半で DateTimePicker 化予定)
 *
 * Props:
 * - bottomSheetRef: 親が snapToIndex / close を制御する ref
 * - onCreated: 新規登録成功後のコールバック (親が router.push などを実行)
 *
 * Tier 2 残課題 (本 PR スコープ外):
 * - T2-2: 写真追加 UI (ADR-0022 1 件 1 枚厳密)
 * - T2-3: 樹齢入力 + Bonsai schema 拡張
 * - T2-4: 購入日入力 + Bonsai schema 拡張
 * - T2-5: 樹種 / 樹形 を専用 Picker Sheet に分離 (mockup 04 / 04b 整合)
 * - T2-6: タグ入力強化
 * - T2-7: メモ入力 + Footer CTA + 必須/任意ラベル
 */
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { nowUtc } from '@/src/core/datetime/clock';
import { useTranslation } from '@/src/core/i18n/i18n';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  BRAND_GREEN_BG,
  DISABLED_BG,
  ON_BRAND,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { createBonsai } from '@/src/db/bonsaiRepository';
import { BONSAI_STYLES, type BonsaiStyle } from '@/src/db/schema';
import { getAllSpecies, type SpeciesWithName } from '@/src/db/speciesRepository';

type Props = {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  /** 新規登録成功後のコールバック (親が router.push などを実行)。 */
  onCreated: (bonsaiId: string) => void;
  /** Sheet が閉じた時のコールバック (親が state リセット等)。 */
  onClose?: () => void;
};

/** YYYY-MM-DD → ISO 8601 UTC TEXT (00:00:00Z)。new.tsx から移植、ADR-0008 §TZ 整合で nowUtc 使用。 */
function toIsoUtc(yyyymmdd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyymmdd);
  if (!m) return nowUtc();
  const [, y, mo, d] = m;
  return `${y}-${mo}-${d}T00:00:00.000Z`;
}

export function BonsaiCreateSheet({ bottomSheetRef, onCreated, onClose }: Props) {
  const { t, lang } = useTranslation();
  const c = useColors();
  const snapPoints = useMemo(() => ['90%'], []);

  const [name, setName] = useState('');
  const [speciesId, setSpeciesId] = useState<string | null>(null);
  const [speciesList, setSpeciesList] = useState<SpeciesWithName[]>([]);
  const [speciesQuery, setSpeciesQuery] = useState('');
  const [style, setStyle] = useState<BonsaiStyle | null>(null);
  const [acquiredAt, setAcquiredAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getAllSpecies(lang).then((list) => {
      if (!cancelled) setSpeciesList(list);
    });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const filteredSpecies = speciesQuery.trim()
    ? speciesList.filter((s) =>
        `${s.commonName}${s.scientificName}`
          .toLowerCase()
          .includes(speciesQuery.trim().toLowerCase()),
      )
    : speciesList;

  const canSubmit = name.trim().length > 0 && !submitting;

  const handleClose = useCallback(() => {
    setName('');
    setSpeciesId(null);
    setSpeciesQuery('');
    setStyle(null);
    setAcquiredAt('');
    onClose?.();
  }, [onClose]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) handleClose();
    },
    [handleClose],
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const bonsai = await createBonsai({
        name: name.trim(),
        speciesId,
        style,
        acquiredAt: acquiredAt.trim() ? toIsoUtc(acquiredAt.trim()) : null,
      });
      bottomSheetRef.current?.close();
      onCreated(bonsai.id);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={handleSheetChange}
      backgroundStyle={{ backgroundColor: c.background }}
      handleIndicatorStyle={{ backgroundColor: c.border }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">{t('bonsaiFieldName')} *</ThemedText>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('bonsaiFieldNamePlaceholder')}
            accessibilityLabel={t('bonsaiFieldName')}
            maxLength={64}
          />
        </View>

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">{t('bonsaiFieldSpecies')}</ThemedText>
          <TextInput
            style={styles.input}
            value={speciesQuery}
            onChangeText={setSpeciesQuery}
            placeholder={t('bonsaiFieldSpeciesSearch')}
            accessibilityLabel={t('bonsaiFieldSpeciesSearch')}
          />
          <View style={styles.speciesScroll}>
            {filteredSpecies.slice(0, 30).map((s) => {
              const selected = s.id === speciesId;
              return (
                <Pressable
                  key={s.id}
                  style={[styles.speciesRow, selected && styles.speciesRowSelected]}
                  onPress={() => setSpeciesId(selected ? null : s.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={s.commonName}
                >
                  <ThemedText style={selected ? styles.speciesNameSelected : undefined}>
                    {s.commonName}
                  </ThemedText>
                  <ThemedText style={styles.speciesSci}>{s.scientificName}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">{t('bonsaiFieldStyle')}</ThemedText>
          <View style={styles.styleRow}>
            {BONSAI_STYLES.map((s) => {
              const selected = s === style;
              const labelKey = `bonsaiStyle_${s}` as TranslationKey;
              return (
                <Pressable
                  key={s}
                  style={[styles.styleChip, selected && styles.styleChipSelected]}
                  onPress={() => setStyle(selected ? null : s)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t(labelKey)}
                >
                  <ThemedText
                    style={selected ? styles.styleChipTextSelected : styles.styleChipText}
                  >
                    {t(labelKey)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">{t('bonsaiFieldAcquiredAt')}</ThemedText>
          <TextInput
            style={styles.input}
            value={acquiredAt}
            onChangeText={setAcquiredAt}
            placeholder="YYYY-MM-DD"
            accessibilityLabel={t('bonsaiFieldAcquiredAt')}
            maxLength={10}
            keyboardType="numbers-and-punctuation"
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('save')}
          accessibilityState={{ disabled: !canSubmit }}
          style={[styles.submit, !canSubmit && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          testID="e2e_bonsai_create_submit"
        >
          <ThemedText style={styles.submitText}>{t('save')}</ThemedText>
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, gap: 16, paddingBottom: 32 },
  field: { gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
    backgroundColor: BG_SURFACE,
  },
  speciesScroll: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    backgroundColor: BG_SURFACE,
  },
  speciesRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
  },
  speciesRowSelected: { backgroundColor: BRAND_GREEN_BG },
  speciesNameSelected: { fontWeight: '600' },
  speciesSci: { fontSize: 12, color: TEXT_SECONDARY, fontStyle: 'italic' },
  styleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  styleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    minHeight: 36,
    justifyContent: 'center',
    backgroundColor: BG_SURFACE,
  },
  styleChipSelected: { backgroundColor: BRAND_GREEN, borderColor: BRAND_GREEN },
  styleChipText: { fontSize: 13 },
  styleChipTextSelected: { fontSize: 13, color: ON_BRAND, fontWeight: '600' },
  submit: {
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  submitDisabled: { backgroundColor: DISABLED_BG },
  submitText: { color: ON_BRAND, fontSize: 17, fontWeight: '500', letterSpacing: 0.5 },
});
