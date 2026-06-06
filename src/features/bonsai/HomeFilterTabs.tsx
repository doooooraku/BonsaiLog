/**
 * 盆栽タブのフィルタ chip 行 (Claude Design `home-screens.jsx HomeFilterTabs` 整合)。
 *
 * - 横スクロール可能な chip リスト
 * - 「すべて」+ 既存タグ (TagRecord[]) を chip 表示
 * - 選択中 chip は BRAND_GREEN 背景 + ON_BRAND テキスト、未選択は border + TEXT_SECONDARY
 * - radius 8、minHeight 36 (タップ領域確保)
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
// Sess68 PR #C: BORDER_DEFAULT / TEXT_SECONDARY は inline c.* 化、 BRAND_GREEN / ON_BRAND は brand-static で保持。
import { BRAND_GREEN, ON_BRAND } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';

export type FilterChip = {
  /** id='ALL' は「すべて」を表す予約値。それ以外は tag.id。 */
  id: string;
  label: string;
};

type Props = {
  chips: readonly FilterChip[];
  selectedId: string;
  onSelect: (id: string) => void;
  testID?: string;
};

export function HomeFilterTabs({ chips, selectedId, onSelect, testID }: Props) {
  const themeColors = useColors();
  return (
    <View style={[styles.container, { borderBottomColor: themeColors.border }]} testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {chips.map((c) => {
          const on = c.id === selectedId;
          return (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={c.label}
              style={[styles.chip, { borderColor: themeColors.border }, on && styles.chipOn]}
              onPress={() => onSelect(c.id)}
              testID={`e2e_home_filter_chip_${c.id}`}
            >
              <ThemedText
                style={[
                  styles.chipText,
                  { color: themeColors.textSecondary },
                  on && styles.chipTextOn,
                ]}
                numberOfLines={1}
              >
                {c.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderBottomWidth: 1 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipOn: { borderColor: BRAND_GREEN, backgroundColor: BRAND_GREEN },
  chipText: { fontSize: 13, letterSpacing: 0.3 },
  chipTextOn: { color: ON_BRAND, fontWeight: '500' },
});
