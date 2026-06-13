/**
 * 盆栽詳細 Hero (Sess29 ADR-0038 D5 / ADR-0037 D2 Notes Amended、 ADR-0020 Notes Amended 整合)。
 *
 * - cover photo がある場合: full bleed Image (height 280) + 下部 64px 半透明 overlay + 名前 overlay
 * - cover photo が無い場合: washi 背景 + 中央に PotIcon (120、 placeholder)
 * - 表示: **盆栽名のみ** (NotoSerifJP 28pt)、 樹種・樹形 は ADR-0037 D2 で削除 → 基本情報タブで参照 (Sess28 確定)
 *
 * Hero 高さ:
 *   - Sess28 PR-4: 280px → 180px (縮小、 ADR-0037 D2 採用)
 *   - Sess29 PR-5: 180px → **280px (撤回、 ADR-0038 D5 + ADR-0037 D2 Notes Amended)** = 元のサイズに復元
 * overlay (黒帯) は 64px 維持 (盆栽名 1 行 + padding、 Sess28 確定)。
 * textShadow で写真上の可読性確保。
 */
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PotIcon } from '@/src/components/icons';
// Sess68 PR #C: BG_PRIMARY は inline c.background 化、 ON_BRAND は brand-static で保持。
import { ON_BRAND } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { SERIF_FAMILY } from '@/src/core/theme/typography';

type Props = {
  coverUri: string | null;
  bonsaiName: string;
};

export function BonsaiHero({ coverUri, bonsaiName }: Props) {
  const c = useColors();
  const hasCover = coverUri != null && coverUri.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {hasCover ? (
        <>
          <Image source={{ uri: coverUri }} style={styles.image} contentFit="cover" />
          {/* 下部 64px に半透明黒 overlay (盆栽名 1 行可読性確保、 grad 代替、 Sess28 確定維持) */}
          <View style={styles.overlay} />
        </>
      ) : (
        <View style={styles.placeholder}>
          <PotIcon size={120} />
        </View>
      )}

      <View style={styles.infoOverlay}>
        <ThemedText style={[styles.name, hasCover && styles.nameOnPhoto]}>{bonsaiName}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Sess29 PR-5 (ADR-0038 D5): height 180 → 280 撤回 (Sess28 PR-4 部分 revert、 画像サイズ復元)
  container: { width: '100%', height: 280, position: 'relative' },
  image: { width: '100%', height: '100%' },
  // Sess28 確定: overlay 64px 維持 (盆栽名 1 行 + padding 分のみ、 Sess29 でも維持)
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
    fontFamily: SERIF_FAMILY,
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
