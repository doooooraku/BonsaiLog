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
import { PhotoField, type PhotoFieldItem } from '@/src/components/form/PhotoField';
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
const WIRE_GAUGES = ['1mm', '1.5mm', '2mm', '2.5mm', '3mm', '3.5mm'] as const;
const WIRE_PARTS = ['miki', 'eda'] as const;
const WIRE_DURATIONS = ['4w', '8w', '12w', '16w', '20w'] as const;

export default function WorkLogConfirmScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ bonsaiName?: string; type?: EventType }>();
  const bonsaiName = params.bonsaiName ?? '';
  const selectedType = (params.type ?? null) as EventType | null;

  const [note, setNote] = React.useState('');
  // Sess16 PR-A2: 日付選択 (空 = 今日 default、 maxToday=true で未来日防止)。
  const [occurredAtDate, setOccurredAtDate] = React.useState('');
  // Sess16 PR-A3: 写真添付 (form 内 仮 state、 保存時に caller が addPhotoFromUri で永続化)。
  const [photos, setPhotos] = React.useState<readonly PhotoFieldItem[]>([]);
  const [waterAmount, setWaterAmount] = React.useState<(typeof WATER_AMOUNTS)[number]>('normal');
  const [pruneParts, setPruneParts] = React.useState<readonly (typeof PRUNE_PARTS)[number][]>([
    'eda',
  ]);
  const [pruneAmount, setPruneAmount] = React.useState<(typeof PRUNE_AMOUNTS)[number]>('some');
  const [wireGauge, setWireGauge] = React.useState<(typeof WIRE_GAUGES)[number]>('1mm');
  const [wireParts, setWireParts] = React.useState<readonly (typeof WIRE_PARTS)[number][]>(['eda']);
  const [wireDuration, setWireDuration] = React.useState<(typeof WIRE_DURATIONS)[number]>('8w');

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
      payload.gauge = wireGauge;
      payload.parts = [...wireParts];
      payload.duration = wireDuration;
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

        {selectedType === 'watering' && (
          <Field label={t('workLogWaterAmount')}>
            <Segmented
              items={WATER_AMOUNTS.map((v) => ({
                v,
                l: t(`workLogWaterAmount_${v}` as TranslationKey),
              }))}
              value={waterAmount}
              onChange={(v) => setWaterAmount(v as (typeof WATER_AMOUNTS)[number])}
            />
          </Field>
        )}

        {selectedType === 'pruning' && (
          <>
            <Field label={t('workLogPruneParts')}>
              <Segmented
                items={PRUNE_PARTS.map((v) => ({
                  v,
                  l: t(`workLogPrunePart_${v}` as TranslationKey),
                }))}
                value={pruneParts}
                onChange={(v) =>
                  togglePart(pruneParts, v as (typeof PRUNE_PARTS)[number], setPruneParts)
                }
                multi
              />
            </Field>
            <Field label={t('workLogPruneAmount')}>
              <Segmented
                items={PRUNE_AMOUNTS.map((v) => ({
                  v,
                  l: t(`workLogPruneAmount_${v}` as TranslationKey),
                }))}
                value={pruneAmount}
                onChange={(v) => setPruneAmount(v as (typeof PRUNE_AMOUNTS)[number])}
              />
            </Field>
          </>
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
                onChange={(v) =>
                  togglePart(wireParts, v as (typeof WIRE_PARTS)[number], setWireParts)
                }
                multi
              />
            </Field>
            <Field label={t('workLogWireDuration')} hint={t('workLogWireDurationHint')}>
              <Segmented
                items={WIRE_DURATIONS.map((v) => ({ v, l: v }))}
                value={wireDuration}
                onChange={(v) => setWireDuration(v as (typeof WIRE_DURATIONS)[number])}
              />
            </Field>
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
