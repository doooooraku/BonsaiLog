/**
 * UI ナビゲーション系 SVG アイコン (Claude Design `home-screens.jsx` HI.* を移植)。
 *
 * ADR-0020 Phase 0-B: Claude Design 全面採用に向けた icon barrel 拡張。
 * Header / TabBar / FAB / BottomSheet 等で使う共通アイコンを集約。
 *
 * default color は `TEXT_PRIMARY` (本文と同色)、size は用途別 default を持つ。
 */
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

/**
 * 繰り返し (Lucide `repeat` 互換、 ADR-0056 D5 = recurring 由来 event 視覚マーカー)。
 *
 * Sess81 PR-7 で 追加。 EventRowCompact + EventRowDetailed で 作業名 inline に小型 (14px) 表示。
 * 絵文字 (🔁) ではなく SVG 採用理由 = Hermes 環境で Android 9 / iOS 17 で 絵文字レンダリング差出る (PR-7 設計)。
 * default size 14px = EventIcon (20px) より小さく、 視覚 noise 最小化 (Apple Reminders 整合)。
 */
export function RepeatIcon({
  size = 14,
  color = TEXT_PRIMARY,
  testID,
  strokeWidth = 2,
}: IconProps & { testID?: string; strokeWidth?: number }) {
  // Sess92 PR-2: strokeWidth prop 追加 (= CloseIcon pattern 同型)。 default 2 keep で 14px
  // inline (EventRowCompact / EventRowDetailed) は従来通り、 hub 22px call site で 1.5 を
  // override 指定し他の hub icon (1.5/24) と統一感確保。
  //
  // testID は exactOptionalPropertyTypes 配下では undefined 渡し不可、 ある時のみ props 展開
  const svgProps = testID !== undefined ? { testID } : {};
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...svgProps}>
      <Path
        d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"
        stroke={color}
        strokeWidth={String(strokeWidth)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * ベル (Heroicons 24/outline `bell`、 NotificationCard まとめ通知 行 inline icon)。
 *
 * Sess94 PR-A 追加: 既存 row icon との視覚整合 = strokeWidth 1.5 / viewBox 24 / size 18 default
 * (= rowLabel fontSize 14 と 1.3 倍 ratio、 Apple SF Symbols 整合)。
 * 機能 (= まとめ通知 1 系統、 ADR-0014) は keep、 視覚要素のみ ClaudeDesign モックに寄せる
 * (= Sess94 議論で 案 Y 採用、 機能と矛盾する toggle 図形は採用しない)。
 */
export function BellIcon({ size = 18, color = TEXT_PRIMARY }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * 時計 (Heroicons 24/outline `clock`、 NotificationCard 時刻 行 inline icon)。
 *
 * Sess94 PR-A 追加: BellIcon と同型 (strokeWidth 1.5 / viewBox 24 / size 18 default)。
 */
export function ClockIcon({ size = 18, color = TEXT_PRIMARY }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * ノート (記録タブ TabBar アイコン)。 28px。
 *
 * ADR-0042 D2 で追加: 記録タブ icon を mockup HI.Droplet (= EventIcons.tsx の watering 用
 * `DropletIcon` を size override で兼用) から本 icon に変更。 14 種別記録 (剪定 / 針金 /
 * 植替 / 施肥 / 葉刈 / 葉透かし / 芽摘み / 芽切り / 苔の手入れ / 場所変え / 防虫消毒 /
 * 葉の手当 / 針金外し) を象徴する帳簿型 icon。 EventIcons `DropletIcon` (watering 用 size=16)
 * は無傷で温存 (本 ADR D2 訂正、 NavIcons には元から DropletIcon なし)。
 *
 * 形状: 開いた帳簿 (中央綴じ縦線 = 2 矩形分離 + 左右 2 ページ + 各ページ横線 2 本)。
 * `LeafIcon` / `CalendarIcon` / `PencilNavIcon` と統一の strokeWidth=1.5。
 */
export function NotebookIcon({ size = 28, color = TEXT_PRIMARY }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 5h7v14H4zM13 5h7v14h-7z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <Path d="M6 9h3M6 12h3" stroke={color} strokeWidth="1.25" strokeLinecap="round" />
      <Path d="M15 9h3M15 12h3" stroke={color} strokeWidth="1.25" strokeLinecap="round" />
    </Svg>
  );
}

/**
 * 鉛筆 (ふりかえりタブ TabBar アイコン)。28px。
 *
 * mockup v1.0 home-screens.jsx HI.Pencil (L172-177) を移植。
 * ADR-0020 §Decision §7: 4 番目のタブ「探す」を「ふりかえり」に rename した際、
 * アイコンも CompassNavIcon (コンパス) から PencilNavIcon (鉛筆) に差し替え。
 */
export function PencilNavIcon({ size = 28, color = TEXT_PRIMARY }: IconProps) {
  // Sess92 PR-2: 消しゴム separator 線 (= 内部 M14 6l4 4 path) を 削除して 視覚密度低減。
  // user 指摘「鉛筆マークが他のタブより濃く見える」 = closed path (鉛筆ボディ) + 内部 separator
  // 線で 2 line 重複 (= 他 TabBar icon = 1 closed shape) のため。 separator 削除で 28px 描画時
  // BonsaiIcon / CalendarIcon / NotebookIcon と stroke 同等の見た目に。
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 20h4l10-10-4-4L4 16v4z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
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

/** 書き出し (Download / Export、トレイ + 下向き矢印)。ふりかえり Hub エクスポート card 用。 */
export function DownloadIcon({ size = 24, color = TEXT_PRIMARY }: IconProps) {
  // Sess92 PR-2: strokeWidth 1.75→1.5 (= hub icon stroke 統一)
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3v11m0 0l-4-4m4 4l4-4M5 18v1a2 2 0 002 2h10a2 2 0 002-2v-1"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** 戻る (Back シェブロン)。Header Back ボタン 20px。 */
export function BackIcon({ size = 20, color = TEXT_PRIMARY }: IconProps) {
  // Sess92 PR-2: strokeWidth 1.75→1.5 (= app 全 icon stroke 統一)
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M12.5 4L6.5 10l6 6"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * 閉じる (Close ×)。 Sess15 PR-II: strokeWidth prop で太め化対応 (clear button 灰 circle 内で使用)。
 *
 * Sess92 PR-2: default strokeWidth 1.75→1.5 (= app 全 icon stroke 統一)、 既存 prop 渡しで太め化可能。
 */
export function CloseIcon({
  size = 24,
  color = TEXT_PRIMARY,
  strokeWidth = 1.5,
}: IconProps & { strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6l12 12M18 6L6 18"
        stroke={color}
        strokeWidth={String(strokeWidth)}
        strokeLinecap="round"
      />
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

/**
 * 右シェブロン (Chevron Right)。リスト項目の続きを示す 20px。
 *
 * mockup v1.0 care-screens.jsx CareHubScreen の Chev (L1579-1589) を移植。
 * 3 カード Hub の各カード末尾に表示、押すと sub-route に遷移する目印。
 */
export function ChevronRightIcon({ size = 20, color = TEXT_PRIMARY }: IconProps) {
  // Sess92 PR-2: strokeWidth 1.75→1.5 (= app 全 icon stroke 統一)
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M7.5 4l6 6-6 6"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * タグ (Tag、 Heroicons 風)。 CareHub「タグを管理」 カード icon 22-28px。
 *
 * Sess9 PR-6 (ADR-0020 §Notes Amended 2026-05-18) で新規追加。
 * 「ふりかえり = 振り返り + 整理」 の「整理」 部分を担う。
 */
export function TagIcon({ size = 22, color = TEXT_PRIMARY }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.1 18.1 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.659A2.25 2.25 0 009.568 3z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="6" cy="6" r="1" fill={color} />
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

/**
 * 盆栽 silhouette (鉢 + 樹冠 + 幹)。 TabBar 盆栽タブ 28px。
 *
 * Sess92 (2026-06-10): TabBar 盆栽タブ icon を `LeafIcon` (汎用 葉) から差替。
 * 真因 = LeafIcon が hub「樹種を管理」 card icon と 2 重使用、 user 認知混乱
 * (Sess89 Phase 2/3 で 既存 icon 流用判断、 4 ペルソナ全員 ✕)。 BonsaiIcon は
 * 「盆栽そのもの」 (= 鉢 + 樹) を直接表現、 「樹種」 (= SproutIcon 双葉) と差別化。
 *
 * 形状: 葉冠 (cloud-like 雲形、 Heroicons outline 流派整合) + 中央幹 + 鉢 (台形)。
 * `LeafIcon` / `CalendarIcon` / `NotebookIcon` / `PencilNavIcon` と統一の strokeWidth=1.5。
 */
export function BonsaiIcon({ size = 28, color = TEXT_PRIMARY }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 9a3 3 0 0 1 2.6-2.97 3.5 3.5 0 0 1 6.8 0A3 3 0 0 1 16 12H8a3 3 0 0 1 0-3z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <Path d="M12 12v6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M6 18h12l-1.5 3h-9z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * 新芽 (双葉 sprout)。 ふりかえり hub「樹種を管理」 card 22px。
 *
 * Sess92 (2026-06-10): hub「樹種を管理」 card icon を `LeafIcon` (= TabBar 盆栽タブと 2 重使用)
 * から差替。 「樹種」 (= 種類・品種) を象徴する 「新芽」 で意味整合 ◎。
 *
 * SVG path は Lucide `sprout` 公式 (https://lucide.dev/icons/sprout) を流用、
 * strokeWidth は NavIcons 規約 (= 1.5) に合わせて 2 → 1.5 に調整。
 */
export function SproutIcon({ size = 22, color = TEXT_PRIMARY }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M5 21h14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

/**
 * 樹形 illustration (文人木 風 = 細曲幹 + 上部小葉冠)。 ふりかえり hub「樹形を管理」 card 22px。
 *
 * Sess92 (2026-06-10): hub「樹形を管理」 card icon を `CompassIcon` (= position_change
 * event icon と 2 重使用、 方位磁石 ≠ 樹形で意味無関係) から差替。 「樹形」 (= 仕立て形状)
 * を象徴する 「文人木 (bunjingi)」 風 illustration で意味整合 ◎。
 *
 * 形状: 細く曲がった幹 (S 字 cubic) + 上部に小さくふんわり葉冠 (楕円) + 鉢最小化
 * (= 文人木の鉢小・地表線で代用)。 `SproutIcon` (双葉) と差別化、 BonsaiIcon (盆栽 silhouette)
 * とも差別化 (= 樹形 illustration の特殊性表現)。
 */
export function StyleIcon({ size = 22, color = TEXT_PRIMARY }: IconProps) {
  // Sess92 PR-2: path 改修 = 葉冠拡大 + S 字幹強調 + 鉢 small 追加 (= user SS 案 A 近づけ)。
  // 旧 path = 楕円 balloon-like で 「樹形」 認識弱、 新 path = ふんわり葉冠 + 細曲幹 + 簡素鉢
  // で 22px でも盆栽 silhouette 明瞭。 BonsaiIcon (= 雲葉冠 + 直線幹 + 台形鉢) と差別化:
  // StyleIcon は「樹形バリエーション」 のシルエットで 葉冠より幹の表現を強調。
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* 葉冠 = 大型円 (cx=12 cy=6 r=4.5) で 「樹冠」 を確実に表現 (= balloon感 排除) */}
      <Circle cx="12" cy="6" r="4.5" stroke={color} strokeWidth="1.5" fill="none" />
      {/* 細曲幹 = Q 曲線 (= cubic より curve 明瞭、 10.5→18 で左右に振れる) */}
      <Path
        d="M12 10.5 Q 8 13 12 15.5 Q 16 17 12 18"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* 鉢 = 中型台形 (= 視認性確保、 文人木でも鉢は確実描画) */}
      <Path d="M7 18h10l-1 3.5h-8z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </Svg>
  );
}
