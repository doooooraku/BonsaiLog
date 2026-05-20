/**
 * WorkLogTypeFormFields — 14 種別 form 共通 controlled component (Sess17 PR-G1)。
 *
 * ADR-0029 D5 + design_system.md §16 整合。 Single (WorkLogConfirm) と Bulk
 * (BulkLogConfirm) で完全 1:1 UI を実現するため、 14 種別固有 form を 1 component に
 * 切り出し、 両 caller から呼び出す。
 *
 * controlled component (state hoisting):
 * - state は caller (WorkLogConfirm / BulkLogConfirm) が保持
 * - props.state / props.onChange で type 別 form field を render
 * - ref / forwardRef は使用禁止 (test 困難 + state 不可視のため)
 *
 * 動作:
 * - props.type で render する form field を switch (14 種別)
 * - 各 field の value/onChange は props.state 経由
 *
 * 流用範囲:
 * - WorkLogConfirmScreen (Single、 単盆栽): 自身の state を hoisting して props.state に渡す
 * - BulkLogConfirmScreen (Bulk、 複数盆栽同一内容): 同様に hoisting、 全選択盆栽に同 payload 適用
 *
 * 関連: docs/reference/design_system.md §16 Single/Bulk 動線整合
 *       ADR-0029 D5
 *       Sess17 PR-G1
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';

import { LabeledNumberInput } from '@/src/components/form/LabeledNumberInput';
import { LabeledNumberInputUnit } from '@/src/components/form/LabeledNumberInputUnit';
import { LabeledNumberSegmentOrFree } from '@/src/components/form/LabeledNumberSegmentOrFree';
import { LabeledSegmented } from '@/src/components/form/LabeledSegmented';
import { LabeledTextInput } from '@/src/components/form/LabeledTextInput';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
import { lengthToCanonical, type LengthUnit } from '@/src/core/util/unitConvert';
import type { EventType } from '@/src/db/schema';

// =========================================================================
// 14 種別 enum 定数 (Sess16 確立、 Sess17 で WorkLogConfirm から移植)
// =========================================================================

export const WATER_AMOUNTS = ['normal', 'plenty', 'light'] as const;
export const PRUNE_PARTS = ['eda', 'ha', 'shinme', 'ne'] as const;
export const PRUNE_AMOUNTS = ['few', 'some', 'lot'] as const;
export const WIRE_GAUGES = ['1mm', '1.5mm', '2mm', '2.5mm', '3mm'] as const;
export const WIRE_PARTS = ['all', 'miki', 'eda'] as const;
export const UNWIRE_PARTS = ['miki', 'eda', 'all'] as const;
export const REPOT_ROOT_AMOUNTS = ['none', 'light', 'third', 'half'] as const;
export const FERT_KINDS = ['solid', 'liquid', 'slow_release', 'other'] as const;
export const PEST_PURPOSES = ['prevention', 'treatment', 'both'] as const;
export const TRIM_RANGES = ['tips_only', 'moderate', 'heavy'] as const;
export const MOSS_ACTIONS = ['attach', 'remove', 'moisten'] as const;
export const LEAF_AID_SYMPTOMS = ['burn', 'wither', 'pest', 'mold', 'other'] as const;

// =========================================================================
// State union type (14 種別の payload 入力中 state を 1 つの object に集約)
// =========================================================================

export type WorkLogTypeFormState = {
  // watering
  waterAmount: (typeof WATER_AMOUNTS)[number];
  // pruning
  pruneParts: readonly (typeof PRUNE_PARTS)[number][];
  pruneAmount: (typeof PRUNE_AMOUNTS)[number];
  // wiring (hybrid: segment 値 or 「その他」 数値文字列)
  wireGauge: string;
  wireParts: (typeof WIRE_PARTS)[number];
  wireUnwireDate: string;
  // unwiring
  unwireParts: (typeof UNWIRE_PARTS)[number];
  // repotting (cm/mm/inch 切替)
  repotPotSize: string;
  repotPotSizeUnit: LengthUnit;
  repotSoilMix: string;
  repotRootAmount: (typeof REPOT_ROOT_AMOUNTS)[number];
  // fertilizing
  fertKind: (typeof FERT_KINDS)[number];
  fertProduct: string;
  // pest_control
  pestPurpose: (typeof PEST_PURPOSES)[number];
  pestAgent: string;
  pestDilution: string;
  // leaf_trimming family (4 種共通)
  trimRange: (typeof TRIM_RANGES)[number];
  candleCount: string;
  // moss_care + position_change
  mossAction: (typeof MOSS_ACTIONS)[number];
  positionTo: string;
  // leaf_first_aid
  leafAidSymptom: (typeof LEAF_AID_SYMPTOMS)[number];
  leafAidTreatment: string;
};

/**
 * 初期 state factory (caller の useState で使用)。
 * @param defaultUnit settingsStore.potUnit を渡す (repotPotSizeUnit 初期値)
 */
