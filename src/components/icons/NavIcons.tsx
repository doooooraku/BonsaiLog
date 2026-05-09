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

/**
 * 設定 (歯車)。Header 設定ボタン 24px / TabBar 設定タブ 28px。
 *
 * mockup v1.0 home-screens.jsx HI.Cog (Heroicons 風標準歯車) と完全整合。
 * 旧実装は中心 circle + 8 本の太陽光線風 path で「太陽風」と評価されていた (Issue #274)。
 * 新実装は歯車外周のギザギザを描く Heroicons 24/outline cog-6-tooth スタイル。
 */
export function CogIcon({ size = 24, color = TEXT_PRIMARY }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.76 6.76 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.93 6.93 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.213-1.281Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.5} />
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

/**
 * 縦 3 dots (More メニュー)。Header メニューボタン 22px。
 *
 * mockup v1.0 detail-screens.jsx DetailHeader の onOpenMenu ボタン整合
 * (盆栽詳細 ⋮ メニュー、Heroicons / Lucide MoreVertical 風)。
 */
export function MoreVerticalIcon({ size = 22, color = TEXT_PRIMARY }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={5} r={1.5} fill={color} />
      <Circle cx={12} cy={12} r={1.5} fill={color} />
      <Circle cx={12} cy={19} r={1.5} fill={color} />
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
