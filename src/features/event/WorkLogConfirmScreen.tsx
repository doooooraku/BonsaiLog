/**
 * 作業記録 詳細 入力画面 (Phase G2 part 2、ADR-0024 Accepted)。
 *
 * 旧 `WorkLogConfirmSheet.tsx` (`@gorhom/bottom-sheet` snap 78%) を画面化、
 * `(modals)/work-log-confirm` route で `presentation: 'formSheet'` 配下に配置。
 *
 * 種別別 form 入力 (watering / pruning / wiring) + note (全種別共通) を入力して保存。
 * - watering: 水量 (normal/plenty/light)
 * - pruning: 部位 (eda/ha/shinme/ne) + 量 (few/some/lot)
 * - wiring: 番手 (1mm-3.5mm) + 部位 (miki/eda) + 目安期間 (4w-20w)
 * - その他 10 種別: フォーム省略、note のみ
 *
 * Query params:
 * - bonsaiName: 表示用 (サブタイトル)
 * - type: 作業種別 (EventType、必須)
 *
 * 保存時に `usePickerStore.setWorkLogConfirmResult({ type, note, payload })` + `router.back()`
 * で caller に返却。caller 側 `useFocusEffect` で `consumeWorkLogConfirmResult()` 取得 →
 * createEvent で DB に書込。
 */
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LabeledDateRow } from '@/src/components/form/LabeledDateRow';
import { LabeledNumberInput } from '@/src/components/form/LabeledNumberInput';
import { LabeledNumberInputUnit } from '@/src/components/form/LabeledNumberInputUnit';
import { LabeledNumberSegmentOrFree } from '@/src/components/form/LabeledNumberSegmentOrFree';
import { LabeledSegmented } from '@/src/components/form/LabeledSegmented';
import { LabeledTextInput } from '@/src/components/form/LabeledTextInput';
import { PhotoField, type PhotoFieldItem } from '@/src/components/form/PhotoField';
import { nowUtc } from '@/src/core/datetime';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
import {
  BG_PRIMARY,
  BORDER_DEFAULT,
  BRAND_GREEN,
  ON_BRAND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import type { LengthUnit } from '@/src/core/util/unitConvert';
import { lengthToCanonical } from '@/src/core/util/unitConvert';
import type { EventType } from '@/src/db/schema';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { usePickerStore, type WorkLogPayload } from '@/src/stores/pickerStore';

export type { WorkLogPayload };

const WATER_AMOUNTS = ['normal', 'plenty', 'light'] as const;
const PRUNE_PARTS = ['eda', 'ha', 'shinme', 'ne'] as const;
const PRUNE_AMOUNTS = ['few', 'some', 'lot'] as const;
// Sess16 PR-A5: mockup 整合 — 3.5mm 削除 (5 段階)、 巻く部位 multi → single + 'all' 追加、
// 期間 segment → 外し予定日 date 化 (LabeledDateRow、 payload.scheduled_unwire_at 整合)。
const WIRE_GAUGES = ['1mm', '1.5mm', '2mm', '2.5mm', '3mm'] as const;
const WIRE_PARTS = ['all', 'miki', 'eda'] as const;
// Sess16 PR-D1: unwiring 外した部位 (single segment、 mockup 135200.png)。
const UNWIRE_PARTS = ['miki', 'eda', 'all'] as const;
// Sess16 PR-D2: repotting 根の整理 (single segment、 mockup 134811.png 左)。
const REPOT_ROOT_AMOUNTS = ['none', 'light', 'third', 'half'] as const;
// Sess16 PR-D3: fertilizing 肥料の種類 (single segment、 mockup 134811.png 中央)。
const FERT_KINDS = ['solid', 'liquid', 'slow_release', 'other'] as const;
// Sess16 PR-D4: pest_control 目的 (single segment、 mockup 134811.png 右)。
const PEST_PURPOSES = ['prevention', 'treatment', 'both'] as const;
// Sess16 PR-D5: leaf_trimming / defoliation / deshoot / candle_cut 共通の「範囲」 segment
// (mockup 135027.png / 135123.png 整合: 枝先のみ/そこそこ/思い切り)。
const TRIM_RANGES = ['tips_only', 'moderate', 'heavy'] as const;
// Sess16 PR-D6: moss_care 作業内容 (single segment、 mockup 135100.png 左)。
const MOSS_ACTIONS = ['attach', 'remove', 'moisten'] as const;
// Sess16 PR-E: leaf_first_aid 症状 (single segment、 mockup 135145.png)。
const LEAF_AID_SYMPTOMS = ['burn', 'wither', 'pest', 'mold', 'other'] as const;

export default function WorkLogConfirmScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ bonsaiName?: string; type?: EventType }>();
  const bonsaiName = params.bonsaiName ?? '';
  const selectedType = (params.type ?? null) as EventType | null;

  const [note, setNote] = React.useState('');
  // Sess16 PR-A2 → PR-H: 日付選択 default = 今日 (Repolog pattern 整合)、 maxToday=true で未来日防止。
  // ADR-0008 §TZ 3 層防御: new Date() 引数なし禁止、 nowUtc() 経由。
  const [occurredAtDate, setOccurredAtDate] = React.useState(() =>
    (nowUtc() as string).slice(0, 10),
  );
  // Sess16 PR-A3 → PR-H: 写真添付 (caption 削除、 BonsaiBasicForm PendingPhoto 整合)。
  const [photos, setPhotos] = React.useState<readonly PhotoFieldItem[]>([]);
  const [waterAmount, setWaterAmount] = React.useState<(typeof WATER_AMOUNTS)[number]>('normal');
  const [pruneParts, setPruneParts] = React.useState<readonly (typeof PRUNE_PARTS)[number][]>([
    'eda',
  ]);
  const [pruneAmount, setPruneAmount] = React.useState<(typeof PRUNE_AMOUNTS)[number]>('some');
  // Sess17 PR-F2: WIRE_GAUGES 5 段階 + その他 hybrid (LabeledNumberSegmentOrFree)。
  // value 形式: segment 内なら '1mm' / '1.5mm' / ... / '3mm'、 その他なら数値文字列 ('3.5' 等)。
  // payload では wire_size_mm = parseFloat(value.replace('mm','')) で統一。
  const [wireGauge, setWireGauge] = React.useState<string>('1mm');
  // Sess16 PR-A5: multi → single + 'all' default
  const [wireParts, setWireParts] = React.useState<(typeof WIRE_PARTS)[number]>('all');
  // Sess16 PR-A5: 期間 segment → 外し予定日 date (LabeledDateRow、 mockup「年/月/日」 整合)。
  const [wireUnwireDate, setWireUnwireDate] = React.useState('');
  // Sess16 PR-D1: unwiring 外した部位 (default 'all'、 single)。
  const [unwireParts, setUnwireParts] = React.useState<(typeof UNWIRE_PARTS)[number]>('all');
  // Sess16 PR-D2: repotting (鉢サイズ + 用土レシピ + 根の整理)。
  // Sess17 PR-F2: 鉢サイズに単位切替 (cm/mm/inch) 追加 (ADR-0029 D3 LabeledNumberInputUnit)。
  // user 入力単位の文字列、 unit と組み合わせて lengthToCanonical で cm 正規化して payload に保存。
  const settingsPotUnit = useSettingsStore((s) => s.potUnit);
  const [repotPotSize, setRepotPotSize] = React.useState('');
  const [repotPotSizeUnit, setRepotPotSizeUnit] = React.useState<LengthUnit>(settingsPotUnit);
  const [repotSoilMix, setRepotSoilMix] = React.useState('');
  const [repotRootAmount, setRepotRootAmount] =
    React.useState<(typeof REPOT_ROOT_AMOUNTS)[number]>('light');
  // Sess16 PR-D3: fertilizing (肥料の種類 + 銘柄・配合)。
  const [fertKind, setFertKind] = React.useState<(typeof FERT_KINDS)[number]>('solid');
  const [fertProduct, setFertProduct] = React.useState('');
  // Sess16 PR-D4: pest_control (目的 + 薬剤名 + 希釈倍率)。
  const [pestPurpose, setPestPurpose] =
    React.useState<(typeof PEST_PURPOSES)[number]>('prevention');
  const [pestAgent, setPestAgent] = React.useState('');
  const [pestDilution, setPestDilution] = React.useState('');
  // Sess16 PR-D5: leaf_trimming / defoliation / deshoot / candle_cut 共通の「範囲」 segment。
  const [trimRange, setTrimRange] = React.useState<(typeof TRIM_RANGES)[number]>('moderate');
  // Sess16 PR-D5: candle_cut のみ「本数」 (任意)。
  const [candleCount, setCandleCount] = React.useState('');
  // Sess16 PR-D6: moss_care 作業内容 + position_change 移動先。
  const [mossAction, setMossAction] = React.useState<(typeof MOSS_ACTIONS)[number]>('attach');
  const [positionTo, setPositionTo] = React.useState('');
  // Sess16 PR-E: leaf_first_aid (症状 + 処置)。
  const [leafAidSymptom, setLeafAidSymptom] =
    React.useState<(typeof LEAF_AID_SYMPTOMS)[number]>('burn');
  const [leafAidTreatment, setLeafAidTreatment] = React.useState('');

  const togglePart = <T extends string>(
    current: readonly T[],
    value: T,
    setter: (next: readonly T[]) => void,
  ) => {
    if (current.includes(value)) setter(current.filter((p) => p !== value));
    else setter([...current, value]);
  };

  const handleSubmit = () => {
    if (selectedType == null) return;
    const payload: Record<string, unknown> = {};
    if (selectedType === 'watering') {
      payload.amount = waterAmount;
    } else if (selectedType === 'pruning') {
      payload.parts = [...pruneParts];
      payload.amount = pruneAmount;
    } else if (selectedType === 'wiring') {
      // Sess16 PR-A5 + Sess17 PR-F2 (hybrid): payload schema 整合 (WiringPayload: wire_size_mm / body_part / scheduled_unwire_at)。
      // wireGauge は '1mm' 等の segment 値 or 「その他」 時の数値文字列 ('3.5' 等)。
      const numericPart = wireGauge.replace('mm', '').trim();
      const gaugeNum = parseFloat(numericPart);
      if (!Number.isNaN(gaugeNum) && gaugeNum > 0) payload.wire_size_mm = gaugeNum;
      payload.body_part = wireParts;
      if (wireUnwireDate) payload.scheduled_unwire_at = `${wireUnwireDate}T00:00:00.000Z`;
    } else if (selectedType === 'unwiring') {
      // Sess16 PR-D1: UnwiringPayload.body_part (mockup 外した部位 整合)。
      payload.body_part = unwireParts;
    } else if (selectedType === 'repotting') {
      // Sess16 PR-D2 + Sess17 PR-F2 (単位切替): RepottingPayload (pot_size_cm canonical / soil_mix / root_pruning)。
      // repotPotSize は user 入力単位 (cm/mm/inch)、 cm に正規化して payload 保存。
      const sizeCm = lengthToCanonical(repotPotSize, repotPotSizeUnit);
      if (sizeCm != null) payload.pot_size_cm = sizeCm;
      const soilTrimmed = repotSoilMix.trim();
      if (soilTrimmed.length > 0) payload.soil_mix = soilTrimmed;
      payload.root_pruning = repotRootAmount;
    } else if (selectedType === 'fertilizing') {
      // Sess16 PR-D3: FertilizingPayload (kind / amount = 銘柄・配合 として使用)。
      payload.kind = fertKind;
      const productTrimmed = fertProduct.trim();
      if (productTrimmed.length > 0) payload.amount = productTrimmed;
    } else if (selectedType === 'pest_control') {
      // Sess16 PR-D4: PestControlPayload (agent = 薬剤名 / target = 目的) + 拡張 dilution_ratio。
      payload.target = pestPurpose;
      const agentTrimmed = pestAgent.trim();
      if (agentTrimmed.length > 0) payload.agent = agentTrimmed;
      const dilutionNum = parseFloat(pestDilution);
      if (!Number.isNaN(dilutionNum)) payload.dilution_ratio = dilutionNum;
    } else if (
      selectedType === 'leaf_trimming' ||
      selectedType === 'defoliation' ||
      selectedType === 'deshoot' ||
      selectedType === 'candle_cut'
    ) {
      // Sess16 PR-D5: 4 種別共通の「範囲」 segment を body_part に格納 (schema 整合 fallback)。
      payload.body_part = trimRange;
      if (selectedType === 'candle_cut') {
        // Sess16 PR-D5: candle_cut のみ「本数」 (任意) を拡張 field に格納。
        const countNum = parseInt(candleCount, 10);
        if (!Number.isNaN(countNum) && countNum > 0) payload.count = countNum;
      }
    } else if (selectedType === 'moss_care') {
      // Sess16 PR-D6: MossCarePayload.action (mockup 貼り直し/剥がす/湿らす 整合)。
      payload.action = mossAction;
    } else if (selectedType === 'position_change') {
      // Sess16 PR-D6: PositionChangePayload.to (mockup 移動先 整合、 from は現状未取得)。
      const toTrimmed = positionTo.trim();
      if (toTrimmed.length > 0) payload.to = toTrimmed;
    } else if (selectedType === 'leaf_first_aid') {
      // Sess16 PR-E: LeafFirstAidPayload (mockup 症状 + 処置 整合)。
      payload.symptom = leafAidSymptom;
      const treatmentTrimmed = leafAidTreatment.trim();
      if (treatmentTrimmed.length > 0) payload.treatment = treatmentTrimmed;
    }
    usePickerStore.getState().setWorkLogConfirmResult({
      type: selectedType,
      note: note.trim(),
      payload,
      // Sess16 PR-A2: occurredAtDate を caller へ (未指定なら caller で nowUtc default)。
      ...(occurredAtDate ? { occurredAtDate } : {}),
      // Sess16 PR-A3: photos を caller へ (caller が addPhotoFromUri で永続化)。
      ...(photos.length > 0 ? { photos } : {}),
    });
    router.back();
  };

  if (selectedType == null) return null;
  const titleLabel = t(`eventType_${selectedType}` as TranslationKey);

  return (
    <View style={styles.container} testID="e2e_work_log_confirm_screen">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>
            {t('workLogTitle').replace('{type}', titleLabel)}
          </ThemedText>
          <ThemedText style={styles.subject}>{bonsaiName}</ThemedText>
        </View>

        {/* Sess16 PR-A2: 日付選択 (mockup 14 種別共通 field、 全 form の先頭に配置)。 */}
        <View style={styles.field}>
          <LabeledDateRow
            label={t('workLogDateField')}
            optional
            optionalText={t('workLogOptional')}
            value={occurredAtDate}
            onChangeText={setOccurredAtDate}
            placeholder={t('workLogDatePlaceholderToday')}
            maxToday
            testID="e2e_work_log_date"
            testIDClear="e2e_work_log_date_clear"
          />
        </View>

        {/* Sess17 PR-F1: 内部 Field + Segmented → LabeledSegmented atom 移行 (ADR-0029 D3)。 */}
        {selectedType === 'watering' && (
          <LabeledSegmented
            label={t('workLogWaterAmount')}
            items={WATER_AMOUNTS.map((v) => ({
              v,
              l: t(`workLogWaterAmount_${v}` as TranslationKey),
            }))}
            value={waterAmount}
            onChange={(v) => setWaterAmount(v as (typeof WATER_AMOUNTS)[number])}
            testID="e2e_work_log_water_amount"
          />
        )}

        {selectedType === 'pruning' && (
          <>
            <LabeledSegmented
              label={t('workLogPruneParts')}
              items={PRUNE_PARTS.map((v) => ({
                v,
                l: t(`workLogPrunePart_${v}` as TranslationKey),
              }))}
              value={pruneParts}
              onChange={(v) =>
                togglePart(pruneParts, v as (typeof PRUNE_PARTS)[number], setPruneParts)
              }
              multi
              testID="e2e_work_log_prune_parts"
            />
            <LabeledSegmented
              label={t('workLogPruneAmount')}
              items={PRUNE_AMOUNTS.map((v) => ({
                v,
                l: t(`workLogPruneAmount_${v}` as TranslationKey),
              }))}
              value={pruneAmount}
              onChange={(v) => setPruneAmount(v as (typeof PRUNE_AMOUNTS)[number])}
              testID="e2e_work_log_prune_amount"
            />
          </>
        )}

        {/* Sess17 PR-F3: leaf_first_aid + moss_care 内部 Field → LabeledSegmented 移行。 */}
        {selectedType === 'leaf_first_aid' && (
          <>
            <LabeledSegmented
              label={t('workLogLeafAidSymptom')}
              items={LEAF_AID_SYMPTOMS.map((v) => ({
                v,
                l: t(`workLogLeafAidSymptom_${v}` as TranslationKey),
              }))}
              value={leafAidSymptom}
              onChange={(v) => setLeafAidSymptom(v as (typeof LEAF_AID_SYMPTOMS)[number])}
              testID="e2e_work_log_leaf_aid_symptom"
            />
            <View style={styles.field}>
              <LabeledTextInput
                label={t('workLogLeafAidTreatment')}
                optional
                optionalText={t('workLogOptional')}
                value={leafAidTreatment}
                onChangeText={setLeafAidTreatment}
                placeholder={t('workLogLeafAidTreatmentPlaceholder')}
                maxLength={200}
                testID="e2e_work_log_leaf_aid_treatment"
              />
            </View>
          </>
        )}

        {selectedType === 'moss_care' && (
          <LabeledSegmented
            label={t('workLogMossAction')}
            items={MOSS_ACTIONS.map((v) => ({
              v,
              l: t(`workLogMossAction_${v}` as TranslationKey),
            }))}
            value={mossAction}
            onChange={(v) => setMossAction(v as (typeof MOSS_ACTIONS)[number])}
            testID="e2e_work_log_moss_action"
          />
        )}

        {selectedType === 'position_change' && (
          <View style={styles.field}>
            <LabeledTextInput
              label={t('workLogPositionTo')}
              optional
              optionalText={t('workLogOptional')}
              value={positionTo}
              onChangeText={setPositionTo}
              placeholder={t('workLogPositionToPlaceholder')}
              maxLength={100}
              testID="e2e_work_log_position_to"
            />
          </View>
        )}

        {/* Sess17 PR-F3: leaf_trimming family 4 種別 → LabeledSegmented 移行。 */}
        {(selectedType === 'leaf_trimming' ||
          selectedType === 'defoliation' ||
          selectedType === 'deshoot' ||
          selectedType === 'candle_cut') && (
          <>
            <LabeledSegmented
              label={t('workLogTrimRange')}
              items={TRIM_RANGES.map((v) => ({
                v,
                l: t(`workLogTrimRange_${v}` as TranslationKey),
              }))}
              value={trimRange}
              onChange={(v) => setTrimRange(v as (typeof TRIM_RANGES)[number])}
              testID="e2e_work_log_trim_range"
            />
            {selectedType === 'candle_cut' && (
              <View style={styles.field}>
                <LabeledNumberInput
                  label={t('workLogCandleCount')}
                  optional
                  optionalText={t('workLogOptional')}
                  value={candleCount}
                  onChangeText={setCandleCount}
                  placeholder={t('workLogCandleCountPlaceholder')}
                  suffix={t('workLogCandleCountUnit')}
                  testID="e2e_work_log_candle_count"
                />
              </View>
            )}
          </>
        )}

        {selectedType === 'pest_control' && (
          <>
            <LabeledSegmented
              label={t('workLogPestPurpose')}
              items={PEST_PURPOSES.map((v) => ({
                v,
                l: t(`workLogPestPurpose_${v}` as TranslationKey),
              }))}
              value={pestPurpose}
              onChange={(v) => setPestPurpose(v as (typeof PEST_PURPOSES)[number])}
              testID="e2e_work_log_pest_purpose"
            />
            <View style={styles.field}>
              <LabeledTextInput
                label={t('workLogPestAgent')}
                optional
                optionalText={t('workLogOptional')}
                value={pestAgent}
                onChangeText={setPestAgent}
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
                value={pestDilution}
                onChangeText={setPestDilution}
                placeholder={t('workLogPestDilutionPlaceholder')}
                suffix={t('workLogPestDilutionUnit')}
                testID="e2e_work_log_pest_dilution"
              />
            </View>
          </>
        )}

        {selectedType === 'fertilizing' && (
          <>
            <LabeledSegmented
              label={t('workLogFertKind')}
              items={FERT_KINDS.map((v) => ({
                v,
                l: t(`workLogFertKind_${v}` as TranslationKey),
              }))}
              value={fertKind}
              onChange={(v) => setFertKind(v as (typeof FERT_KINDS)[number])}
              testID="e2e_work_log_fert_kind"
            />
            <View style={styles.field}>
              <LabeledTextInput
                label={t('workLogFertProduct')}
                optional
                optionalText={t('workLogOptional')}
                value={fertProduct}
                onChangeText={setFertProduct}
                placeholder={t('workLogFertProductPlaceholder')}
                maxLength={100}
                testID="e2e_work_log_fert_product"
              />
            </View>
          </>
        )}

        {/* Sess17 PR-F2: repotting 鉢サイズに単位切替 (LabeledNumberInputUnit) + 根の整理 (LabeledSegmented)。 */}
        {selectedType === 'repotting' && (
          <>
            <LabeledNumberInputUnit
              label={t('workLogRepotPotSize')}
              value={repotPotSize}
              unit={repotPotSizeUnit}
              onChangeValue={setRepotPotSize}
              onChangeUnit={setRepotPotSizeUnit}
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
                value={repotSoilMix}
                onChangeText={setRepotSoilMix}
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
              value={repotRootAmount}
              onChange={(v) => setRepotRootAmount(v as (typeof REPOT_ROOT_AMOUNTS)[number])}
              testID="e2e_work_log_repot_root_amount"
            />
          </>
        )}

        {/* Sess17 PR-F2: unwiring → LabeledSegmented (内部 Field/Segmented 廃止)。 */}
        {selectedType === 'unwiring' && (
          <LabeledSegmented
            label={t('workLogUnwireParts')}
            items={UNWIRE_PARTS.map((v) => ({
              v,
              l: t(`workLogUnwirePart_${v}` as TranslationKey),
            }))}
            value={unwireParts}
            onChange={(v) => setUnwireParts(v as (typeof UNWIRE_PARTS)[number])}
            testID="e2e_work_log_unwire_parts"
          />
        )}

        {/* Sess17 PR-F2: wiring 番手を LabeledNumberSegmentOrFree (hybrid) で free input 対応。 */}
        {selectedType === 'wiring' && (
          <>
            <LabeledNumberSegmentOrFree
              label={t('workLogWireGauge')}
              segments={WIRE_GAUGES.map((v) => ({ value: v, label: v }))}
              value={wireGauge}
              onChangeValue={setWireGauge}
              freeUnit="mm"
              testID="e2e_work_log_wire_gauge"
            />
            <LabeledSegmented
              label={t('workLogWireParts')}
              items={WIRE_PARTS.map((v) => ({
                v,
                l: t(`workLogWirePart_${v}` as TranslationKey),
              }))}
              value={wireParts}
              onChange={(v) => setWireParts(v as (typeof WIRE_PARTS)[number])}
              testID="e2e_work_log_wire_parts"
            />
            {/* 期間 segment → 外し予定日 date (Sess16 PR-A5 維持)。 */}
            {/* Sess16 PR-A5: 期間 segment → 外し予定日 date (LabeledDateRow、 mockup 整合)。
                maxToday=false で未来日 OK (外し予定なので)、 payload.scheduled_unwire_at に格納。 */}
            <View style={styles.field}>
              <LabeledDateRow
                label={t('workLogWireUnwireDate')}
                optional
                optionalText={t('workLogOptional')}
                value={wireUnwireDate}
                onChangeText={setWireUnwireDate}
                placeholder={t('workLogWireUnwireDatePlaceholder')}
                maxToday={false}
                testID="e2e_work_log_wire_unwire_date"
                testIDClear="e2e_work_log_wire_unwire_date_clear"
              />
            </View>
          </>
        )}

        {/* Sess17 PR-F3: 内部 Field + TextInput inline → LabeledTextInput atom 移行
            (ADR-0029 D1、 全 form typography 統一達成)。 */}
        <View style={styles.field}>
          <LabeledTextInput
            label={t('workLogNote')}
            optional
            optionalText={t('workLogOptional')}
            value={note}
            onChangeText={(v) => setNote(v.slice(0, 2000))}
            placeholder={t('workLogNotePlaceholder')}
            maxLength={2000}
            showCounter
            multiline
            testID="e2e_work_log_note"
          />
        </View>

        {/* Sess16 PR-A3: 写真添付 (mockup 14 種別共通、 最大 10 枚)。 */}
        <View style={styles.field}>
          <PhotoField
            label={t('workLogPhotoField')}
            optional
            optionalText={t('workLogOptional')}
            photos={photos}
            onChange={setPhotos}
            testID="e2e_work_log_photo_field"
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('workLogSaveCta')}
          style={styles.saveBtn}
          onPress={handleSubmit}
          testID="e2e_work_log_save"
        >
          <ThemedText style={styles.saveText}>{t('workLogSaveCta')}</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

// Sess17 PR-F3: 内部 Field / Segmented component を全廃 (ADR-0029 D1 完了)。
// 14 種別すべて Labeled* atom (LabeledSegmented / LabeledNumberInputUnit /
// LabeledNumberSegmentOrFree / LabeledTextInput / LabeledNumberInput / LabeledDateRow /
// PhotoField) に統一、 typography drift ゼロ達成。

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_PRIMARY },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 96 },
  header: { paddingTop: 8, paddingBottom: 16, alignItems: 'center', gap: 4 },
  title: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 20,
    color: TEXT_PRIMARY,
    letterSpacing: 0.4,
  },
  subject: { fontSize: 13, color: TEXT_SECONDARY },
  field: { marginBottom: 18 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 34,
    backgroundColor: BG_PRIMARY,
    borderTopWidth: 1,
    borderTopColor: BORDER_DEFAULT,
  },
  saveBtn: {
    height: 56,
    borderRadius: 12,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: ON_BRAND, fontSize: 17, fontWeight: '500', letterSpacing: 0.4 },
});
