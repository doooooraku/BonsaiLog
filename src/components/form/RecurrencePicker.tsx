/**
 * RecurrencePicker — 定期予定の繰り返しパターン選択 component (Sess78 PR-4、 ADR-0056 D4)。
 *
 * Apple Reminders 風 preset + 終了日 3 択 (default = 永続)。
 * 予定追加画面 (BulkLogConfirmScreen schedule mode) で `enabled=true` 時のみ表示。
 *
 * 設計:
 * - controlled component (props で state を受け取り、 変更時に onChange 通知)
 * - ADR-0011 哲学厳守: 文言は中立表現のみ、 「べき」「お忘れなく」 NG
 * - dark mode: c.tint / c.tintSubtle / c.text scheme-aware token のみ使用
 *
 * Pro 境界 (ADR-0049 ⑦ / ADR-0056 D7) は caller (BulkLogConfirmScreen) で 制御、
 * 本 component は表示と値変更のみ責務。
 *
 * Sess89 PR-A (UI 矛盾解消 6 件):
 * - 🔁 emoji 削除 / FREQ=... デバッグ表示削除 / hideToggle prop / hideEndDate prop
 *
 * Sess89 PR-B (preset 入れ替え + カスタム周期):
 * - PRESET_ORDER 7 個 + custom に再構成 (= daily / weekly / monthly / every3Months /
 *   every6Months / yearly / custom)。 削除 = weeklyMonday / biweekly (= 旧 rule は
 *   rruleToHumanLabel で fallback)。
 * - RecurrenceValue に `customDays: number | null` 追加 (= preset === 'custom' 時のみ使用)。
 * - 'custom' 選択時に数値入力 UI 展開 (= 1-365 範囲、 default 7、 「{n} 日ごと」)。
 *
 * Sess93 PR-3 (モックアップ統合改修):
 * - 7 preset + WeekdaySelector を 枠囲み card で 1 つに統合 (= モック「繰り返し card」 整合)
 * - RecurrenceValue に `byday: readonly number[]` 追加 (= 'weekly' preset 時のみ使用)
 * - RecurrenceValue に `startDate: string` 追加 (= YYYY-MM-DD、 過去日エラー)
 * - 'custom' を ステッパー (− N +) に変更 (= 業界整合 Apple Reminders)
 * - 「毎週」 + 全 7 曜日選択 → 自動で 'daily' に切替 + Toast (= user 操作の整合性保証)
 * - 開始日 picker 追加 (= モック「初回の予定日」 整合)、 過去日 = 不可 エラー
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { InlineDateRow } from '@/src/components/form/InlineDateRow';
import { LabeledDateRow } from '@/src/components/form/LabeledDateRow';
import { WeekdaySelector } from '@/src/components/form/WeekdaySelector';
import { useToastStore } from '@/src/components/Toast';
import { getTzOffsetMin, nowUtc, toLocalDateKey } from '@/src/core/datetime';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
import { type RecurrencePresetKey } from '@/src/core/recurrence/rrule';
import { useColors } from '@/src/core/theme/useColors';

export type RecurrenceEndType = 'oneYear' | 'specific' | 'never';

export type RecurrenceValue = {
  enabled: boolean;
  preset: RecurrencePresetKey;
  /**
   * Sess89 PR-B: カスタム周期の日数 (= preset === 'custom' 時のみ使用)。
   * 1-365 範囲、 null は preset が custom 以外 or 未入力。
   * 保存時 caller で `buildCustomRrule(customDays)` で RRULE 生成。
   */
  customDays: number | null;
  /**
   * Sess93 PR-3: 「毎週」 時の曜日番号配列 (= 0=Sun 〜 6=Sat、 preset='weekly' 時のみ使用)。
   * - [] (空配列) = 通常 weekly (= 開始日基準、 FREQ=WEEKLY)
   * - [1, 3, 5] = 月水金 (= FREQ=WEEKLY;BYDAY=MO,WE,FR)
   * - [0, 1, 2, 3, 4, 5, 6] (全 7 曜日) = 自動で preset='daily' に切替 (= UI で内部処理)
   * 保存時 caller で `buildWeeklyByDayRrule(byday)` で RRULE 生成。
   */
  byday: readonly number[];
  /**
   * Sess93 PR-3: 初回予定日 (= YYYY-MM-DD、 必須)。
   * - 空文字列 = caller が default (= 今日のローカル日付) を設定する責任
   * - 過去日付 = 不可 (UI でエラー inline 表示、 caller は `isStartDateInPast(value)` で 保存ブロック)
   */
  startDate: string;
  endType: RecurrenceEndType;
  endDate: string | null; // YYYY-MM-DD、 endType='specific' 時のみ使用
};

