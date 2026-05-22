/**
 * 盆栽詳細 Hero (Sess28 PR-4 / ADR-0037 D2 で縮小、 ADR-0020 Notes Amended で規定変更)。
 *
 * - cover photo がある場合: full bleed Image (height 180) + 下部 64px 半透明 overlay + 名前 overlay
 * - cover photo が無い場合: washi 背景 + 中央に PotIcon (100、 placeholder)
 * - 表示: **盆栽名のみ** (NotoSerifJP 28pt)、 樹種・樹形 は ADR-0037 D2 で削除 → 基本情報タブで参照
 *
 * Hero 高さ 180px (旧 280px、 -36%)、 overlay 64px (旧 140px、 盆栽名 1 行 + padding)。
 * textShadow で写真上の可読性確保。
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
};

export function BonsaiHero({ coverUri, bonsaiName }: Props) {
  const hasCover = coverUri != null && coverUri.length > 0;

  return (
    <View style={styles.container}>
      {hasCover ? (
        <>
          <Image source={{ uri: coverUri }} style={styles.image} contentFit="cover" />
          {/* 下部 64px に半透明黒 overlay (盆栽名 1 行可読性確保、 grad 代替) */}
          <View style={styles.overlay} />
        </>
      ) : (
        <View style={styles.placeholder}>
          <PotIcon size={100} />
        </View>
      )}

      <View style={styles.infoOverlay}>
        <ThemedText style={[styles.name, hasCover && styles.nameOnPhoto]}>{bonsaiName}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Sess28 PR-4 (ADR-0037 D2): height 280 → 180、 約 -36% で list 領域拡大
  container: { width: '100%', height: 180, position: 'relative', backgroundColor: BG_PRIMARY },
  image: { width: '100%', height: '100%' },
  // Sess28 PR-4: overlay 140 → 64、 盆栽名 1 行 + padding 分のみ
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  infoOverlay: { position: 'absolute', left: 24, right: 24, bottom: 16 },
  // displayL 28/36 (Claude Design DetailHero NotoSerifJP 28pt、 老眼対応で大型維持)
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
});
