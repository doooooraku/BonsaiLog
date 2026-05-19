/**
 * 一括 (予定追加 / 記録) 作業選択 画面 (Phase G3a、ADR-0024 Accepted)。
 *
 * 旧 `BulkWorkPickerSheet.tsx` (`@gorhom/bottom-sheet` snap 78%) を画面化、
 * `(modals)/bulk-work-picker` route で `presentation: 'formSheet'` 配下に配置。
 *
 * Query params:
 * - mode: 'schedule' | 'log' (i18n + 後続 step 分岐)
 * - date: YYYY-MM-DD (schedule mode のみ、 PlanScreen 選択日)
 *
 * 選択盆栽は `usePickerStore.bulkContext.selectedBonsais` から取得 (URL params 過大化回避)。
 *
 * Sess12 PR-B+C で DB 書き込み配線 (旧 setBulkWorkPickerResult + router.back は consumer 0 件 dead code):
 * - schedule: bulkScheduleEvents 直接呼び出し → Toast → router.dismissAll
 * - log: router.push('/bulk-log-confirm?type=...') で次の note 入力画面に遷移
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
import type { EventType } from '@/src/db/schema';
import { WorkTypeIcon } from '@/src/features/event/WorkTypeIcon';
import { usePickerStore } from '@/src/stores/pickerStore';

const BULK_WORK_TYPES: readonly EventType[] = [
  'watering',
  'pruning',
  'wiring',
  'unwiring',
  'repotting',
  'fertilizing',
  'pest_control',
  'leaf_trimming',
  'defoliation',
  'deshoot',
  'moss_care',
  'position_change',
];

export default function BulkWorkPickerScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ mode?: 'schedule' | 'log'; date?: string }>();
  const mode: 'schedule' | 'log' = params.mode === 'log' ? 'log' : 'schedule';
  const scheduleDate = params.date ?? '';

  const selectedBonsais = usePickerStore((s) => s.bulkContext?.selectedBonsais ?? []);
  const items = BULK_WORK_TYPES;

  const subKey: TranslationKey = mode === 'log' ? 'bulkPickerSheetSubLog' : 'bulkPickerSheetSub';

  const handleSelect = async (type: EventType) => {
    if (mode === 'schedule') {
      // schedule: DB 直接書き込み + Toast + 元タブに戻る
      // ADR-0008 §TZ 3 層防御: new Date() 引数なし禁止、 nowUtc() 経由
      const dateStr = scheduleDate || (nowUtc() as string).slice(0, 10);
      const occurredAtUtc = `${dateStr}T00:00:00.000Z`;
      try {
        const result = await bulkScheduleEvents({
          bonsaiIds: selectedBonsais.map((b) => b.id),
          type,
          occurredAtUtc,
        });
        useToastStore
          .getState()
          .show(t('bulkScheduleDoneToast').replace('{count}', String(result.created.length)));
      } catch (error) {
        console.warn('[bulk-schedule] failed:', error);
      }
      // Sess12 PR-F 改善 I: dismissAll は nested modal で内側のみ閉じる bug あり、
      // canDismiss loop で modal stack 全階層を確実に閉じて元タブに戻す
      while (router.canDismiss()) {
        router.dismiss();
      }
      return;
    }
    // log: 次画面 (BulkLogConfirm) で note 入力 + 書き込み
    router.push(`/bulk-log-confirm?type=${type}` as Href);
  };

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
          {items.map((type) => (
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
  body: { padding: 16, paddingBottom: 34, gap: 16 },
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
