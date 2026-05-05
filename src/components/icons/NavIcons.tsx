/**
 * UI ナビゲーション系 SVG アイコン (Claude Design `home-screens.jsx` HI.* を移植)。
 *
 * ADR-0020 Phase 0-B: Claude Design 全面採用に向けた icon barrel 拡張。
 * Header / TabBar / FAB / BottomSheet 等で使う共通アイコンを集約。
 *
 * default color は `TEXT_PRIMARY` (本文と同色)、size は用途別 default を持つ。
 */
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { BG_PRIMARY, TEXT_PRIMARY } from '@/src/core/theme/colors';

type IconProps = { size?: number; color?: string };

/** 検索 (放大鏡)。Header 検索ボタン 24px / 検索バー内 18px。 */
export function SearchIcon({ size = 24, color = TEXT_PRIMARY }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="10.5" cy="10.5" r="6.5" stroke={color} strokeWidth="1.5" />
      <Path d="M15.5 15.5L20 20" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

/** 設定 (歯車)。Header 設定ボタン 24px。 */
export function CogIcon({ size = 24, color = TEXT_PRIMARY }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5" />
      <Path
        d="M12 2v3M12 19v3M2 12h3M19 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** 葉 (盆栽タブ TabBar アイコン)。28px。 */
export function LeafIcon({ size = 28, color = TEXT_PRIMARY }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 4c0 10-6 14-12 14 0 0-1-5 3-9s9-5 9-5z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <Path d="M8 18l6-6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

/** カレンダー (予定タブ TabBar アイコン)。28px。 */
export function CalendarIcon({ size = 28, color = TEXT_PRIMARY }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3.5" y="5" width="17" height="15" rx="2" stroke={color} strokeWidth="1.5" />
      <Path d="M3.5 10h17M8 3v4M16 3v4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

/** コンパス (探すタブ TabBar アイコン)。28px。 */
export function CompassNavIcon({ size = 28, color = TEXT_PRIMARY }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" />
      <Path
        d="M15 9l-1.5 4.5L9 15l1.5-4.5L15 9z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** プラス (FAB アイコン)。28px、default color は washi (#F7F3E8) で BRAND_GREEN 背景に映える。 */
export function PlusIcon({ size = 28, color = BG_PRIMARY }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path d="M14 6v16M6 14h16" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

/** 戻る (Back シェブロン)。Header Back ボタン 20px。 */
export function BackIcon({ size = 20, color = TEXT_PRIMARY }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M12.5 4L6.5 10l6 6"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** 閉じる (Close ×)。Modal / BottomSheet 閉じる 24px。 */
export function CloseIcon({ size = 24, color = TEXT_PRIMARY }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </Svg>
  );
}

/** 編集 (鉛筆)。Header Edit ボタン 22px。 */
export function EditIcon({ size = 22, color = TEXT_PRIMARY }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Path
        d="M3 19l3-1 12-12-2-2L4 16l-1 3z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** カメラ (写真未登録の placeholder)。32px。 */
export function CameraIcon({ size = 32, color = TEXT_PRIMARY }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Rect x="3" y="8" width="26" height="18" rx="3" stroke={color} strokeWidth="1.5" />
      <Path d="M10 8l2-3h8l2 3" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <Circle cx="16" cy="17" r="5" stroke={color} strokeWidth="1.5" />
    </Svg>
  );
}

/** チェック (確定 / 完了)。FAB / Toast 18px、default color は washi。 */
export function CheckIcon({ size = 18, color = BG_PRIMARY }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M3 9l4 4 8-9"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
