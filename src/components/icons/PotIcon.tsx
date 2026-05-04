/**
 * 空鉢の SVG ラインイラスト (Home Empty State 用)。
 *
 * Claude Design `home-screens.jsx` `HI.Empty` を React Native + react-native-svg で再現。
 * design_system.md §2-1 BRAND_GREEN (深緑 #1F3A2E) を default 色とする。
 */
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import { BRAND_GREEN } from '@/src/core/theme/colors';

type Props = {
  size?: number;
  color?: string;
};

export function PotIcon({ size = 200, color = BRAND_GREEN }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      {/* pot 本体 (台形) */}
      <Path
        d="M50 120h100l-10 50H60l-10-50z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* 縁 */}
      <Path d="M44 120h112" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* 土の点線 */}
      <Path
        d="M58 128h84"
        stroke={color}
        strokeWidth="1"
        strokeOpacity="0.4"
        strokeDasharray="3,3"
      />
      {/* 切り株 */}
      <Path
        d="M100 120v-14"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.5"
      />
      <Circle
        cx="100"
        cy="100"
        r="3"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeOpacity="0.5"
      />
    </Svg>
  );
}
