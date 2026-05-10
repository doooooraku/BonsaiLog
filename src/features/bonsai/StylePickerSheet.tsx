/**
 * 樹形ピッカー BottomSheet (T2-5、Tier 2)。
 *
 * mockup create-screens.jsx StylePickerSheet (L1422-) 整合の BottomSheet モーダル。
 * BonsaiCreateSheet から呼び出され、chip 選択で BonsaiStyle を返却。
 *
 * snap point 60% (mockup より少し低め、10 種の chip 表示に十分)。
 */
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import { BG_SURFACE, BORDER_DEFAULT, BRAND_GREEN, ON_BRAND } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { BONSAI_STYLES, type BonsaiStyle } from '@/src/db/schema';

type Props = {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  current: BonsaiStyle | null;
  onSelect: (style: BonsaiStyle | null) => void;
};

export function StylePickerSheet({ bottomSheetRef, current, onSelect }: Props) {
  const { t } = useTranslation();
  const c = useColors();
  const snapPoints = useMemo(() => ['60%'], []);

  const handleSelect = useCallback(
    (s: BonsaiStyle | null) => {
      onSelect(s);
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
          {t('bonsaiFieldStyle')}
        </ThemedText>
      </View>
      <BottomSheetScrollView contentContainerStyle={styles.scroll}>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: current == null }}
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
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => handleSelect(s)}
            >
              <ThemedText style={selected ? styles.chipTextSelected : styles.chipText}>
                {t(labelKey)}
              </ThemedText>
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
