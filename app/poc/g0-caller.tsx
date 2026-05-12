/**
 * G0 PoC 用 caller 画面 (ADR-0024 / Issue #475 Phase G0)。
 *
 * 3 案 (X push / Y modal / Z formSheet) の SpeciesPicker を呼び出す button を提供。
 * 戻り値 (selected species) を画面に表示することで、Maestro flow が反映確認可能。
 *
 * Maestro flow からは `bonsailog://poc/g0-caller` で deep link 起動。
 * 各 button tap → picker 開く → 候補選択 → router.back() → caller で結果表示。
 */
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { usePickerStore } from '@/src/stores/pickerStore';

export default function G0CallerScreen() {
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const result = usePickerStore.getState().consumeSpeciesPickerResult();
      if (result !== undefined) {
        setSelectedSpecies(result);
      }
    }, []),
  );

  return (
    <View style={styles.container} testID="e2e_g0_caller_screen">
      <ThemedText type="title" style={styles.title}>
        G0 PoC caller
      </ThemedText>
      <ThemedText style={styles.desc}>
        SpeciesPicker 3 案 (X push / Y modal / Z formSheet) を実機で検証
      </ThemedText>

      <View style={styles.resultBox}>
        <ThemedText type="defaultSemiBold">現在の選択 (selected species):</ThemedText>
        <ThemedText style={styles.resultText} testID="e2e_g0_caller_result">
          {selectedSpecies === null ? '(未選択)' : selectedSpecies}
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.buttonContainer}>
        <Pressable
          testID="e2e_g0_caller_btn_x"
          accessibilityRole="button"
          accessibilityLabel="X 案 push を開く"
          style={[styles.btn, styles.btnX]}
          onPress={() =>
            router.push({
              pathname: '/bonsai/species-picker-x',
              params: selectedSpecies ? { initial: selectedSpecies } : {},
            })
          }
        >
          <ThemedText style={styles.btnText}>X 案: 完全画面 push を開く</ThemedText>
          <ThemedText style={styles.btnSub}>`router.push(/bonsai/species-picker-x)`</ThemedText>
        </Pressable>

        <Pressable
          testID="e2e_g0_caller_btn_y"
          accessibilityRole="button"
          accessibilityLabel="Y 案 modal を開く"
          style={[styles.btn, styles.btnY]}
          onPress={() =>
            router.push({
              pathname: '/(modals)/species-picker-y',
              params: selectedSpecies ? { initial: selectedSpecies } : {},
            })
          }
        >
          <ThemedText style={styles.btnText}>Y 案: presentation modal を開く</ThemedText>
          <ThemedText style={styles.btnSub}>`router.push(/(modals)/species-picker-y)`</ThemedText>
        </Pressable>

        <Pressable
          testID="e2e_g0_caller_btn_z"
          accessibilityRole="button"
          accessibilityLabel="Z 案 formSheet を開く"
          style={[styles.btn, styles.btnZ]}
          onPress={() =>
            router.push({
              pathname: '/(modals)/species-picker-z',
              params: selectedSpecies ? { initial: selectedSpecies } : {},
            })
          }
        >
          <ThemedText style={styles.btnText}>Z 案: presentation formSheet を開く</ThemedText>
          <ThemedText style={styles.btnSub}>
            detents:[0.5, 1] + contentStyle:{"{height:'100%'}"}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F3E8', padding: 16 },
  title: { fontSize: 24, marginBottom: 8 },
  desc: { fontSize: 14, color: '#767066', marginBottom: 24 },
  resultBox: {
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9D2BD',
    marginBottom: 24,
    gap: 8,
  },
  resultText: { fontSize: 18, fontWeight: '600' },
  buttonContainer: { gap: 12, paddingBottom: 32 },
  btn: {
    padding: 16,
    borderRadius: 12,
    minHeight: 72,
    justifyContent: 'center',
  },
  btnX: { backgroundColor: '#E0E7FF' },
  btnY: { backgroundColor: '#FEF3C7' },
  btnZ: { backgroundColor: '#D1FAE5' },
  btnText: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  btnSub: { fontSize: 12, color: '#767066', fontFamily: 'Courier' },
});
