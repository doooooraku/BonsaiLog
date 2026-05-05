/**
 * 盆栽カード (Claude Design `home-screens.jsx BonsaiCard` 整合)。
 *
 * - 写真サムネ 120×120 (cover photo or BonsaiPlaceholder)
 * - 名前 NotoSerifJP 22pt (1 行 ellipsis)
 * - 樹種名 + 学名 italic NotoSansJP 13pt
 * - 樹形 mono 11pt (任意)
 * - 区切り線 + 最後の水やり / 剪定からの日数 (任意)
 * - radius 16、border 1、padding 16、minHeight 152
 */
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DropletIcon, ScissorsIcon } from '@/src/components/icons';
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  ACCENT_BARK,
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
  testID?: string;
};

export function BonsaiCard({ data, onPress, testID }: Props) {
  const seed = hashSeed(data.id);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={data.name}
      style={styles.card}
      onPress={() => onPress(data.id)}
      testID={testID}
    >
      {data.coverUri != null && data.coverUri.length > 0 ? (
        <Image source={{ uri: data.coverUri }} style={styles.thumb} contentFit="cover" />
      ) : (
        <BonsaiPlaceholder size={120} seed={seed} radius={12} style={styles.thumb} />
      )}

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
  thumb: { width: 120, height: 120, borderRadius: 12 },
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