export const DEFAULT_RECURRENCE_VALUE: RecurrenceValue = {
  enabled: false,
  preset: 'weekly',
  customDays: null,
  byday: [],
  startDate: '', // caller が今日の日付を設定 (= 過去日エラー回避)
  endType: 'never',
  endDate: null,
};

type Props = {
  value: RecurrenceValue;
  onChange: (next: RecurrenceValue) => void;
  /** disabled 時は visual に grayout + tap 無効化 (Pro 境界 Paywall trigger は caller 責務) */
  disabled?: boolean;
  /**
   * Sess89 PR-A: 「繰り返し ON/OFF」 toggle UI を非表示にする (= 設定部分は常時展開)。
   */
  hideToggle?: boolean;
  /**
   * Sess89 PR-A: 「終了日」 選択 UI を非表示にする (= 内部 endAtUtc=null 固定)。
   */
  hideEndDate?: boolean;
  /**
   * Sess93 PR-3: 開始日 picker を非表示にする (= 既存 BulkLogConfirmScreen 等、 開始日が 別 UI で 管理される caller 用)。
   */
  hideStartDate?: boolean;
};

// Sess89 PR-B: 7 preset + custom (= 旧 6 から weeklyMonday/biweekly 削除、 every6Months/yearly/custom 追加)
const PRESET_ORDER: readonly { key: RecurrencePresetKey; labelKey: TranslationKey }[] = [
  { key: 'daily', labelKey: 'recurringPresetDaily' },
  { key: 'weekly', labelKey: 'recurringPresetWeekly' },
  { key: 'monthly', labelKey: 'recurringPresetMonthly' },
  { key: 'every3Months', labelKey: 'recurringPresetEvery3Months' },
  { key: 'every6Months', labelKey: 'recurringPresetEvery6Months' },
  { key: 'yearly', labelKey: 'recurringPresetYearly' },
  { key: 'custom', labelKey: 'recurringPresetCustom' },
];

const END_TYPE_ORDER: readonly { key: RecurrenceEndType; labelKey: TranslationKey }[] = [
  { key: 'oneYear', labelKey: 'recurringEndDateOneYear' },
  { key: 'specific', labelKey: 'recurringEndDateSpecific' },
  { key: 'never', labelKey: 'recurringEndDateNever' },
];

// Sess89 PR-B: カスタム周期の default 日数 (= 1-365 範囲、 7 = 1 週間 = 業界 default 整合)
const CUSTOM_DAYS_DEFAULT = 7;
const CUSTOM_DAYS_MIN = 1;
const CUSTOM_DAYS_MAX = 365;

/**
 * Sess93 PR-3: 開始日が過去日 (= ローカルで 今日より前) かを判定する helper (= caller の保存ブロック用)。
 * 空文字列 startDate は「未設定」 扱いで false (= caller が default 設定の責任)。
 */
export function isStartDateInPast(value: RecurrenceValue): boolean {
  if (!value.startDate) return false;
  const todayKey = toLocalDateKey(nowUtc(), getTzOffsetMin());
  return value.startDate < todayKey;
}

