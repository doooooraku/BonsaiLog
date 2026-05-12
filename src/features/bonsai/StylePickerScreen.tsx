/**
 * 樹形 (BonsaiStyle) ピッカー画面 (Phase G1、ADR-0024 Provisionally Accepted)。
 *
 * 旧 `StylePickerSheet.tsx` (`@gorhom/bottom-sheet` snap 60%) を画面化、
 * `(modals)/style-picker` route で `presentation: 'formSheet'` 配下に配置。
 *
 * BONSAI_STYLES (10 種) を chip grid 表示、選択時に `usePickerStore.setStylePickerResult` +
 * `router.back()` で caller に返却。
 */
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import { BG_SURFACE, BORDER_DEFAULT, BRAND_GREEN, ON_BRAND } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { BONSAI_STYLES, type BonsaiStyle } from '@/src/db/schema';
import { usePickerStore } from '@/src/stores/pickerStore';

export default function StylePickerScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const params = useLocalSearchParams<{ initial?: string }>();
  const initial = params.initial as BonsaiStyle | undefined;
  const [current, setCurrent] = useState<BonsaiStyle | null>(initial ?? null);

  const handleSelect = (s: BonsaiStyle | null) => {
    setCurrent(s);
    usePickerStore.getState().setStylePickerResult(s);
    router.back();
  };

  return (
    <View
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_style_picker_screen"
    >
      <View style={styles.header}>
        <ThemedText type="defaultSemiBold" style={styles.title}>
          {t('bonsaiFieldStyle')}
        </ThemedText>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable
          testID="e2e_style_option_none"
          accessibilityRole="button"
          accessibilityLabel="未選択"
          style={[styles.chip, current == null && styles.chipSelected]}
          onPress={() => handleSelect(null)}
        >
          <ThemedText style={current == null ? styles.chipTextSelected : styles.chipText}>
            ―
          </ThemedText>
        </Pressable>
        {BONSAI_STYLES.map((s) => {
          const selected = s === current;
          const labelKey = `bonsaiStyle_${s}` as TranslationKey;
          return (
            <Pressable
              key={s}
              testID={`e2e_style_option_${s}`}
              accessibilityRole="button"
              accessibilityLabel={t(labelKey)}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => handleSelect(s)}
            >
              <ThemedText style={selected ? styles.chipTextSelected : styles.chipText}>
                {t(labelKey)}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 18 },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: BG_SURFACE,
    minHeight: 40,
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: BRAND_GREEN, borderColor: BRAND_GREEN },
  chipText: { fontSize: 14 },
  chipTextSelected: { fontSize: 14, color: ON_BRAND, fontWeight: '600' },
});
