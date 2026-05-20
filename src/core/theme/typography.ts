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
