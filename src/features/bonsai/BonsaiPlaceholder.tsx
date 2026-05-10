/**
 * 写真未登録時の盆栽 placeholder (Claude Design `home-screens.jsx BonsaiPlaceholder` 整合)。
 *
 * - 角丸 12px の washi 系背景 (seed で 5 色ローテ)
 * - 抽象シルエット (canopy + 鉢) を SVG で描画
 * - 1 盆栽あたり同じ画像を表示するため seed = bonsai.id ハッシュで決定
 */
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Ellipse, Path, Pattern, Line, Rect } from 'react-native-svg';

const BG_COLORS = ['#E7DFC9', '#D9D1BF', '#D2C9B3', '#DED6C3', '#EAE1CB'];
const STROKE_COLORS = ['#5A4637', '#3E5C39', '#1F3A2E', '#5A4637', '#3E5C39'];

type Props = {
  /** 正方形時の一辺 (w/h と排他、両方未指定なら w/h 必須)。 */
  size?: number;
  /** 横幅 (h とセット、size と排他、横長 hero 写真用)。 */
  w?: number;
  /** 高さ (w とセット、size と排他、横長 hero 写真用)。 */
  h?: number;
  /** seed (default 0)。bonsai.id 文字列なら hashSeed() で数値化してから渡す。 */
  seed?: number;
  radius?: number;
  /** true なら border / shadow を抑制 (BonsaiCard hero 等、外側カードと一体化させる用途)。 */
  noBorder?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** 文字列 (例: bonsai.id) を 0-4 の数値に決定論的にマップ。 */
export function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 5;
}

export function BonsaiPlaceholder({
  size,
  w: wProp,
  h: hProp,
  seed = 0,
  radius = 12,
  noBorder: _noBorder = false,
  style,
}: Props) {
  const bg = BG_COLORS[seed % 5];
  const stroke = STROKE_COLORS[seed % 5];
  const pid = `pp-${seed}`;
  const w = wProp ?? size ?? 0;
  const h = hProp ?? size ?? 0;

  return (
    <View
      style={[
        {
          width: w,
          height: h,
          borderRadius: radius,
          overflow: 'hidden',
          backgroundColor: bg,
        },
        style,
      ]}
    >
      <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <Defs>
          <Pattern
            id={pid}
            width={6}
            height={6}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <Line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              stroke={stroke}
              strokeOpacity="0.08"
              strokeWidth="1"
            />
          </Pattern>
        </Defs>
        <Rect width={w} height={h} fill={`url(#${pid})`} />
        {/* canopy 大 */}
        <Ellipse
          cx={w / 2}
          cy={h * 0.45}
          rx={w * 0.32}
          ry={h * 0.22}
          fill={stroke}
          fillOpacity="0.18"
        />
        {/* canopy 小 */}
        <Ellipse
          cx={w * 0.42}
          cy={h * 0.4}
          rx={w * 0.18}
          ry={h * 0.14}
          fill={stroke}
          fillOpacity="0.22"
        />
        {/* trunk */}
        <Path
          d={`M ${w / 2} ${h * 0.52} Q ${w * 0.48} ${h * 0.65} ${w * 0.5} ${h * 0.72}`}
          stroke={stroke}
          strokeOpacity="0.35"
          strokeWidth="1.5"
          fill="none"
        />
        {/* pot */}
        <Rect
          x={w * 0.28}
          y={h * 0.72}
          width={w * 0.44}
          height={h * 0.14}
          rx={2}
          fill={stroke}
          fillOpacity="0.25"
        />
        {/* pot rim */}
        <Rect
          x={w * 0.32}
          y={h * 0.72}
          width={w * 0.36}
          height={2}
          fill={stroke}
          fillOpacity="0.35"
        />
      </Svg>
    </View>
  );
}
