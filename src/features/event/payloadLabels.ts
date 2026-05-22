/**
 * 14 作業の payload field value → i18n key マッピング (Issue #296 Phase 1)。
 *
 * display-schema.md v1.3 §「ラベル辞書 _LABEL」 整合。HistoryTab chip 表示で
 * payload value (例: 'normal', 'plenty', 'eda', 'miki') を i18n 経由で
 * 表示文字列 (例: 「いつも通り」「たっぷり」「枝」「幹」) に変換する。
 *
 * 2026-05-23 (Sess34 ADR-0041 PR-2) — payload field 名と enum 値の実装整合化:
 * - 実保存 payload (buildWorkLogPayload in WorkLogTypeFormFields.tsx) の field/value
 *   と payloadValidator schema 拡張で乖離が判明、 13 種別中 多数で chip が出ない既存 bug
 * - 値が同一文字列で複数 context (例: 'light' = water amount + repot roots、 'heavy' =
 *   trim range + repot roots) を持つため、 context 別 resolver で分離
 * - 旧 PAYLOAD_LABEL_MAP は共有値 (parts、 water amount) のみ維持、 残りは context 別 map に分割
 *
 * @see docs/mockups/v1.0/docs/display-schema.md v1.3
 * @see docs/adr/ADR-0041-event-row-display-mode.md D4 (chips フル網羅 + max 4 sentinel)
 * @see src/features/event/WorkLogTypeFormFields.tsx (buildWorkLogPayload — payload 実保存 SoT)
 */
import type { TranslationKey } from '@/src/core/i18n/i18n';

/**
 * 共通 (どの context でも一意な) value → i18n key マッピング。
 * - water amount: normal / plenty / light
 * - parts (prune): eda / ha / shinme / ne
 * - parts (wire/unwire): all / miki  (eda は prune 整合)
 *
 * 注: 'light' は repot roots でも使われるが、 そちらは `getRepotRootsLabelKey` で
 * 独立解決するため、 ここでは water amount の意味に固定。
 */
const PAYLOAD_LABEL_MAP: Record<string, TranslationKey> = {
  // water amount
  normal: 'historyLabelAmountNormal',
  plenty: 'historyLabelAmountPlenty',
  light: 'historyLabelAmountLight',
  // parts (prune)
  eda: 'historyLabelPartsEda',
  ha: 'historyLabelPartsHa',
  shinme: 'historyLabelPartsShinme',
  ne: 'historyLabelPartsNe',
  // parts (wire/unwire)
  all: 'historyLabelPartsAll',
  miki: 'historyLabelPartsMiki',
};

/**
 * Prune amount (剪定の量) value → i18n key。
 * payload.amount = 'few' | 'some' | 'lot' (PRUNE_AMOUNTS)
 */
const PRUNE_AMOUNT_LABEL_MAP: Record<string, TranslationKey> = {
  few: 'historyLabelPruneAmountFew',
  some: 'historyLabelPruneAmountSome',
  lot: 'historyLabelPruneAmountLot',
};

/**
 * Repot root_pruning (植替えの根の整理量) value → i18n key。
 * payload.root_pruning = 'none' | 'light' | 'third' | 'half' (REPOT_ROOT_AMOUNTS)
 * 'light' は PAYLOAD_LABEL_MAP の water amount と衝突するため独立マップ。
 */
const REPOT_ROOTS_LABEL_MAP: Record<string, TranslationKey> = {
  none: 'historyLabelRepotRootsNone',
  light: 'historyLabelRepotRootsLight',
  third: 'historyLabelRepotRootsThird',
  half: 'historyLabelRepotRootsHalf',
};

/**
 * Fertilizing kind (肥料の種類) value → i18n key。
 * payload.kind = 'solid' | 'liquid' | 'slow_release' | 'other' (FERT_KINDS)
 */
const FERT_KIND_LABEL_MAP: Record<string, TranslationKey> = {
  solid: 'historyLabelFertKindSolid',
  liquid: 'historyLabelFertKindLiquid',
  slow_release: 'historyLabelFertKindSlowRelease',
  other: 'historyLabelFertKindOther',
};

/**
 * Pest control target/purpose (病害虫の目的) value → i18n key。
 * payload.target = 'prevention' | 'treatment' | 'both' (PEST_PURPOSES)
 */
