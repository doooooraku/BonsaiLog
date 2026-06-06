/**
 * 盆栽の複数選択用 atom コンポーネント (Sess56、Phase 6 FSD 境界 ADR-0048 準拠)。
 *
 * 写真サムネ (56px) + 名前 + 樹種 + 右端チェックボックス (✓) の Pressable カード。
 * 「予定/記録の盆栽を選ぶ」 (`BonsaiMultiSelectScreen`) と 「エクスポート Sheet の対象=選択した盆栽」
 * (`ExportOptionsSheet`) で共用し、UI と動作を一元化する (旧: 両方が独自に同等カード/素朴行を持って
 * 重複していた問題を解消)。将来は個別 PDF picker (`app/export/pdf.tsx`) の単一選択 mode 拡張も視野。
 *
 * - **内部 state を持たない**: 親が `selected` を制御。再利用時に「予定/記録 flow」 と
 *   「エクスポート flow」 の選択結果が混線しない (pickerStore.bulkContext には直接触らない)。
 * - **配置**: `src/components/bonsai/` (components 層、features より下層) に置くことで
 *   FSD 境界 (ADR-0048) を侵さずに features/event ↔ features/export 双方から安全に呼べる。
 */
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CheckIcon } from '@/src/components/icons';
// Sess68 PR #C: BG_SURFACE / BORDER_DEFAULT は inline c.* 化 (既に inline 反映済)。
// Sess70 PR-C2: BRAND_GREEN / ON_BRAND も scheme-aware (c.tint / c.onTint) に移行
// (ADR-0015/0052 Sess69 PR-A Amendment 整合)。
import { useColors } from '@/src/core/theme/useColors';
import { BonsaiPlaceholder, hashSeed } from '@/src/features/bonsai/BonsaiPlaceholder';

type Props = {
  id: string;
  name: string;
  coverUri: string | null;
  speciesCommonName: string | null;
  selected: boolean;
  onPress: (id: string) => void;
  testID?: string;
};

export function BonsaiSelectableCard({
  id,
  name,
  coverUri,
  speciesCommonName,
  selected,
  onPress,
  testID,
}: Props) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={name}
      style={[
        styles.card,
        { backgroundColor: c.surface, borderColor: selected ? c.tint : c.border },
        selected && [styles.cardSelected, { backgroundColor: c.tintSubtle }],
      ]}
      onPress={() => onPress(id)}
      testID={testID}
    >
      <View style={styles.thumbBox}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.thumb} />
        ) : (
          <BonsaiPlaceholder size={56} seed={hashSeed(id)} radius={10} />
        )}
      </View>
      <View style={styles.cardBody}>
        <ThemedText style={[styles.cardTitle, { color: c.text }]} numberOfLines={1}>
          {name}
        </ThemedText>
        {speciesCommonName ? (
          <ThemedText style={[styles.cardDesc, { color: c.textSecondary }]} numberOfLines={1}>
            {speciesCommonName}
          </ThemedText>
        ) : null}
      </View>
      <View
        style={[
          styles.checkBox,
          {
            backgroundColor: selected ? c.tint : 'transparent',
            borderColor: selected ? c.tint : c.border,
          },
        ]}
      >
        {selected ? <CheckIcon size={18} color={c.onTint} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  // Sess70 PR-C2: bg は inline c.tintSubtle (scheme-aware、 旧 rgba 半透明緑は撤回)。
  cardSelected: {},
  thumbBox: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
  },
  thumb: { width: 56, height: 56 },
  cardBody: { flex: 1, minWidth: 0, gap: 2 },
  cardTitle: { fontSize: 15, fontWeight: '500' },
  cardDesc: { fontSize: 12 },
  checkBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
