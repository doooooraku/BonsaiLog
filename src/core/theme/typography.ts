/**
 * Form Atom Typography Tokens (BonsaiLog Source of Truth、 ADR-0029 D1)。
 *
 * docs/reference/design_system.md §12-6 と完全整合。 Form 系で使用する
 * label / optional badge / required badge / placeholder / suffix / counter / input
 * の typography を constant 化し、 atom 内 hardcoded fontSize / fontWeight を撤廃。
 *
 * 参照: docs/reference/design_system.md §12-6 Form atom typography contract
 *
 * 自動検出: scripts/check-form-typography.mjs (grep-based、 warning)
 * — src/components/form/ と src/features/event/Work*Screen.tsx 等で
 * hardcoded fontSize / fontWeight を検出。 ESLint AST rule 化は Sess18 以降。
 */
import type { TextStyle } from 'react-native';

import { OVERLIMIT, TEXT_MUTED, TEXT_PRIMARY, TEXT_SECONDARY } from './colors';

/**
 * label (atom の左上、 type="defaultSemiBold" 相当)。
 * fontSize 14 / fontWeight '600' / color TEXT_PRIMARY。
 */
export const formLabel: TextStyle = {
  fontSize: 14,
  fontWeight: '600',
  color: TEXT_PRIMARY,
};

/**
 * 任意 badge (label 右隣に薄く表示)。
 * fontSize 10 / letterSpacing 0.8 / color TEXT_MUTED。
 */
export const formOptional: TextStyle = {
  fontSize: 10,
  letterSpacing: 0.8,
  color: TEXT_MUTED,
};

/**
 * 必須 badge (label 右隣に DANGER 背景で表示)。
 * fontSize 10 / letterSpacing 0.8 / color BG_PRIMARY (背景 DANGER は atom 側 style で指定)。
 */
export const formRequired: TextStyle = {
  fontSize: 10,
  letterSpacing: 0.8,
};

/**
 * placeholder の color (RN default 信頼しない、 Sess16 PR-P 教訓)。
 * fontSize / fontWeight は input 自体を継承、 color のみ明示。
 */
export const FORM_PLACEHOLDER_COLOR = TEXT_SECONDARY;

/**
 * suffix (input 右内側、 単位や年などを灰色で表示)。
 * fontSize 14 / color TEXT_MUTED。
 */
export const formSuffix: TextStyle = {
  fontSize: 14,
  color: TEXT_MUTED,
};

/**
 * counter (上限到達前、 灰色で N/MAX 表示)。
 * fontSize 12 / color TEXT_MUTED。
 */
export const formCounter: TextStyle = {
  fontSize: 12,
  color: TEXT_MUTED,
};

/**
 * counter 上限到達時 (OVERLIMIT 色 + 太字)。
 */
export const formCounterOver: TextStyle = {
  fontSize: 12,
  color: OVERLIMIT,
  fontWeight: '600',
};

/**
 * input 本体 (TextInput の文字)。
 * fontSize 16 / color TEXT_PRIMARY。
 */
export const formInput: TextStyle = {
  fontSize: 16,
  color: TEXT_PRIMARY,
};

/**
 * segment ボタン label (LabeledSegmented / LabeledNumberSegmentOrFree /
 * LabeledNumberInputUnit の単位切替 segmented)。
 * fontSize 13 / color TEXT_SECONDARY (非選択時)。
 */
export const formSegmentText: TextStyle = {
  fontSize: 13,
  color: TEXT_SECONDARY,
};

/**
 * segment ボタン選択時の追加 weight (color は caller 側で ON_BRAND を上書き)。
 */
export const formSegmentTextOn: TextStyle = {
  fontSize: 13,
  fontWeight: '500',
};

// ============================================================================
// EventRow display typography tokens (Sess37 PR-1、 ADR-0041 Notes Amended)
//
// 盆栽 user (60-70 代高齢層) 視認性を WCAG AA 推奨 (本文 14sp 以上) に揃える + Material 3
// body medium 相当の baseline を確保。 各 component の hardcoded fontSize を撤廃し、
// EventRow scope の display 系 token として一元化 (eventRow* prefix で form* token と並列)。
//
// 関連: docs/reference/design_system.md §24 (EventRow contract、 Sess37 PR-2 改訂予定)
// ============================================================================

/**
 * Chip 値テキスト (HistoryChip 内の値表示)。
 * fontSize 14 / lineHeight 20 / color TEXT_SECONDARY。
 * 旧 fontSize 11 から WCAG AA 推奨 + Material 3 body medium 相当に拡大。
 */
export const eventRowChipText: TextStyle = {
  fontSize: 14,
  lineHeight: 20,
  color: TEXT_SECONDARY,
};