export function createWorkLogTypeFormInitialState(defaultUnit: LengthUnit): WorkLogTypeFormState {
  return {
    waterAmount: 'normal',
    pruneParts: ['eda'],
    pruneAmount: 'some',
    wireGauge: '1mm',
    wireParts: 'all',
    wireUnwireDate: '',
    unwireParts: 'all',
    repotPotSize: '',
    repotPotSizeUnit: defaultUnit,
    repotSoilMix: '',
    repotRootAmount: 'light',
    fertKind: 'solid',
    fertProduct: '',
    pestPurpose: 'prevention',
    pestAgent: '',
    pestDilution: '',
    trimRange: 'moderate',
    candleCount: '',
    mossAction: 'attach',
    positionTo: '',
    leafAidSymptom: 'burn',
    leafAidTreatment: '',
  };
}

export type WorkLogTypeFormFieldsProps = {
  type: EventType;
  state: WorkLogTypeFormState;
  onChange: (next: WorkLogTypeFormState) => void;
};

/**
 * 14 種別固有 form の入力 fields を render する controlled component。
 * caller (WorkLogConfirm / BulkLogConfirm) の type 値に応じて適切な field 群を表示。
 */
export function WorkLogTypeFormFields({ type, state, onChange }: WorkLogTypeFormFieldsProps) {
  const { t } = useTranslation();

  // 部分更新 helper (state immutable update)
  const update = <K extends keyof WorkLogTypeFormState>(key: K, value: WorkLogTypeFormState[K]) => {
    onChange({ ...state, [key]: value });
  };

  // pruning の multi-select toggle
  const togglePrunePart = (v: string) => {
    const t_v = v as (typeof PRUNE_PARTS)[number];
    if (state.pruneParts.includes(t_v)) {
      update(
        'pruneParts',
        state.pruneParts.filter((p) => p !== t_v),
      );
    } else {
      update('pruneParts', [...state.pruneParts, t_v]);
    }
  };

  return (
    <>
      {type === 'watering' && (
        <LabeledSegmented
          label={t('workLogWaterAmount')}
          items={WATER_AMOUNTS.map((v) => ({
            v,
            l: t(`workLogWaterAmount_${v}` as TranslationKey),
          }))}
          value={state.waterAmount}
          onChange={(v) => update('waterAmount', v as (typeof WATER_AMOUNTS)[number])}
          testID="e2e_work_log_water_amount"
        />
      )}

      {type === 'pruning' && (
        <>
          <LabeledSegmented
            label={t('workLogPruneParts')}
            items={PRUNE_PARTS.map((v) => ({ v, l: t(`workLogPrunePart_${v}` as TranslationKey) }))}
            value={state.pruneParts}
            onChange={togglePrunePart}
            multi
            testID="e2e_work_log_prune_parts"
          />
          <LabeledSegmented
            label={t('workLogPruneAmount')}
            items={PRUNE_AMOUNTS.map((v) => ({
              v,
              l: t(`workLogPruneAmount_${v}` as TranslationKey),
            }))}
            value={state.pruneAmount}
            onChange={(v) => update('pruneAmount', v as (typeof PRUNE_AMOUNTS)[number])}
            testID="e2e_work_log_prune_amount"
          />
        </>
      )}

      {type === 'wiring' && (
        <>
          <LabeledNumberSegmentOrFree
            label={t('workLogWireGauge')}
            segments={WIRE_GAUGES.map((v) => ({ value: v, label: v }))}
            value={state.wireGauge}
            onChangeValue={(v) => update('wireGauge', v)}
            freeUnit="mm"
            testID="e2e_work_log_wire_gauge"
          />
          <LabeledSegmented
            label={t('workLogWireParts')}
            items={WIRE_PARTS.map((v) => ({ v, l: t(`workLogWirePart_${v}` as TranslationKey) }))}
            value={state.wireParts}
            onChange={(v) => update('wireParts', v as (typeof WIRE_PARTS)[number])}
            testID="e2e_work_log_wire_parts"
          />
          {/* 外し予定日は scheduled_unwire_at 専用、 LabeledDateRow は caller (WorkLogConfirm) で
              共通 date と別に render するため、 本 component には含めない */}
        </>
      )}

      {type === 'unwiring' && (
        <LabeledSegmented
          label={t('workLogUnwireParts')}
          items={UNWIRE_PARTS.map((v) => ({ v, l: t(`workLogUnwirePart_${v}` as TranslationKey) }))}
          value={state.unwireParts}
          onChange={(v) => update('unwireParts', v as (typeof UNWIRE_PARTS)[number])}
          testID="e2e_work_log_unwire_parts"
        />
      )}

      {type === 'repotting' && (
        <>
          <LabeledNumberInputUnit
            label={t('workLogRepotPotSize')}
            value={state.repotPotSize}
            unit={state.repotPotSizeUnit}
            onChangeValue={(v) => update('repotPotSize', v)}
            onChangeUnit={(u) => update('repotPotSizeUnit', u)}
            placeholder={t('workLogRepotPotSizePlaceholder')}
            optional
            optionalText={t('workLogOptional')}
            testID="e2e_work_log_repot_pot_size"
            testIDUnit="e2e_work_log_repot_pot_unit"
          />
          <View style={styles.field}>
            <LabeledTextInput
              label={t('workLogRepotSoilMix')}
              optional
              optionalText={t('workLogOptional')}
              value={state.repotSoilMix}
              onChangeText={(v) => update('repotSoilMix', v)}
              placeholder={t('workLogRepotSoilMixPlaceholder')}
              maxLength={200}
              testID="e2e_work_log_repot_soil_mix"
            />
          </View>
          <LabeledSegmented
            label={t('workLogRepotRootAmount')}
            items={REPOT_ROOT_AMOUNTS.map((v) => ({
              v,
              l: t(`workLogRepotRootAmount_${v}` as TranslationKey),
            }))}
            value={state.repotRootAmount}
            onChange={(v) => update('repotRootAmount', v as (typeof REPOT_ROOT_AMOUNTS)[number])}
            testID="e2e_work_log_repot_root_amount"
          />
        </>
      )}

      {type === 'fertilizing' && (
        <>
          <LabeledSegmented
            label={t('workLogFertKind')}
            items={FERT_KINDS.map((v) => ({
              v,
              l: t(`workLogFertKind_${v}` as TranslationKey),
            }))}
            value={state.fertKind}
            onChange={(v) => update('fertKind', v as (typeof FERT_KINDS)[number])}
            testID="e2e_work_log_fert_kind"
          />
          <View style={styles.field}>
            <LabeledTextInput
              label={t('workLogFertProduct')}
              optional
              optionalText={t('workLogOptional')}
              value={state.fertProduct}
              onChangeText={(v) => update('fertProduct', v)}
              placeholder={t('workLogFertProductPlaceholder')}
              maxLength={100}
              testID="e2e_work_log_fert_product"
            />
          </View>
        </>
      )}

      {type === 'pest_control' && (
        <>
          <LabeledSegmented
            label={t('workLogPestPurpose')}
            items={PEST_PURPOSES.map((v) => ({
              v,
              l: t(`workLogPestPurpose_${v}` as TranslationKey),
            }))}
            value={state.pestPurpose}
            onChange={(v) => update('pestPurpose', v as (typeof PEST_PURPOSES)[number])}
            testID="e2e_work_log_pest_purpose"
          />
          <View style={styles.field}>
            <LabeledTextInput
              label={t('workLogPestAgent')}
              optional
              optionalText={t('workLogOptional')}
              value={state.pestAgent}
              onChangeText={(v) => update('pestAgent', v)}
              placeholder={t('workLogPestAgentPlaceholder')}
              maxLength={100}
              testID="e2e_work_log_pest_agent"
            />
          </View>
          <View style={styles.field}>
            <LabeledNumberInput
              label={t('workLogPestDilution')}
              optional
              optionalText={t('workLogOptional')}
              value={state.pestDilution}
              onChangeText={(v) => update('pestDilution', v)}
              placeholder={t('workLogPestDilutionPlaceholder')}
              suffix={t('workLogPestDilutionUnit')}
              testID="e2e_work_log_pest_dilution"
            />
          </View>
        </>
      )}

      {(type === 'leaf_trimming' ||
        type === 'defoliation' ||
        type === 'deshoot' ||
        type === 'candle_cut') && (
        <>
          <LabeledSegmented
            label={t('workLogTrimRange')}
            items={TRIM_RANGES.map((v) => ({
              v,
              l: t(`workLogTrimRange_${v}` as TranslationKey),
            }))}
            value={state.trimRange}
            onChange={(v) => update('trimRange', v as (typeof TRIM_RANGES)[number])}
            testID="e2e_work_log_trim_range"
          />
          {type === 'candle_cut' && (
            <View style={styles.field}>
              <LabeledNumberInput
                label={t('workLogCandleCount')}
                optional
                optionalText={t('workLogOptional')}
                value={state.candleCount}
                onChangeText={(v) => update('candleCount', v)}
                placeholder={t('workLogCandleCountPlaceholder')}
                suffix={t('workLogCandleCountUnit')}
                testID="e2e_work_log_candle_count"
              />
            </View>
          )}
        </>
      )}

      {type === 'moss_care' && (
        <LabeledSegmented
          label={t('workLogMossAction')}
          items={MOSS_ACTIONS.map((v) => ({
            v,
            l: t(`workLogMossAction_${v}` as TranslationKey),
          }))}
          value={state.mossAction}
          onChange={(v) => update('mossAction', v as (typeof MOSS_ACTIONS)[number])}
          testID="e2e_work_log_moss_action"
        />
      )}

      {type === 'position_change' && (
        <View style={styles.field}>
          <LabeledTextInput
            label={t('workLogPositionTo')}
            optional
            optionalText={t('workLogOptional')}
            value={state.positionTo}
            onChangeText={(v) => update('positionTo', v)}
            placeholder={t('workLogPositionToPlaceholder')}
            maxLength={100}
            testID="e2e_work_log_position_to"
          />
        </View>
      )}

      {type === 'leaf_first_aid' && (
        <>
          <LabeledSegmented
            label={t('workLogLeafAidSymptom')}
            items={LEAF_AID_SYMPTOMS.map((v) => ({
              v,
              l: t(`workLogLeafAidSymptom_${v}` as TranslationKey),
            }))}
            value={state.leafAidSymptom}
            onChange={(v) => update('leafAidSymptom', v as (typeof LEAF_AID_SYMPTOMS)[number])}
            testID="e2e_work_log_leaf_aid_symptom"
          />
          <View style={styles.field}>
            <LabeledTextInput
              label={t('workLogLeafAidTreatment')}
              optional
              optionalText={t('workLogOptional')}
              value={state.leafAidTreatment}
              onChangeText={(v) => update('leafAidTreatment', v)}
              placeholder={t('workLogLeafAidTreatmentPlaceholder')}
              maxLength={200}
              testID="e2e_work_log_leaf_aid_treatment"
            />
          </View>
        </>
      )}
    </>
  );
}

