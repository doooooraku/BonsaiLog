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
import { useToastStore } from '@/src/components/Toast';
import { nowUtc } from '@/src/core/datetime';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
import { BG_PRIMARY, BG_SURFACE, BORDER_DEFAULT, TEXT_PRIMARY } from '@/src/core/theme/colors';
import { bulkScheduleEvents } from '@/src/db/eventRepository';
import { EVENT_TYPES, type EventType } from '@/src/db/schema';
import { triggerSummaryReschedule } from '@/src/features/notification/triggerReschedule';
import { WorkTypeIcon } from '@/src/features/event/WorkTypeIcon';
import { usePickerStore } from '@/src/stores/pickerStore';

// Sess16 PR-J (T-5): EVENT_TYPES から動的生成 (旧 BULK_WORK_TYPES 手動 list 廃止)。
// bulk path では bonsai が松か否か事前判定不能のため candle_cut を除外
// (mockup mockup v1.0 02-Home.html の bulk picker 描画と整合)。
const BULK_EXCLUDED: ReadonlySet<EventType> = new Set(['candle_cut']);
const BULK_WORK_TYPES: readonly EventType[] = EVENT_TYPES.filter((t) => !BULK_EXCLUDED.has(t));

export default function BulkWorkPickerScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ mode?: 'schedule' | 'log'; date?: string }>();
  const mode: 'schedule' | 'log' = params.mode === 'log' ? 'log' : 'schedule';
  const scheduleDate = params.date ?? '';

  const selectedBonsais = usePickerStore((s) => s.bulkContext?.selectedBonsais ?? []);

  // Sess16 PR-B1: 重複 tap 防止 (schedule 即書込 path のみで使用)。
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const subKey: TranslationKey = mode === 'log' ? 'bulkPickerSheetSubLog' : 'bulkPickerSheetSub';

  // Sess16 PR-B1: cell tap で即遷移 (複数作業対応削除、 user 真意「単一作業のみ」)。
  const handleSelect = React.useCallback(
    async (type: EventType) => {
      if (isSubmitting) return;
      const bonsaiIds = selectedBonsais.map((b) => b.id);

      if (mode === 'schedule') {
        setIsSubmitting(true);
        // ADR-0008 §TZ 3 層防御: new Date() 引数なし禁止、 nowUtc() 経由
        const dateStr = scheduleDate || (nowUtc() as string).slice(0, 10);
        const occurredAtUtc = `${dateStr}T00:00:00.000Z`;
        try {
          await bulkScheduleEvents({ bonsaiIds, type, occurredAtUtc });
          useToastStore.getState().show(t('bulkScheduleDoneToast').replace('{count}', '1'));
        } catch (error) {
          console.warn('[bulk-schedule] failed:', error);
        }
        // Sess12 PR-I: 通知 reschedule (planned events 変化 → 当日まとめ通知再予約)
        void triggerSummaryReschedule(t);
        // Sess12 PR-G 改善 I: dismissAll は 1 階のみ閉じる仕様、 router.replace で予定タブに直接遷移
        router.replace('/(tabs)/plan' as Href);
        return;
      }

      // log mode: BulkLogConfirm に push (note + 日付 + 写真 入力画面)
      router.push(`/bulk-log-confirm?type=${type}` as Href);
    },
    [isSubmitting, mode, scheduleDate, selectedBonsais, t],
  );

  return (
    <View style={styles.container} testID="e2e_bulk_work_picker_screen">
      <View style={styles.header}>
        <ThemedText style={styles.sub}>
          {t(subKey).replace('{count}', String(selectedBonsais.length))}
        </ThemedText>
      </View>
      <View style={styles.chipsRow}>
        {selectedBonsais.map((b) => (
          <View key={b.id} style={styles.chip}>
            <ThemedText style={styles.chipText} numberOfLines={1}>
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
              style={styles.cell}
              onPress={() => handleSelect(type)}
              testID={`e2e_bulk_work_picker_${type}`}
            >
              <WorkTypeIcon type={type} size={32} color={TEXT_PRIMARY} />
              <ThemedText style={styles.label}>
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
  container: { flex: 1, backgroundColor: BG_PRIMARY },
  header: { paddingTop: 8, paddingBottom: 8, alignItems: 'center' },
  sub: { fontSize: 14, color: TEXT_PRIMARY },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
  },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    maxWidth: 140,
  },
  chipText: { fontSize: 12, fontWeight: '500', color: TEXT_PRIMARY, flexShrink: 1 },
  body: { padding: 16, paddingBottom: 16, gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 8,
  },
  label: { fontSize: 13, color: TEXT_PRIMARY, textAlign: 'center' },
});
