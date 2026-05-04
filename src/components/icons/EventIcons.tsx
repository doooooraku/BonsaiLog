/**
 * Event 種別 SVG アイコン (Claude Design `home-screens.jsx` HI.* を移植)。
 *
 * v1.0 で実装済の主要 5 種 (watering / pruning / wiring / repotting / fertilizing) に
 * アイコンを割当。残り 8 種 (unwiring / pest_control / leaf_trimming /
 * defoliation / deshoot / candle_cut / moss_care / position_change) は v1.x で追加。
 */
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import { ACCENT_BARK, BRAND_GREEN, DANGER, SUCCESS, TEXT_SECONDARY } from '@/src/core/theme/colors';
import type { EventType } from '@/src/db/schema';

type IconProps = { size?: number; color?: string };

export function DropletIcon({ size = 16, color = BRAND_GREEN }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M8 2C8 2 3 7 3 11a5 5 0 0010 0c0-4-5-9-5-9z"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ScissorsIcon({ size = 16, color = ACCENT_BARK }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Circle cx="4" cy="12" r="2" stroke={color} strokeWidth="1.4" />
      <Circle cx="12" cy="12" r="2" stroke={color} strokeWidth="1.4" />
      <Path
        d="M5.5 10.5L14 2M10.5 10.5L2 2"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function WireIcon({ size = 16, color = ACCENT_BARK }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M2 8c2 0 2-4 4-4s2 8 4 8 2-4 4-4"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

export function PotIconSmall({ size = 16, color = ACCENT_BARK }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M3 7h10l-1 6H4L3 7z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
      <Path d="M2 7h12" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <Path d="M6 4c0 1 1 2 2 2s2-1 2-2" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  );
}

export function FertilizerIcon({ size = 16, color = SUCCESS }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Circle
        cx="5"
        cy="10"
        r="1.5"
        fill={color}
        fillOpacity="0.35"
        stroke={color}
        strokeWidth="1.2"
      />
      <Circle
        cx="11"
        cy="10"
        r="1.5"
        fill={color}
        fillOpacity="0.35"
        stroke={color}
        strokeWidth="1.2"
      />
      <Circle
        cx="8"
        cy="6"
        r="1.5"
        fill={color}
        fillOpacity="0.35"
        stroke={color}
        strokeWidth="1.2"
      />
    </Svg>
  );
}

export function SprayIcon({ size = 16, color = DANGER }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      {/* 噴霧器: 容器 + ノズル + 飛沫 */}
      <Path d="M5 7h4v6H5z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
      <Path d="M5 9h4" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M9 5l3-2" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <Circle cx="13" cy="3" r="0.6" fill={color} />
      <Circle cx="14" cy="5" r="0.5" fill={color} />
      <Circle cx="12" cy="6" r="0.4" fill={color} />
    </Svg>
  );
}

export function CompassIcon({ size = 16, color = TEXT_SECONDARY }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.4" />
      <Path d="M10 6l-1 4-3 1 1-4 3-1z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
    </Svg>
  );
}

/** Event type → アイコンコンポーネントの対応表。未対応 type は null を返す (v1.x で追加)。 */
export function EventIcon({
  type,
  size = 16,
}: {
  type: EventType;
  size?: number;
}): React.ReactElement | null {
  switch (type) {
    case 'watering':
      return <DropletIcon size={size} />;
    case 'pruning':
    case 'leaf_trimming':
    case 'defoliation':
    case 'deshoot':
    case 'candle_cut':
      return <ScissorsIcon size={size} />;
    case 'wiring':
    case 'unwiring':
      return <WireIcon size={size} />;
    case 'repotting':
    case 'moss_care':
      return <PotIconSmall size={size} />;
    case 'fertilizing':
      return <FertilizerIcon size={size} />;
    case 'pest_control':
      return <SprayIcon size={size} />;
    case 'position_change':
      return <CompassIcon size={size} />;
    default:
      return null;
  }
}