/**
 * type に対応する note placeholder の i18n key を返す純関数 (Sess18 PR-10、 ADR-0029 D2 拡張)。
 *
 * 14 種別の type-specific note placeholder key (`workLogNotePlaceholder_${type}`) を返却。
 * caller (WorkLogConfirm / BulkLogConfirm) でメモ field の placeholder を type-aware に解決。
 *
 * 設計方針:
 * - 14 種別すべて `workLogNotePlaceholder_${type}` で完備 (Sess18 PR-5 で 18 言語追加済)
 * - 未対応 type への defensive fallback として共通 `workLogNotePlaceholder` を許容 (将来の type 追加時の安全網)
 *
 * @example
 *   const placeholderKey = getWorkLogNotePlaceholderKey('watering');
 *   // → 'workLogNotePlaceholder_watering'
 *   t(placeholderKey)  // → '例: 朝8時、たっぷり' (ja)
 *
 * @param type EventType
 * @returns TranslationKey (type-specific or fallback)
 */
export function getWorkLogNotePlaceholderKey(
  type: EventType,
): `workLogNotePlaceholder_${EventType}` | 'workLogNotePlaceholder' {
  return `workLogNotePlaceholder_${type}` as `workLogNotePlaceholder_${EventType}`;
}

/**
 * type と state から payload (events.payload_json に保存する) を生成する純関数。
 * caller (WorkLogConfirm / BulkLogConfirm) が保存時に呼び出す。
 *
 * @returns Record<string, unknown> (Valibot strict ではないため追加 prop は warning なし通過)
 */
