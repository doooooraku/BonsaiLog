/**
 * 作業種別 outline SVG アイコン。
 * care-screens.jsx WIcon (viewBox 0 0 28 28, stroke-only) を React Native SVG に移植。
 * BulkWorkPickerScreen / WorkPickerScreen で共有。
 */
import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { TEXT_PRIMARY } from '@/src/core/theme/colors';
import type { EventType } from '@/src/db/schema';

type Props = {
  type: EventType;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function WorkTypeIcon({ type, size = 32, color = TEXT_PRIMARY, strokeWidth = 1.4 }: Props) {
  const vb = '0 0 28 28';
  const sw = strokeWidth;

  switch (type) {
    case 'watering':
      return (
        <Svg width={size} height={size} viewBox={vb} fill="none">
          <Path
            d="M14 4 C14 4, 7 12, 7 17 a7 7 0 0 0 14 0 C21 12, 14 4, 14 4 Z"
            stroke={color}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Path d="M11 17 a3 3 0 0 0 3 3" stroke={color} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );

    case 'pruning':
      return (
        <Svg width={size} height={size} viewBox={vb} fill="none">
          <Circle cx="8" cy="9" r="3" stroke={color} strokeWidth={sw} fill="none" />
          <Circle cx="8" cy="19" r="3" stroke={color} strokeWidth={sw} fill="none" />
          <Path
            d="M10.5 10.7 L23 18 M10.5 17.3 L23 10"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'wiring':
      return (
        <Svg width={size} height={size} viewBox={vb} fill="none">
          <Path
            d="M3 14 C6 8, 9 20, 12 14 C15 8, 18 20, 21 14 C23 10, 25 14, 25 14"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'unwiring':
      return (
        <Svg width={size} height={size} viewBox={vb} fill="none">
          <Path d="M3 12 C5 8, 8 16, 11 12" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Path
            d="M17 16 C19 12, 22 20, 25 16"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
          />
          <Path
            d="M12 18 L16 10"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={[2, 2]}
          />
        </Svg>
      );

    case 'repotting':
      return (
        <Svg width={size} height={size} viewBox={vb} fill="none">
          <Path
            d="M14 4 C12 7, 12 9, 14 11 C16 9, 16 7, 14 4 Z"
            stroke={color}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Path
            d="M10 11 C9 8, 7 7, 5 8 C6 11, 9 12, 11 11"
            stroke={color}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Path
            d="M6 14 L22 14 L20 23 L8 23 Z"
            stroke={color}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Path d="M5 14 L23 14" stroke={color} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );

    case 'fertilizing':
      return (
        <Svg width={size} height={size} viewBox={vb} fill="none">
          <Circle cx="9" cy="10" r="2" stroke={color} strokeWidth={sw} fill="none" />
          <Circle cx="14" cy="14" r="2" stroke={color} strokeWidth={sw} fill="none" />
          <Circle cx="19" cy="10" r="2" stroke={color} strokeWidth={sw} fill="none" />
          <Circle cx="11" cy="18" r="2" stroke={color} strokeWidth={sw} fill="none" />
          <Circle cx="17" cy="18" r="2" stroke={color} strokeWidth={sw} fill="none" />
        </Svg>
      );

    case 'pest_control':
      return (
        <Svg width={size} height={size} viewBox={vb} fill="none">
          <Path
            d="M11 6 L17 6 L17 13 L19 16 L19 22 L9 22 L9 16 L11 13 Z"
            stroke={color}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Path
            d="M17 8 L22 7 M17 10 L22 11"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
          />
          <Circle cx="24" cy="9" r="0.8" fill={color} />
          <Circle cx="25" cy="11" r="0.8" fill={color} />
        </Svg>
      );

    case 'leaf_trimming':
      return (
        <Svg width={size} height={size} viewBox={vb} fill="none">
          <G transform="rotate(-25 14 14)">
            <Rect x="5" y="11" width="18" height="6" rx="3" stroke={color} strokeWidth={sw} />
            <Path d="M11 14 L17 14" stroke={color} strokeWidth={sw} strokeLinecap="round" />
            <Circle cx="12" cy="14" r="0.7" fill={color} />
            <Circle cx="16" cy="14" r="0.7" fill={color} />
          </G>
        </Svg>
      );

    case 'defoliation':
      return (
        <Svg width={size} height={size} viewBox={vb} fill="none">
          <Path
            d="M22 5 C12 5, 5 12, 5 22 C15 22, 22 15, 22 5 Z"
            stroke={color}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Path d="M22 5 L9 18" stroke={color} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );

    case 'deshoot':
      return (
        <Svg width={size} height={size} viewBox={vb} fill="none">
          <Path d="M14 22 L14 12" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Path
            d="M14 12 C10 12, 8 9, 9 5 C13 5, 15 8, 14 12 Z"
            stroke={color}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Path
            d="M14 14 C17 14, 19 12, 19 9 C16 9, 14 11, 14 14 Z"
            stroke={color}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'candle_cut':
      return (
        <Svg width={size} height={size} viewBox={vb} fill="none">
          <Path
            d="M14 4 L14 14 M14 14 L9 8 M14 14 L19 8 M14 14 L6 12 M14 14 L22 12"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
          />
          <Path d="M8 18 L20 18" stroke={color} strokeWidth={1} strokeDasharray={[2, 2]} />
          <Path
            d="M22 21 L18 17 M18 21 L22 17"
            stroke={color}
            strokeWidth={1.2}
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'moss_care':
      return (
        <Svg width={size} height={size} viewBox={vb} fill="none">
          <Path
            d="M4 20 Q7 14, 10 20 Q13 14, 16 20 Q19 14, 22 20 Q25 14, 26 20"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path d="M6 22 L22 22" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Path
            d="M9 17 L9 14 M15 17 L15 12 M21 17 L21 14"
            stroke={color}
            strokeWidth={1.2}
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'position_change':
      return (
        <Svg width={size} height={size} viewBox={vb} fill="none">
          <Path
            d="M14 4 C9 4, 6 7, 6 12 C6 17, 14 24, 14 24 C14 24, 22 17, 22 12 C22 7, 19 4, 14 4 Z"
            stroke={color}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Circle cx="14" cy="12" r="2.5" stroke={color} strokeWidth={sw} fill="none" />
        </Svg>
      );

    case 'leaf_first_aid':
      // Sess16 PR-E: 葉の手当 = 葉 + ばんそうこう (cross) outline、 mockup 135145.png 整合。
      return (
        <Svg width={size} height={size} viewBox={vb} fill="none">
          <Path
            d="M5 22 C5 14, 10 8, 20 6 C20 14, 14 20, 5 22 Z"
            stroke={color}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Path
            d="M11 14 L19 14 M15 10 L15 18"
            stroke={color}
            strokeWidth={sw + 0.3}
            strokeLinecap="round"
          />
        </Svg>
      );

    default:
      return null;
  }
}
