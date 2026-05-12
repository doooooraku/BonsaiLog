/**
 * G0 PoC 用 SpeciesPicker 画面 (ADR-0024 / Issue #475 Phase G0)。
 *
 * 既存 `SpeciesPickerSheet.tsx` の中身を画面化 + mock data 埋め込み。
 * X/Y/Z 3 ブランチ (push / modal / formSheet) で route から default export 共通利用。
 * Maestro 5 回反復で安定性検証。
 *
 * 実 DB 統合は Phase G1 で実施 (本 PoC は presentation 比較のみが目的)。
 */
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { usePickerStore } from '@/src/stores/pickerStore';

// PoC mock data (Phase G1 で実 DB hook に置換予定)。
const POC_SPECIES_LIST = [
  { id: 'kuromatsu', commonName: '黒松', scientificName: 'Pinus thunbergii' },
  { id: 'akamatsu', commonName: '赤松', scientificName: 'Pinus densiflora' },
  { id: 'goyo-matsu', commonName: '五葉松', scientificName: 'Pinus parviflora' },
  { id: 'momiji', commonName: '紅葉', scientificName: 'Acer palmatum' },
  { id: 'shimpaku', commonName: '真柏', scientificName: 'Juniperus chinensis' },
] as const;

export default function SpeciesPickerScreen() {
  const params = useLocalSearchParams<{ initial?: string }>();
  const [query, setQuery] = useState('');
  const [current, setCurrent] = useState<string | null>(params.initial ?? null);

  const filtered = query.trim()
    ? POC_SPECIES_LIST.filter(
        (s) =>
          s.commonName.includes(query.trim()) ||
          s.scientificName.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : POC_SPECIES_LIST;

  const handleSelect = (id: string | null) => {
    setCurrent(id);
    usePickerStore.getState().setSpeciesPickerResult(id);
    router.back();
  };

  return (
    <View style={styles.container} testID="e2e_species_picker_screen">
      <View style={styles.header}>
        <ThemedText type="defaultSemiBold" style={styles.title}>
          樹種を選ぶ
        </ThemedText>
      </View>
      <View style={styles.searchWrap}>
        <TextInput
          testID="e2e_species_picker_search"
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="樹種名で検索"
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
          <ThemedText>―</ThemedText>
        </Pressable>
        {filtered.map((s) => (
          <Pressable
            key={s.id}
            testID={`e2e_species_option_${s.id}`}
            accessibilityRole="button"
            accessibilityLabel={s.commonName}
            style={[styles.row, s.id === current && styles.rowSelected]}
            onPress={() => handleSelect(s.id)}
          >
            <ThemedText>{s.commonName}</ThemedText>
            <ThemedText style={styles.rowSci}>{s.scientificName}</ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F3E8' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 18 },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 10 },
  input: {
    height: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#D9D2BD',
    borderRadius: 12,
    backgroundColor: '#FFF',
    fontSize: 16,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 32, gap: 4 },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    minHeight: 48,
  },
  rowSelected: { backgroundColor: '#E8F0DC' },
  rowSci: { fontSize: 12, color: '#767066', fontStyle: 'italic', marginTop: 2 },
});
