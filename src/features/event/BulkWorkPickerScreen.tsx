/**
 * 一括 (予定追加 / 記録) 作業選択 画面 (Phase G3a、 ADR-0024 / ADR-0025、 Sess16 PR-B1 単一作業化)。
 *
 * `presentation: 'modal'` (ADR-0024 Notes Amended 2026-05-15、`(modals)/_layout.tsx` で適用)。
 * Sess16 PR-A1: nav title を mode URL param で動的化 (log/schedule で切替)。
 *
 * Query params:
 * - mode: 'schedule' | 'log' (nav title + 後続 step 分岐)
 * - date: YYYY-MM-DD (schedule mode のみ、 PlanScreen 選択日)
 *
 * 選択盆栽は `usePickerStore.bulkContext.selectedBonsais` から取得 (URL params 過大化回避)。
 *
 * Sess16 PR-B1 で **複数作業対応を削除** (user 真意: 「複数作業記録はあまりない」)。
 * cell tap で即遷移、 緑反転 + 下部 CTA + 「メモを追加」 toggle 全廃。
 *   - schedule mode: bulkScheduleEvents 即書込 → router.replace('/(tabs)/plan')
 *   - log mode: router.push('/bulk-log-confirm?type=<single>') (note + 日付 + 写真 入力画面)
 */
import { router, useLocalSearchParams, type Href } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
// Sess79 PR-6 ADR-0056: schedule mode の bulkScheduleEvents 直接呼出 + 関連 import 群は BulkLogConfirm に移行済。
// useToastStore / getTzOffsetMin / nowUtc / bulkScheduleEvents / maybePromptNotificationOptIn /
// triggerSummaryReschedule / toLocalDateKey は BulkLog 側で使用。
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
// Sess68 PR #C: 全 forbidden token を inline c.* 化。
import { useColors } from '@/src/core/theme/useColors';
import { EVENT_TYPES, type EventType } from '@/src/db/schema';
import { WorkTypeIcon } from '@/src/features/event/WorkTypeIcon';
import { usePickerStore } from '@/src/stores/pickerStore';

// Sess16 PR-J (T-5) + PR-Q: EVENT_TYPES 全 14 種別を直接使用 (filter なし)。
// user 真意「どんな盆栽でも全種別表示」 シンプル化 (Sess16 PR-Q、 2026-05-20)。
const BULK_WORK_TYPES: readonly EventType[] = EVENT_TYPES;

export default function BulkWorkPickerScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const params = useLocalSearchParams<{ mode?: 'schedule' | 'log'; date?: string }>();
  const mode: 'schedule' | 'log' = params.mode === 'log' ? 'log' : 'schedule';
  const scheduleDate = params.date ?? '';

  const selectedBonsais = usePickerStore((s) => s.bulkContext?.selectedBonsais ?? []);

  // Sess79 PR-6 ADR-0056: schedule mode が BulkLog 経由 push 統一化で 重複 tap 防止 state 不要に
  // (= push 直後の navigation 中に再 tap は React Navigation で 二重 push 抑制される)。
  const isSubmitting = false;

  const subKey: TranslationKey = mode === 'log' ? 'bulkPickerSheetSubLog' : 'bulkPickerSheetSub';

  // Sess16 PR-B1: cell tap で即遷移 (複数作業対応削除、 user 真意「単一作業のみ」)。
  const handleSelect = React.useCallback(
    async (type: EventType) => {
      if (isSubmitting) return;
      const bonsaiIds = selectedBonsais.map((b) => b.id);

      // Sess79 PR-6 ADR-0056: schedule mode も log mode と同じく BulkLogConfirm 経由に統一。
      // 旧 1 タップ動線 (bulkScheduleEvents 直接) は 退化、 引き換えに recurring (定期予定) 対応 +
      // RecurrencePicker UI 提供。 v1.0.2 で 「1 タップ schedule 復活 + 🔁 toggle 追加」 検討候補。
      // bonsaiIds は handleSelect 関数 args の参照のみ。 schedule/log 統一 push で BulkLog 側で 処理。
      void bonsaiIds; // unused 警告回避 (= 既存 schedule mode 内で使われていた)
      const dateParam = scheduleDate ? `&date=${encodeURIComponent(scheduleDate)}` : '';
      router.push(`/bulk-log-confirm?type=${type}&mode=${mode}${dateParam}` as Href);
    },
    [isSubmitting, mode, scheduleDate],
  );

  return (
    <View
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_bulk_work_picker_screen"
    >
      <View style={styles.header}>
        <ThemedText style={[styles.sub, { color: c.text }]}>
          {t(subKey).replace('{count}', String(selectedBonsais.length))}
        </ThemedText>
      </View>
      <View style={[styles.chipsRow, { borderBottomColor: c.border }]}>
        {selectedBonsais.map((b) => (
          <View
            key={b.id}
            style={[styles.chip, { backgroundColor: c.surface, borderColor: c.border }]}
          >
            <ThemedText style={[styles.chipText, { color: c.text }]} numberOfLines={1}>
              {b.name}
            </ThemedText>
          </View>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.grid}>
          {BULK_WORK_TYPES.map((type) => (
            <Pressable
              key={type}
              accessibilityRole="button"
              accessibilityLabel={t(`eventType_${type}` as TranslationKey)}
              style={[styles.cell, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => handleSelect(type)}
              testID={`e2e_bulk_work_picker_${type}`}
            >
              <WorkTypeIcon type={type} size={32} color={c.text} />
              <ThemedText style={[styles.label, { color: c.text }]}>
                {t(`eventType_${type}` as TranslationKey)}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 8, paddingBottom: 8, alignItems: 'center' },
  sub: { fontSize: 14 },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
  },
  chip: {
    // Sess18 PR-11: design_system §4 (spacing 8/12) + §5 (borderRadius 16) 整合。
    // BulkLogConfirm の chip と完全 1:1 統一 (両画面で同じデータの 2 つ画面表示の整合)。
    paddingVertical: 4,
    paddingHorizontal: 12, // 旧 10 → 12 (spacing token 整合)
    borderRadius: 16, // 旧 18 → 16 (design_system §5 カード用途)
    borderWidth: 1,
    minWidth: 80, // BulkLogConfirm と統一
    maxWidth: 140,
    alignItems: 'center', // text 中央揃え
    justifyContent: 'center',
  },
  chipText: { fontSize: 12, fontWeight: '500', flexShrink: 1 },
  body: { padding: 16, paddingBottom: 16, gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 8,
  },
  label: { fontSize: 13, textAlign: 'center' },
});
