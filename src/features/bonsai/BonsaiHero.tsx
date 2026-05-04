/**
 * 盆栽詳細 Hero (Claude Design `detail-screens.jsx` DetailHero 整合、ADR-0019 §149-159)。
 *
 * - cover photo がある場合: full bleed Image (height 280) + 下部 gradient overlay + 情報 overlay
 * - cover photo が無い場合: washi 背景 + 中央に PotIcon (placeholder)
 * - 情報 overlay: 盆栽名 NotoSerifJP 28pt + 樹種 NotoSansJP 14pt + 学名 italic + style mono 11pt
 *
 * Hero 高 280px (Claude Design 整合)、textShadow で写真上の可読性確保。
 */
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PotIcon } from '@/src/components/icons';
import { BG_PRIMARY, ON_BRAND } from '@/src/core/theme/colors';

type Props = {
  coverUri: string | null;
  bonsaiName: string;
  speciesCommonName: string | null;
  speciesScientificName: string | null;
  styleLabel: string | null;
};

export function BonsaiHero({
  coverUri,
  bonsaiName,
  speciesCommonName,
  speciesScientificName,
  styleLabel,
}: Props) {
  const hasCover = coverUri != null && coverUri.length > 0;

  return (
    <View style={styles.container}>
      {hasCover ? (
        <>
          <Image source={{ uri: coverUri }} style={styles.image} contentFit="cover" />
          {/* 下部 50% に半透明黒 overlay (LinearGradient 代替、依存追加なし) */}
          <View style={styles.overlay} />
        </>
      ) : (
        <View style={styles.placeholder}>
          <PotIcon size={120} />
        </View>
      )}

      <View style={styles.infoOverlay}>
        <ThemedText style={[styles.name, hasCover && styles.nameOnPhoto]}>{bonsaiName}</ThemedText>
        {speciesCommonName != null && (
          <ThemedText style={[styles.species, hasCover && styles.textOnPhoto]}>
            {speciesCommonName}
            {speciesScientificName != null && (
              <ThemedText style={styles.scientific}> / {speciesScientificName}</ThemedText>
            )}
          </ThemedText>
        )}
        {styleLabel != null && (
          <ThemedText style={[styles.styleLabel, hasCover && styles.textOnPhoto]}>
            {styleLabel}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', height: 280, position: 'relative', backgroundColor: BG_PRIMARY },
  image: { width: '100%', height: '100%' },
  // 下半分のみ半透明黒 (text 可読性確保、grad 代替)
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  infoOverlay: { position: 'absolute', left: 24, right: 24, bottom: 20 },
  // displayL 28/36 (Claude Design DetailHero NotoSerifJP 28pt)
  name: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: 0.5,
  },
  nameOnPhoto: {
    color: ON_BRAND,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  species: { fontSize: 14, marginTop: 4, opacity: 0.92 },
  scientific: { fontStyle: 'italic' },
  styleLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    letterSpacing: 1.3,
    marginTop: 4,
    opacity: 0.75,
  },
  textOnPhoto: {
    color: ON_BRAND,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