const PEST_PURPOSE_LABEL_MAP: Record<string, TranslationKey> = {
  prevention: 'historyLabelPestPurposePrevention',
  treatment: 'historyLabelPestPurposeTreatment',
  both: 'historyLabelPestPurposeBoth',
};

/**
 * Trim range (葉刈り/芽切り の範囲) value → i18n key。
 * payload.body_part = 'tips_only' | 'moderate' | 'heavy' (TRIM_RANGES)
 * leaf_trimming / defoliation / deshoot / candle_cut の 4 種別共通。
 * 'heavy' は REPOT_ROOTS_LABEL_MAP の legacy 'heavy' (現在 form 未使用) と衝突する
 * 可能性あるため独立マップ。
 */
const TRIM_RANGE_LABEL_MAP: Record<string, TranslationKey> = {
  tips_only: 'historyLabelTrimRangeTipsOnly',
  moderate: 'historyLabelTrimRangeModerate',
  heavy: 'historyLabelTrimRangeHeavy',
};

/**
 * Moss care action (苔の手入れ) value → i18n key。
 * payload.action = 'attach' | 'remove' | 'moisten' (MOSS_ACTIONS)
 */
const MOSS_ACTION_LABEL_MAP: Record<string, TranslationKey> = {
  attach: 'historyLabelMossActionAttach',
  remove: 'historyLabelMossActionRemove',
  moisten: 'historyLabelMossActionMoisten',
};

/**
 * Leaf first aid symptom (葉の手当 の症状) value → i18n key。
 * payload.symptom = 'burn' | 'wither' | 'pest' | 'mold' | 'other' (LEAF_AID_SYMPTOMS)
 * 'other' は FERT_KIND の 'other' と衝突するため独立マップ。
 */
const LEAF_AID_SYMPTOM_LABEL_MAP: Record<string, TranslationKey> = {
  burn: 'historyLabelLeafAidSymptomBurn',
  wither: 'historyLabelLeafAidSymptomWither',
  pest: 'historyLabelLeafAidSymptomPest',
  mold: 'historyLabelLeafAidSymptomMold',
  other: 'historyLabelLeafAidSymptomOther',
};

/**
 * 共通 (parts / water amount) field の value → i18n key を取得。
 * 値が辞書にない場合は null。
 */
export function getPayloadValueLabelKey(value: string): TranslationKey | null {
  return PAYLOAD_LABEL_MAP[value] ?? null;
}

/** `pruning.amount` の value → i18n key (PRUNE_AMOUNT_LABEL_MAP)。 */
export function getPruneAmountLabelKey(value: string): TranslationKey | null {
  return PRUNE_AMOUNT_LABEL_MAP[value] ?? null;
}

/** `repotting.root_pruning` の value → i18n key (REPOT_ROOTS_LABEL_MAP)。 */
export function getRepotRootsLabelKey(value: string): TranslationKey | null {
  return REPOT_ROOTS_LABEL_MAP[value] ?? null;
}

/** `fertilizing.kind` の value → i18n key (FERT_KIND_LABEL_MAP)。 */
export function getFertKindLabelKey(value: string): TranslationKey | null {
  return FERT_KIND_LABEL_MAP[value] ?? null;
}

/** `pest_control.target` の value → i18n key (PEST_PURPOSE_LABEL_MAP)。 */
export function getPestPurposeLabelKey(value: string): TranslationKey | null {
  return PEST_PURPOSE_LABEL_MAP[value] ?? null;
}

/** `leaf_trimming/defoliation/deshoot/candle_cut.body_part` の value → i18n key (TRIM_RANGE_LABEL_MAP)。 */
export function getTrimRangeLabelKey(value: string): TranslationKey | null {
  return TRIM_RANGE_LABEL_MAP[value] ?? null;
}

/** `moss_care.action` の value → i18n key (MOSS_ACTION_LABEL_MAP)。 */
export function getMossActionLabelKey(value: string): TranslationKey | null {
  return MOSS_ACTION_LABEL_MAP[value] ?? null;
}

/** `leaf_first_aid.symptom` の value → i18n key (LEAF_AID_SYMPTOM_LABEL_MAP)。 */
export function getLeafAidSymptomLabelKey(value: string): TranslationKey | null {
  return LEAF_AID_SYMPTOM_LABEL_MAP[value] ?? null;
}