/**
 * Chip field label (HistoryChip の「希釈倍率:」「症状:」 等)。
 * fontSize 14 / lineHeight 20 / color TEXT_SECONDARY。
 * chipText と同サイズで row 視覚整合。
 */
export const eventRowChipLabel: TextStyle = {
  fontSize: 14,
  lineHeight: 20,
  color: TEXT_SECONDARY,
};

/**
 * Memo 本文 (EventRow detailed mode の memo block 内)。
 * fontSize 15 / lineHeight 22 / color TEXT_SECONDARY。
 * 旧 fontSize 12 から長文本文の可読性を向上 (lineHeight 1.47)。
 */
export const eventRowMemo: TextStyle = {
  fontSize: 15,
  lineHeight: 22,
  color: TEXT_SECONDARY,
};

/**
 * 「もっと見る ▶」 / 「折りたたむ ▲」 link (MemoWithReadMore)。
 * fontSize 14 / lineHeight 20 / color TEXT_SECONDARY。
 * 旧 fontSize 11 から chip と統一。
 */
export const eventRowReadMoreLink: TextStyle = {
  fontSize: 14,
  lineHeight: 20,
  color: TEXT_SECONDARY,
};

/**
 * Memo セクションラベル「メモ」 (EventRow detailed mode、 C6 新規)。
 * fontSize 12 / fontWeight '600' / color TEXT_MUTED。
 * memo 本文より控えめにし、 section ラベルとしての視覚階層を作る。
 */
export const eventRowMemoSectionLabel: TextStyle = {
  fontSize: 12,
  fontWeight: '600',
  color: TEXT_MUTED,
};

// ============================================================================
// Screen header typography tokens (Sess90 PR-A、 ADR-0053 Sess90 Amendment)
//
// 画面ヘッダー (= タブ画面 自前 SearchHeader / Stack 画面 React Navigation native header)
// の font geometry SoT。 NotoSerifJP_500Medium でブランド統一、 size のみで階層表現。
// color (= c.text) は caller spread 上書きで theme-aware に保つ。 flex 等の layout
// プロパティは含めず、 font geometry 4 プロパティのみで構成する (= 用途横断流用性確保)。
//
// 関連: docs/reference/design_system.md §Screen header typography contract
// 参照箇所: src/features/bonsai/SearchHeader.tsx (Tab) / app/_layout.tsx (Stack global)
//
// 自動検出 (= 後続 session 課題): scripts/dev/check-screen-header-typography.mjs
//   — header の hardcoded fontFamily / fontSize 検出 (R-75 = font geometry hardcode 禁止)。
// ============================================================================

/**
 * ブランド serif の fontFamily 名 SoT (Sess100 #1123 フォローアップ)。
 * StyleSheet で serif を使う時は文字列直書きせず本定数を参照する
 * (font 差し替えを 1 箇所変更で全画面に波及させるため)。
 */
export const SERIF_FAMILY = 'NotoSerifJP_500Medium';

/**
 * タブ画面 大タイトル (SearchHeader、 4 タブの大見出し)。
 * fontFamily NotoSerifJP_500Medium / fontSize 22 / lineHeight 32 / letterSpacing 0.9。
 */
export const screenTitleTab: TextStyle = {
  fontFamily: SERIF_FAMILY,
  fontSize: 22,
  lineHeight: 32,
  letterSpacing: 0.9,
};

/**
 * Stack 画面 ヘッダー (React Navigation native Stack header)。
 * fontFamily NotoSerifJP_500Medium / fontSize 18。
 * RN default 17pt より +1pt は NotoSerifJP の x-height が Roboto より小さく、
 * 同 pt では視覚的に小さく見えるための補正 (Plan agent cross-check 同意)。
 *
 * 注: `headerTitleStyle` は React Navigation で `Pick<TextStyle, 'fontFamily'|'fontSize'|'fontWeight'> & { color? }`
 *     という制限された型のみ受け入れる (= `lineHeight` / `letterSpacing` 等は native header API が
 *     サポートしないため除外)。 そのため screenTitleStack は 2 プロパティのみで構成。
 */
export const screenTitleStack: Pick<TextStyle, 'fontFamily' | 'fontSize'> = {
  fontFamily: SERIF_FAMILY,
  fontSize: 18,
};

/**
 * 画面内 大見出し (displayM 24/32、 design_system.md §3-3)。
 * Onboarding tut タイトル / 盆栽タブ empty state タイトル等、 screen header 以外の
 * 「画面の主役見出し」 用。 Sess99 #1123 で直書き 3 箇所を token 集約 (見た目不変)。
 * layout 系 (textAlign / margin) と geometry の現状維持 override は caller 側 spread で行う。
 */
export const displayTitleSerif: TextStyle = {
  fontFamily: SERIF_FAMILY,
  fontSize: 24,
  lineHeight: 32,
  letterSpacing: 0.5,
};
