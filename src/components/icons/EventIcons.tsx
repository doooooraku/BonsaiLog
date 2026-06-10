/**
 * Event 種別 SVG アイコン (Claude Design `home-screens.jsx` HI.* を移植)。
 *
 * 14 種別フル対応 (Sess34 ADR-0041 Phase θ PR-8b で leaf_first_aid 追加):
 * - DropletIcon: watering
 * - ScissorsIcon: pruning / leaf_trimming / defoliation / deshoot / candle_cut
 * - WireIcon: wiring / unwiring
 * - PotIconSmall: repotting / moss_care
 * - FertilizerIcon: fertilizing
 * - SprayIcon: pest_control
 * - CompassIcon: position_change
 * - LeafAidIcon: leaf_first_aid (新規、 葉 + 絆創膏、 ACCENT_BARK + DANGER 2 色)
 *
 * EventIcon switch は exhaustive (default なし)、 14 種別すべて返す。 新規 EventType
 * 追加時は __tests__/components/icons/EventIcons.test.tsx の exhaustive 走査 test で
 * non-null assertion fail → silent miss 防止。
 */
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import { ACCENT_BARK, BRAND_GREEN, DANGER, SUCCESS, TEXT_SECONDARY } from '@/src/core/theme/colors';
import type { EventType } from '@/src/db/schema';
import { assertNever } from '@/src/lib/assertNever';

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
  // Sess92 PR-2: viewBox 16→24 + strokeWidth 1.4→1.5 にリスケール (path 座標 1.5x)
  // hub icon stroke 統一 (= SearchIcon / TagIcon / SproutIcon と同じ 1.5/24 標準) のため。
  // 既存 16px usage (EventRow) でも viewBox 24 で同様に描画される。
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12c3 0 3-6 6-6s3 12 6 12 3-6 6-6"
        stroke={color}
        strokeWidth="1.5"
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

/**
 * LeafAidIcon — 葉の手当 (leaf_first_aid) 専用 (Sess34 ADR-0041 Phase θ PR-8b、 D10)。
 *
 * 「葉 + 絆創膏」 で 症状 (DANGER) + 治療 (温かみ ACCENT_BARK) の二重性を表現。
 * Sess16 PR-E で leaf_first_aid 種別追加時に EventIcon switch case 追加漏れ
 * (= buildHistoryChips も同 silent miss、 Phase η PR-2 で fix 済) → 本 PR で
 * EventIcon 側も同期。 exhaustive 走査 test で再発防止。
 *
 * design:
 * - viewBox 0 0 16 16、 strokeWidth 1.4 (他 EventIcons 整合)
 * - 葉 path (ACCENT_BARK)
 * - 絆創膏 path 45° 回転 (DANGER + fill opacity 0.15) + 縫い目 Circle 2 個
 */
export function LeafAidIcon({ size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      {/* 葉 (左下→右上の楕円) */}
      <Path
        d="M3 12 Q3 5 10 4 Q12 4 13 5 Q13 12 6 13 Q4 13 3 12 Z"
        stroke={ACCENT_BARK}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* 葉脈 */}
      <Path d="M4.5 12 L11.5 5" stroke={ACCENT_BARK} strokeWidth="1" strokeLinecap="round" />
      {/* 絆創膏本体 (45° 回転、 葉中央に重ね) */}
      <Path
        d="M6 9 L10 7 L10.7 8.2 L6.7 10.2 Z"
        stroke={DANGER}
        strokeWidth="1.3"
        strokeLinejoin="round"
        fill={DANGER}
        fillOpacity="0.15"
      />
      {/* 絆創膏の縫い目ドット 2 個 */}
      <Circle cx="7" cy="9.2" r="0.3" fill={DANGER} />
      <Circle cx="9.6" cy="7.8" r="0.3" fill={DANGER} />
    </Svg>
  );
}

/**
 * Event type → アイコンコンポーネントの対応表 (14 種別フル網羅、 Sess34 ADR-0041 Phase θ PR-8b)。
 *
 * exhaustive switch で全 EventType を返す。 新規 EventType 追加時は本 switch + 専用 Icon 追加必須、
 * exhaustive 走査 unit test (`__tests__/components/icons/EventIcons.test.tsx`) で silent miss 防止。
 */
export function EventIcon({
  type,
  size = 16,
}: {
  type: EventType;
  size?: number;
}): React.ReactElement {
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
    case 'leaf_first_aid':
      return <LeafAidIcon size={size} />;
    default:
      // exhaustive check (Sess64 Issue #934): 新規 EventType 追加時に compile error
      return assertNever(type);
  }
}
