/**
 * 樹種 (species) ピッカー画面 (Phase G1、ADR-0024 Provisionally Accepted)。
 *
 * 旧 `SpeciesPickerSheet.tsx` (`@gorhom/bottom-sheet` snap 72%) を画面化、
 * `(modals)/species-picker` route で `presentation: 'formSheet'` 配下に配置。
 *
 * locale 別の通称 (commonName) + 学名 (scientificName) を表示、search で絞り込み。
 * 選択時に `usePickerStore.setSpeciesPickerResult` + `router.back()` で caller に返却。
 */
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

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
import { getAllSpecies, type SpeciesWithName } from '@/src/db/speciesRepository';
import { usePickerStore } from '@/src/stores/pickerStore';

export default function SpeciesPickerScreen() {
  const { t, lang } = useTranslation();
  const c = useColors();
  const params = useLocalSearchParams<{ initial?: string }>();
  const [speciesList, setSpeciesList] = useState<SpeciesWithName[]>([]);
  const [query, setQuery] = useState('');
  const [current, setCurrent] = useState<string | null>(params.initial ?? null);

  useEffect(() => {
    let cancelled = false;
    void getAllSpecies(lang).then((list) => {
      if (!cancelled) setSpeciesList(list);
    });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const filtered = query.trim()
    ? speciesList.filter((s) =>
        `${s.commonName}${s.scientificName}`.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : speciesList;

  const handleSelect = (id: string | null) => {
    setCurrent(id);
    usePickerStore.getState().setSpeciesPickerResult(id);
    router.back();
  };

  return (
    <View
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_species_picker_screen"
    >
      <View style={styles.searchWrap}>
        <TextInput
          testID="e2e_species_picker_search"
          style={[styles.input, { color: c.text, borderColor: c.border }]}
          value={query}
          onChangeText={setQuery}
          placeholder={t('bonsaiFieldSpeciesSearch')}
          placeholderTextColor={c.textSecondary}
        />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable
          testID="e2e_species_option_none"
          accessibilityRole="button"
          accessibilityLabel="未選択"
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
              testID={`e2e_species_option_${s.id}`}
              accessibilityRole="button"
              accessibilityLabel={s.commonName}
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
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
