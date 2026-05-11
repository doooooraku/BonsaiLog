/**
 * 14 作業の payload field value → i18n key マッピング (Issue #296 Phase 1)。
 *
 * display-schema.md v1.3 §「ラベル辞書 _LABEL」 整合。HistoryTab chip 表示で
 * payload value (例: 'normal', 'plenty', 'eda', 'miki') を i18n 経由で
 * 表示文字列 (例: 「いつも通り」「たっぷり」「枝」「幹」) に変換する。
 *
 * Phase 2 (HistoryChip / ChipRow component) と Phase 3 (HistoryTab UI 配線)
 * は別 PR。本ファイルはマッピングのみ、UI 側で `t(getPayloadValueLabelKey(...))`
 * で使用する。
 *
 * @see docs/mockups/v1.0/docs/display-schema.md v1.3
 * @see docs/mockups/v1.0/wireframes/detail-screens.jsx _LABEL (L1867-)
 */
import type { TranslationKey } from '@/src/core/i18n/i18n';

/**
 * 共通フィールド (`amount`, `parts`, `kind` 等) の value → i18n key マッピング。
 * 値が見つからない場合は null を返す (UI 側で生 value をそのまま表示するか判断)。
 */
const PAYLOAD_LABEL_MAP: Record<string, TranslationKey> = {
  // amount (water)
  normal: 'historyLabelAmountNormal',
  plenty: 'historyLabelAmountPlenty',
  light: 'historyLabelAmountLight',
  // amount/scope (prune/leaf/defol/bud/mekiri)
  tip: 'historyLabelAmountTip',
  mid: 'historyLabelAmountMid',
  bold: 'historyLabelAmountBold',
  // parts (prune)
  eda: 'historyLabelPartsEda',
  ha: 'historyLabelPartsHa',
  shinme: 'historyLabelPartsShinme',
  ne: 'historyLabelPartsNe',
  // parts (wire/unwire)
  all: 'historyLabelPartsAll',
  miki: 'historyLabelPartsMiki',
  // kind (fert)
  solid: 'historyLabelFertKindSolid',
  liquid: 'historyLabelFertKindLiquid',
  slow: 'historyLabelFertKindSlow',
  other: 'historyLabelFertKindOther',
  // purpose (spray)
  prevent: 'historyLabelSprayPurposePrevent',
  treat: 'historyLabelSprayPurposeTreat',
  both: 'historyLabelSprayPurposeBoth',
  // symptoms (heal)
  yake: 'historyLabelHealSymptomsYake',
  kare: 'historyLabelHealSymptomsKare',
  mushi: 'historyLabelHealSymptomsMushi',
  kabi: 'historyLabelHealSymptomsKabi',
  // tasks (moss)
  add: 'historyLabelMossTasksAdd',
  remove: 'historyLabelMossTasksRemove',
  water: 'historyLabelMossTasksWater',
};

/**
 * `repot.roots` field の value → i18n key (一般的な `light` / `mid` / `bold` と
 * 衝突しないよう独立マップ)。display-schema.md L239 `_ROOTS_LABEL` 整合。
 */
const REPOT_ROOTS_LABEL_MAP: Record<string, TranslationKey> = {
  none: 'historyLabelRepotRootsNone',
  light: 'historyLabelRepotRootsLight',
  half: 'historyLabelRepotRootsHalf',
  heavy: 'historyLabelRepotRootsHeavy',
};

/**
 * `heal.symptoms` の `'other'` は共通 `_LABEL.other` (「その他」) と key 衝突するため、
 * コンテクスト付きラベル「症状その他」 で表示する。display-schema.md L242 整合。
 */
const HEAL_SYMPTOMS_OTHER_KEY: TranslationKey = 'historyLabelHealSymptomsOther';

/**
 * 共通フィールド (amount, parts, kind 等) の value → i18n key を取得。
 * 値が辞書にない場合は null。
 */
export function getPayloadValueLabelKey(value: string): TranslationKey | null {
  return PAYLOAD_LABEL_MAP[value] ?? null;
}

/**
 * `repot.roots` の value → i18n key を取得 (独立マップ)。
 */
export function getRepotRootsLabelKey(value: string): TranslationKey | null {
  return REPOT_ROOTS_LABEL_MAP[value] ?? null;
}

/**
 * `heal.symptoms` field の value → i18n key を取得。
 * `'other'` は HEAL_SYMPTOMS_OTHER_KEY (「症状その他」) で衝突回避。
 */
export function getHealSymptomsLabelKey(value: string): TranslationKey | null {
  if (value === 'other') return HEAL_SYMPTOMS_OTHER_KEY;
  return PAYLOAD_LABEL_MAP[value] ?? null;
}
