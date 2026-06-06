/**
 * 写真未登録時の盆栽 placeholder (Sess6 PR-1 で簡略化、 user 「灰色のみ、 工数かけない」 採用)。
 *
 * - 単色 placeholder (light: #E0E0E0 / dark: #3A3631、 Sess70 PR-C3 で scheme-aware 化)
 * - 旧 SVG 抽象シルエット (canopy + 鉢) + 5 色ローテは削除 (Sess1 PR-3 で導入、 user 視覚整合 △ 判断で簡略化)
 * - hashSeed は BonsaiCard で seed 用途で参照のため export 維持 (legacy 互換)
 */
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useColors } from '@/src/core/theme/useColors';

type Props = {
  /** 正方形時の一辺 (w/h と排他、両方未指定なら w/h 必須)。 */
  size?: number;
  /** 横幅 (h とセット、size と排他、横長 hero 写真用)。 */
  w?: number;
  /** 高さ (w とセット、size と排他、横長 hero 写真用)。 */
  h?: number;
  /** seed (default 0)。 legacy 引数、 単色化後は未使用、 但し既存呼出と互換維持。 */
  seed?: number;
  radius?: number;
  /** true なら border / shadow を抑制 (legacy 引数、 単色化後は影響なし)。 */
  noBorder?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** 文字列 (例: bonsai.id) を 0-4 の数値に決定論的にマップ (BonsaiCard で legacy 用途、 export 維持)。 */
export function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 5;
}

export function BonsaiPlaceholder({ size, w: wProp, h: hProp, radius = 12, style }: Props) {
  const c = useColors();
  const w = wProp ?? size ?? 0;
  const h = hProp ?? size ?? 0;
  return (
    <View
      style={[
        {
          width: w,
          height: h,
          borderRadius: radius,
          // Sess70 PR-C3: scheme-aware placeholder (light #E0E0E0 / dark #3A3631 sumi 重ね灰)。
          backgroundColor: c.placeholderBg,
        },
        style,
      ]}
    />
  );
}