export function RecurrencePicker({
  value,
  onChange,
  disabled = false,
  hideToggle = false,
  hideEndDate = false,
  hideStartDate = false,
}: Props) {
  const { t } = useTranslation();
  const c = useColors();

  const handleToggle = React.useCallback(() => {
    if (disabled) return;
    onChange({ ...value, enabled: !value.enabled });
  }, [value, onChange, disabled]);

  const handlePresetSelect = React.useCallback(
    (preset: RecurrencePresetKey) => {
      if (disabled) return;
      const nextCustomDays = preset === 'custom' ? (value.customDays ?? CUSTOM_DAYS_DEFAULT) : null;
      // preset 変更時 byday はクリア (= 'weekly' 以外は意味なし)
      const nextByday = preset === 'weekly' ? value.byday : [];
      onChange({ ...value, preset, customDays: nextCustomDays, byday: nextByday });
    },
    [value, onChange, disabled],
  );

  const handleBydayChange = React.useCallback(
    (nextByday: number[]) => {
      if (disabled) return;
      // Sess93 PR-3: 全 7 曜日選択時、 自動で preset='daily' に切替 + Toast (= UI 整合性、 検討漏れ D 案 B 採用)
      if (nextByday.length === 7) {
        onChange({ ...value, preset: 'daily', byday: [], customDays: null });
        useToastStore.getState().show(t('recurringWeeklyAllDaysToDailyToast'));
        return;
      }
      onChange({ ...value, byday: nextByday });
    },
    [value, onChange, disabled, t],
  );

  const handleCustomStep = React.useCallback(
    (delta: number) => {
      if (disabled) return;
      const current = value.customDays ?? CUSTOM_DAYS_DEFAULT;
      const next = Math.min(Math.max(current + delta, CUSTOM_DAYS_MIN), CUSTOM_DAYS_MAX);
      onChange({ ...value, customDays: next });
    },
    [value, onChange, disabled],
  );

  const handleStartDateChange = React.useCallback(
    (startDate: string) => {
      if (disabled) return;
      onChange({ ...value, startDate });
    },
    [value, onChange, disabled],
  );

  const handleEndTypeSelect = React.useCallback(
    (endType: RecurrenceEndType) => {
      if (disabled) return;
      onChange({ ...value, endType, endDate: endType === 'specific' ? value.endDate : null });
    },
    [value, onChange, disabled],
  );

  const handleEndDateChange = React.useCallback(
    (endDate: string) => {
      if (disabled) return;
      onChange({ ...value, endDate });
    },
    [value, onChange, disabled],
  );

  // Sess89 PR-A: hideToggle 時は toggle 部分非表示、 設定部分常時展開
  const showExpanded = hideToggle || value.enabled;
  const isWeekly = value.preset === 'weekly';
  const isCustom = value.preset === 'custom';
  const customDays = value.customDays ?? CUSTOM_DAYS_DEFAULT;
  const startDateInPast = isStartDateInPast(value);

  return (
    <View style={styles.container}>
      {!hideToggle ? (
        <Pressable
          onPress={handleToggle}
          style={({ pressed }) => [
            styles.toggleRow,
            {
              backgroundColor: value.enabled ? c.tintSubtle : c.surface,
              borderColor: value.enabled ? c.tint : c.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          accessibilityRole="switch"
          accessibilityState={{ checked: value.enabled, disabled }}
          accessibilityLabel={t('recurringPickerToggle')}
          disabled={disabled}
          testID="e2e_recurrence_picker_toggle"
        >
          <ThemedText style={[styles.toggleLabel, { color: c.text }]}>
            {t('recurringPickerToggle')}
          </ThemedText>
          <ThemedText style={[styles.toggleState, { color: value.enabled ? c.tint : c.textMuted }]}>
            {value.enabled ? 'ON' : 'OFF'}
          </ThemedText>
        </Pressable>
      ) : null}

      {showExpanded ? (
        <View style={styles.expandedContent}>
          {/* Sess93 PR-3: 「繰り返し」 セクションラベル + preset + WeekdaySelector を 枠囲み card にまとめる (= モック整合) */}
          <ThemedText style={[styles.sectionLabel, { color: c.text }]}>
            {t('recurringPickerToggle')}
          </ThemedText>
          <View
            style={[styles.presetCard, { backgroundColor: c.surface, borderColor: c.border }]}
            testID="e2e_recurrence_picker_preset_card"
          >
            <View style={styles.presetGroup}>
              {PRESET_ORDER.map((preset) => {
                const isSelected = value.preset === preset.key;
                return (
                  <Pressable
                    key={preset.key}
                    onPress={() => handlePresetSelect(preset.key)}
                    style={({ pressed }) => [
                      styles.presetChip,
                      {
                        backgroundColor: isSelected ? c.tint : c.background,
                        borderColor: isSelected ? c.tint : c.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected, disabled }}
                    disabled={disabled}
                    testID={`e2e_recurrence_picker_preset_${preset.key}`}
                  >
                    <ThemedText
                      style={[styles.presetLabel, { color: isSelected ? c.onTint : c.text }]}
                    >
                      {t(preset.labelKey)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {/* Sess93 PR-3: preset='weekly' 時のみ 区切り線 + WeekdaySelector を card 内に表示 (= モック「くり返す曜日」) */}
            {isWeekly ? (
              <>
                <View style={[styles.divider, { backgroundColor: c.border }]} />
                <ThemedText style={[styles.weeklyByDayLabel, { color: c.textSecondary }]}>
                  {t('recurringWeeklyByDayLabel')}
                </ThemedText>
                <WeekdaySelector
                  value={value.byday}
                  onChange={handleBydayChange}
                  disabled={disabled}
                  testIdPrefix="e2e_recurrence_picker_byday"
                />
              </>
            ) : null}

            {/* Sess93 PR-3: 'custom' 選択時のみ ステッパー (= − N +) UI 展開 (= モック整合) */}
            {isCustom ? (
              <>
                <View style={[styles.divider, { backgroundColor: c.border }]} />
                <View style={styles.customStepperRow}>
                  <Pressable
                    onPress={() => handleCustomStep(-1)}
                    disabled={disabled || customDays <= CUSTOM_DAYS_MIN}
                    style={({ pressed }) => [
                      styles.stepperButton,
                      {
                        backgroundColor: c.background,
                        borderColor: c.border,
                        opacity: pressed || disabled || customDays <= CUSTOM_DAYS_MIN ? 0.4 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="−"
                    testID="e2e_recurrence_picker_custom_decrement"
                  >
                    <ThemedText style={[styles.stepperSymbol, { color: c.text }]}>−</ThemedText>
                  </Pressable>
                  <View style={[styles.stepperValue, { borderColor: c.border }]}>
                    <ThemedText
                      style={[styles.stepperValueText, { color: c.text }]}
                      testID="e2e_recurrence_picker_custom_days_value"
                    >
                      {customDays}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => handleCustomStep(1)}
                    disabled={disabled || customDays >= CUSTOM_DAYS_MAX}
                    style={({ pressed }) => [
                      styles.stepperButton,
                      {
                        backgroundColor: c.background,
                        borderColor: c.border,
                        opacity: pressed || disabled || customDays >= CUSTOM_DAYS_MAX ? 0.4 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="+"
                    testID="e2e_recurrence_picker_custom_increment"
                  >
                    <ThemedText style={[styles.stepperSymbol, { color: c.text }]}>+</ThemedText>
                  </Pressable>
                  <ThemedText
                    style={[styles.customStepperSuffix, { color: c.textSecondary }]}
                    numberOfLines={1}
                  >
                    {t('recurringCustomDaysApart')}
                  </ThemedText>
                </View>
              </>
            ) : null}
          </View>

          {/* Sess93 PR-3: 開始日 picker (= モック「初回の予定日」、 過去日エラー inline 表示)
              Sess94 PR-B: LabeledDateRow → InlineDateRow (= 横並び 1 行 + 📅 icon + 文化整合日付) */}
          {!hideStartDate ? (
            <>
              <ThemedText style={[styles.sectionLabel, { color: c.text }]}>
                {t('recurringStartDateLabel')}
              </ThemedText>
              <InlineDateRow
                label={t('recurringInitialDateLabel')}
                value={value.startDate}
                onChangeText={handleStartDateChange}
                testID="e2e_recurrence_picker_startdate"
              />
              <ThemedText style={[styles.startDateHint, { color: c.textSecondary }]}>
                {t('recurringStartDateHint')}
              </ThemedText>
              {startDateInPast ? (
                <ThemedText
                  style={[styles.startDateError, { color: c.dangerColor }]}
                  testID="e2e_recurrence_picker_startdate_error"
                >
                  {t('recurringStartDatePastError')}
                </ThemedText>
              ) : null}
            </>
          ) : null}

          {!hideEndDate ? (
            <>
              <View style={styles.endTypeGroup}>
                {END_TYPE_ORDER.map((endType) => {
                  const isSelected = value.endType === endType.key;
                  return (
                    <Pressable
                      key={endType.key}
                      onPress={() => handleEndTypeSelect(endType.key)}
                      style={({ pressed }) => [
                        styles.presetChip,
                        {
                          backgroundColor: isSelected ? c.tintSubtle : c.surface,
                          borderColor: isSelected ? c.tint : c.border,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected, disabled }}
                      disabled={disabled}
                      testID={`e2e_recurrence_picker_endtype_${endType.key}`}
                    >
                      <ThemedText
                        style={[styles.presetLabel, { color: isSelected ? c.tint : c.text }]}
                      >
                        {t(endType.labelKey)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              {value.endType === 'specific' ? (
                <LabeledDateRow
                  label={t('recurringEndDateSpecific')}
                  value={value.endDate ?? ''}
                  onChangeText={handleEndDateChange}
                  testID="e2e_recurrence_picker_enddate"
                />
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  toggleState: {
    fontSize: 14,
    fontWeight: '600',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  // Sess93 PR-3: 7 preset + WeekdaySelector を 1 つの 枠囲み card にまとめる (= モック整合)
  presetCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  divider: {
    height: 1,
  },
  // Sess94 PR-B: 4-3-1 → 3-3-1 grid 配置 (= ClaudeDesign モック整合)。
  //   flexBasis 30% で 3 個 (90%) 入る → 4 個目で wrap → 6 個 (= 2 行) + custom (3 行目 1 個中央)。
  presetGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  endTypeGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  presetChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '30%',
    alignItems: 'center',
  },
  presetLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  weeklyByDayLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Sess93 PR-3: ステッパー (− N +) row (= モック「− 11 + 日ごとに繰り返す」)
  customStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperSymbol: {
    fontSize: 20,
    fontWeight: '500',
  },
  stepperValue: {
    minWidth: 48,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueText: {
    fontSize: 16,
    fontWeight: '600',
  },
  customStepperSuffix: {
    fontSize: 13,
    flexShrink: 1,
    marginLeft: 4,
  },
  startDateHint: {
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
  startDateError: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
});
