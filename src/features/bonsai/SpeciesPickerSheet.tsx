/**
 * 樹種ピッカー BottomSheet (T2-5、Tier 2)。
 *
 * mockup create-screens.jsx SpeciesPickerSheet (L1205-) 整合の BottomSheet モーダル。
 * BonsaiCreateSheet から呼び出され、検索 + リスト選択で speciesId を返却。
 *
 * snap point 72% (mockup と同じ、リスト表示に十分な高さ)。
 */
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  BRAND_GREEN_BG,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import type { SpeciesWithName } from '@/src/db/speciesRepository';

type Props = {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  speciesList: readonly SpeciesWithName[];
  /** 現在選択中の speciesId (未選択なら null)。 */
  current: string | null;
  onSelect: (speciesId: string | null) => void;
};

export function SpeciesPickerSheet({ bottomSheetRef, speciesList, current, onSelect }: Props) {
  const { t } = useTranslation();
  const c = useColors();
  const snapPoints = useMemo(() => ['72%'], []);
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? speciesList.filter((s) =>
        `${s.commonName}${s.scientificName}`.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : speciesList;

  const handleSelect = useCallback(
    (id: string | null) => {
      onSelect(id);
      bottomSheetRef.current?.close();
    },
    [bottomSheetRef, onSelect],
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: c.background }}
      handleIndicatorStyle={{ backgroundColor: c.border }}
    >
      <View style={styles.header}>
        <ThemedText type="defaultSemiBold" style={styles.title}>
          {t('bonsaiFieldSpecies')}
        </ThemedText>
      </View>
      <View style={styles.searchWrap}>
        <BottomSheetTextInput
          style={[styles.input, { color: c.text, borderColor: c.border }]}
          value={query}
          onChangeText={setQuery}
          placeholder={t('bonsaiFieldSpeciesSearch')}
          placeholderTextColor={c.textSecondary}
        />
      </View>
      <BottomSheetScrollView contentContainerStyle={styles.scroll}>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: current == null }}
          style={[styles.row, current == null && styles.rowSelected]}
          onPress={() => handleSelect(null)}
        >
          <ThemedText style={current == null ? styles.rowTextSelected : undefined}>―</ThemedText>
        </Pressable>
        {filtered.map((s) => {
          const selected = s.id === current;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => handleSelect(s.id)}
            >
              <ThemedText style={selected ? styles.rowTextSelected : undefined}>
                {s.commonName}
              </ThemedText>
              <ThemedText style={styles.rowSci}>{s.scientificName}</ThemedText>
            </Pressable>
          );
        })}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  title: { fontSize: 18 },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 10 },
  input: {
    height: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    backgroundColor: BG_SURFACE,
    fontSize: 16,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 32, gap: 4 },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_DEFAULT,
    minHeight: 48,
  },
  rowSelected: { backgroundColor: BRAND_GREEN_BG, borderBottomColor: BRAND_GREEN },
  rowTextSelected: { fontWeight: '600' },
  rowSci: { fontSize: 12, color: TEXT_SECONDARY, fontStyle: 'italic', marginTop: 2 },
});
