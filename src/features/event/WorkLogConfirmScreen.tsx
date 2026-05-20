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
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LabeledDateRow } from '@/src/components/form/LabeledDateRow';
import { LabeledNumberInput } from '@/src/components/form/LabeledNumberInput';
import { LabeledSegmented } from '@/src/components/form/LabeledSegmented';
import { LabeledTextInput } from '@/src/components/form/LabeledTextInput';
import { PhotoField, type PhotoFieldItem } from '@/src/components/form/PhotoField';
import { nowUtc } from '@/src/core/datetime';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
import {
  BG_PRIMARY,
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  ON_BRAND,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import type { EventType } from '@/src/db/schema';
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
  const [wireGauge, setWireGauge] = React.useState<(typeof WIRE_GAUGES)[number]>('1mm');
  // Sess16 PR-A5: multi → single + 'all' default
  const [wireParts, setWireParts] = React.useState<(typeof WIRE_PARTS)[number]>('all');
  // Sess16 PR-A5: 期間 segment → 外し予定日 date (LabeledDateRow、 mockup「年/月/日」 整合)。
  const [wireUnwireDate, setWireUnwireDate] = React.useState('');
  // Sess16 PR-D1: unwiring 外した部位 (default 'all'、 single)。
  const [unwireParts, setUnwireParts] = React.useState<(typeof UNWIRE_PARTS)[number]>('all');
  // Sess16 PR-D2: repotting (鉢サイズ + 用土レシピ + 根の整理)。
  const [repotPotSize, setRepotPotSize] = React.useState('');
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
      // Sess16 PR-A5: payload schema 整合 (WiringPayload: wire_size_mm / body_part / scheduled_unwire_at)。
      const gaugeNum = parseFloat(wireGauge.replace('mm', ''));
      if (!Number.isNaN(gaugeNum)) payload.wire_size_mm = gaugeNum;
      payload.body_part = wireParts;
      if (wireUnwireDate) payload.scheduled_unwire_at = `${wireUnwireDate}T00:00:00.000Z`;
    } else if (selectedType === 'unwiring') {
      // Sess16 PR-D1: UnwiringPayload.body_part (mockup 外した部位 整合)。
      payload.body_part = unwireParts;
    } else if (selectedType === 'repotting') {
      // Sess16 PR-D2: RepottingPayload (pot_id / soil_mix + 拡張 pot_size_cm / root_pruning)。
      const sizeNum = parseFloat(repotPotSize);
      if (!Number.isNaN(sizeNum)) payload.pot_size_cm = sizeNum;
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

        {selectedType === 'leaf_first_aid' && (
          <>
            <Field label={t('workLogLeafAidSymptom')}>
              <Segmented
                items={LEAF_AID_SYMPTOMS.map((v) => ({
                  v,
                  l: t(`workLogLeafAidSymptom_${v}` as TranslationKey),
                }))}
                value={leafAidSymptom}
                onChange={(v) => setLeafAidSymptom(v as (typeof LEAF_AID_SYMPTOMS)[number])}
              />
            </Field>
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
          <Field label={t('workLogMossAction')}>
            <Segmented
              items={MOSS_ACTIONS.map((v) => ({
                v,
                l: t(`workLogMossAction_${v}` as TranslationKey),
              }))}
              value={mossAction}
              onChange={(v) => setMossAction(v as (typeof MOSS_ACTIONS)[number])}
            />
          </Field>
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

        {(selectedType === 'leaf_trimming' ||
          selectedType === 'defoliation' ||
          selectedType === 'deshoot' ||
          selectedType === 'candle_cut') && (
          <>
            <Field label={t('workLogTrimRange')}>
              <Segmented
                items={TRIM_RANGES.map((v) => ({
                  v,
                  l: t(`workLogTrimRange_${v}` as TranslationKey),
                }))}
                value={trimRange}
                onChange={(v) => setTrimRange(v as (typeof TRIM_RANGES)[number])}
              />
            </Field>
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

        {selectedType === 'repotting' && (
          <>
            <View style={styles.field}>
              <LabeledNumberInput
                label={t('workLogRepotPotSize')}
                optional
                optionalText={t('workLogOptional')}
                value={repotPotSize}
                onChangeText={setRepotPotSize}
                placeholder={t('workLogRepotPotSizePlaceholder')}
                suffix={t('workLogRepotPotSizeUnit')}
                testID="e2e_work_log_repot_pot_size"
              />
            </View>
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
            <Field label={t('workLogRepotRootAmount')}>
              <Segmented
                items={REPOT_ROOT_AMOUNTS.map((v) => ({
                  v,
                  l: t(`workLogRepotRootAmount_${v}` as TranslationKey),
                }))}
                value={repotRootAmount}
                onChange={(v) => setRepotRootAmount(v as (typeof REPOT_ROOT_AMOUNTS)[number])}
              />
            </Field>
          </>
        )}

        {selectedType === 'unwiring' && (
          <Field label={t('workLogUnwireParts')}>
            <Segmented
              items={UNWIRE_PARTS.map((v) => ({
                v,
                l: t(`workLogUnwirePart_${v}` as TranslationKey),
              }))}
              value={unwireParts}
              onChange={(v) => setUnwireParts(v as (typeof UNWIRE_PARTS)[number])}
            />
          </Field>
        )}

        {selectedType === 'wiring' && (
          <>
            <Field label={t('workLogWireGauge')}>
              <Segmented
                items={WIRE_GAUGES.map((v) => ({ v, l: v }))}
                value={wireGauge}
                onChange={(v) => setWireGauge(v as (typeof WIRE_GAUGES)[number])}
              />
            </Field>
            <Field label={t('workLogWireParts')}>
              <Segmented
                items={WIRE_PARTS.map((v) => ({
                  v,
                  l: t(`workLogWirePart_${v}` as TranslationKey),
                }))}
                value={wireParts}
                onChange={(v) => setWireParts(v as (typeof WIRE_PARTS)[number])}
              />
            </Field>
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

        <Field label={t('workLogNote')} optional>
          <TextInput
            value={note}
            onChangeText={(v) => setNote(v.slice(0, 2000))}
            placeholder={t('workLogNotePlaceholder')}
            placeholderTextColor={TEXT_MUTED}
            multiline
            style={styles.textarea}
          />
          <ThemedText style={styles.charCount}>{note.length} / 2000</ThemedText>
        </Field>

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

function Field({
  label,
  hint,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <ThemedText style={styles.fieldLabel}>
          {label}
          {optional && (
            <ThemedText style={styles.fieldOptional}> {t('workLogOptional')}</ThemedText>
          )}
        </ThemedText>
        {hint && <ThemedText style={styles.fieldHint}>{hint}</ThemedText>}
      </View>
      {children}
    </View>
  );
}

type SegmentedItem = { v: string; l: string };

function Segmented({
  items,
  value,
  onChange,
  multi = false,
}: {
  items: readonly SegmentedItem[];
  value: string | readonly string[];
  onChange: (v: string) => void;
  multi?: boolean;
}) {
  return (
    <View style={styles.segmented}>
      {items.map((it) => {
        const on = multi ? (value as readonly string[]).includes(it.v) : value === it.v;
        return (
          <Pressable
            key={it.v}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={it.l}
            style={[styles.segment, on && styles.segmentOn]}
            onPress={() => onChange(it.v)}
          >
            <ThemedText style={[styles.segmentText, on && styles.segmentTextOn]}>{it.l}</ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

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
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: TEXT_SECONDARY },
  fieldOptional: { color: TEXT_MUTED, fontWeight: '400' },
  fieldHint: { fontFamily: 'Inter_400Regular', fontSize: 11, color: TEXT_MUTED },
  segmented: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  segment: {
    paddingHorizontal: 14,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: { borderColor: BRAND_GREEN, backgroundColor: BRAND_GREEN },
  segmentText: { fontSize: 13, color: TEXT_SECONDARY },
  segmentTextOn: { color: ON_BRAND, fontWeight: '500' },
  textarea: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    backgroundColor: BG_SURFACE,
    padding: 14,
    fontSize: 16,
    color: TEXT_PRIMARY,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: TEXT_MUTED,
    textAlign: 'right',
    marginTop: 4,
  },
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