export function buildWorkLogPayload(
  type: EventType,
  state: WorkLogTypeFormState,
): Record<string, unknown> {
  // 動的 import せず、 ここで直接 inline (build size ?? なし)
  // 単純な switch 構造、 各 type の payload 仕様は ADR-0027/0028/0029 + functional_spec §7.3.2.1 整合
  const payload: Record<string, unknown> = {};
  if (type === 'watering') {
    payload.amount = state.waterAmount;
  } else if (type === 'pruning') {
    payload.parts = [...state.pruneParts];
    payload.amount = state.pruneAmount;
  } else if (type === 'wiring') {
    const numericPart = state.wireGauge.replace('mm', '').trim();
    const gaugeNum = parseFloat(numericPart);
    if (!Number.isNaN(gaugeNum) && gaugeNum > 0) payload.wire_size_mm = gaugeNum;
    payload.body_part = state.wireParts;
    if (state.wireUnwireDate) payload.scheduled_unwire_at = `${state.wireUnwireDate}T00:00:00.000Z`;
  } else if (type === 'unwiring') {
    payload.body_part = state.unwireParts;
  } else if (type === 'repotting') {
    // unit conversion は本関数で実行 (state.repotPotSize は user 入力単位文字列)、
    // payload には cm canonical の number で保存。
    const sizeCm = lengthToCanonical(state.repotPotSize, state.repotPotSizeUnit);
    if (sizeCm != null) payload.pot_size_cm = sizeCm;
    const soilTrimmed = state.repotSoilMix.trim();
    if (soilTrimmed.length > 0) payload.soil_mix = soilTrimmed;
    payload.root_pruning = state.repotRootAmount;
  } else if (type === 'fertilizing') {
    payload.kind = state.fertKind;
    const productTrimmed = state.fertProduct.trim();
    if (productTrimmed.length > 0) payload.amount = productTrimmed;
  } else if (type === 'pest_control') {
    payload.target = state.pestPurpose;
    const agentTrimmed = state.pestAgent.trim();
    if (agentTrimmed.length > 0) payload.agent = agentTrimmed;
    const dilutionNum = parseFloat(state.pestDilution);
    if (!Number.isNaN(dilutionNum)) payload.dilution_ratio = dilutionNum;
  } else if (
    type === 'leaf_trimming' ||
    type === 'defoliation' ||
    type === 'deshoot' ||
    type === 'candle_cut'
  ) {
    payload.body_part = state.trimRange;
    if (type === 'candle_cut') {
      const countNum = parseInt(state.candleCount, 10);
      if (!Number.isNaN(countNum) && countNum > 0) payload.count = countNum;
    }
  } else if (type === 'moss_care') {
    payload.action = state.mossAction;
  } else if (type === 'position_change') {
    const toTrimmed = state.positionTo.trim();
    if (toTrimmed.length > 0) payload.to = toTrimmed;
  } else if (type === 'leaf_first_aid') {
    payload.symptom = state.leafAidSymptom;
    const treatmentTrimmed = state.leafAidTreatment.trim();
    if (treatmentTrimmed.length > 0) payload.treatment = treatmentTrimmed;
  }
  return payload;
}

const styles = StyleSheet.create({
  field: { marginBottom: 18 },
});
