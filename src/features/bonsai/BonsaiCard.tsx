/**
 * 盆栽カード (Claude Design `home-screens.jsx BonsaiCard` 整合)。
 *
 * - 写真サムネ 120×120 (cover photo or BonsaiPlaceholder)
 * - 名前 NotoSerifJP 22pt (1 行 ellipsis)
 * - 樹種名 + 学名 italic NotoSansJP 13pt
 * - 樹形 mono 11pt (任意)
 * - 区切り線 + 最後の水やり / 剪定からの日数 (任意)
 * - radius 16、border 1、padding 16、minHeight 152
 *
 * 複数選択モード対応 (mockups v1.0 home-screens.jsx BonsaiCard 整合):
 * - selecting=true 時、写真左上に 24×24 円形チェックマーク overlay (Apple Photos 同型)
 *   - selected=true: BRAND_GREEN 背景 + CheckIcon (washi 色)
 *   - selected=false: BG_SURFACE 背景 + BORDER_STRONG 枠
 * - onLongPress 設定時、長押しで親に通知 (selectMode 入りトリガ用、500ms default)
 */
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CheckIcon, DropletIcon, ScissorsIcon } from '@/src/components/icons';
import {
  ACCENT_BARK,
  BG_SURFACE,
  BORDER_DEFAULT,
  BORDER_STRONG,
  BRAND_GREEN,
  ON_BRAND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';

import { BonsaiPlaceholder, hashSeed } from './BonsaiPlaceholder';

export type BonsaiCardData = {
  id: string;
  name: string;
  speciesCommonName: string | null;
  speciesScientificName: string | null;
  styleLabel: string | null;
  coverUri: string | null;
  /** 「最後の水やりから X 日」の表示文字列 (i18n 済)、null なら非表示。 */
  lastWateringText: string | null;
  /** 「最後の剪定から X 日」の表示文字列 (i18n 済)、null なら非表示。 */
  lastPruningText: string | null;
};

type Props = {
  data: BonsaiCardData;
  onPress: (id: string) => void;
  /** 複数選択モード中か (default false)。true 時、写真左上にチェックマーク overlay を表示。 */
  selecting?: boolean;
  /** selecting=true 時、この盆栽が選択中か (default false)。 */
  selected?: boolean;
  /** 長押し callback (selectMode 入りトリガ用、500ms default、optional)。 */
  onLongPress?: (id: string) => void;
  testID?: string;
};

export function BonsaiCard({
  data,
  onPress,
  selecting = false,
  selected = false,
  onLongPress,
  testID,
}: Props) {
  const seed = hashSeed(data.id);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={data.name}
      accessibilityState={selecting ? { selected } : undefined}
      style={styles.card}
      onPress={() => onPress(data.id)}
      onLongPress={onLongPress != null ? () => onLongPress(data.id) : undefined}
      testID={testID}
    >
      <View style={styles.thumbWrap}>
        {data.coverUri != null && data.coverUri.length > 0 ? (
          <Image source={{ uri: data.coverUri }} style={styles.thumb} contentFit="cover" />
        ) : (
          <BonsaiPlaceholder size={120} seed={seed} radius={12} style={styles.thumb} />
        )}
        {selecting && (
          <View
            style={[
              styles.checkbox,
              selected ? styles.checkboxSelected : styles.checkboxUnselected,
            ]}
            testID={
              selected
                ? `${testID ?? 'e2e_bonsai_card'}_checked`
                : `${testID ?? 'e2e_bonsai_card'}_unchecked`
            }
          >
            {selected && <CheckIcon size={14} color={ON_BRAND} />}
          </View>
        )}
      </View>

      <View style={styles.body}>
        <ThemedText style={styles.name} numberOfLines={1}>
          {data.name}
        </ThemedText>
        {(data.speciesCommonName != null || data.speciesScientificName != null) && (
          <ThemedText style={styles.species} numberOfLines={1}>
            {data.speciesCommonName ?? ''}
            {data.speciesScientificName != null && (
              <ThemedText style={styles.scientific}>
                {data.speciesCommonName != null ? '  ' : ''}
                {data.speciesScientificName}
              </ThemedText>
            )}
          </ThemedText>
        )}
        {data.styleLabel != null && data.styleLabel.length > 0 && (
          <ThemedText style={styles.styleLabel}>{data.styleLabel}</ThemedText>
        )}

        {(data.lastWateringText != null || data.lastPruningText != null) && (
          <>
            <View style={styles.divider} />
            <View style={styles.metaCol}>
              {data.lastWateringText != null && (
                <View style={styles.metaRow}>
                  <DropletIcon size={14} />
                  <ThemedText style={styles.metaText} numberOfLines={1}>
                    {data.lastWateringText}
                  </ThemedText>
                </View>
              )}
              {data.lastPruningText != null && (
                <View style={styles.metaRow}>
                  <ScissorsIcon size={14} />
                  <ThemedText style={styles.metaText} numberOfLines={1}>
                    {data.lastPruningText}
                  </ThemedText>
                </View>
              )}
            </View>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 16,
    minHeight: 152,
  },
  thumbWrap: { position: 'relative', width: 120, height: 120 },
  thumb: { width: 120, height: 120, borderRadius: 12 },
  checkbox: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  checkboxSelected: { backgroundColor: BRAND_GREEN, borderColor: BRAND_GREEN },
  checkboxUnselected: { backgroundColor: BG_SURFACE, borderColor: BORDER_STRONG },
  body: { flex: 1, minWidth: 0 },
  name: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 22,
    lineHeight: 28,
    color: TEXT_PRIMARY,
    letterSpacing: 0.4,
  },
  species: {
    fontSize: 13,
    lineHeight: 20,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  scientific: { fontStyle: 'italic' },
  styleLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: ACCENT_BARK,
    letterSpacing: 1.0,
    marginTop: 2,
  },
  divider: { height: 1, backgroundColor: BORDER_DEFAULT, marginTop: 10, marginBottom: 8 },
  metaCol: { gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 13, color: TEXT_SECONDARY, flex: 1 },
});
