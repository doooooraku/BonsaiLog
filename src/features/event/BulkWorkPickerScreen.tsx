/**
 * 一括 (予定追加 / 記録) 作業選択 画面 (Phase G3a、 ADR-0024 / ADR-0025、 Sess12 PR-G 大改修)。
 *
 * Query params:
 * - mode: 'schedule' | 'log' (i18n + 後続 step 分岐)
 * - date: YYYY-MM-DD (schedule mode のみ、 PlanScreen 選択日)
 *
 * 選択盆栽は `usePickerStore.bulkContext.selectedBonsais` から取得 (URL params 過大化回避)。
 *
 * Sess12 PR-G 改善 H + I (mockup 12:00:37 + user 提案):
 * - **複数作業選択**: tap で selectedTypes Set toggle、 緑反転 cell UI (背景 BRAND_GREEN + 白文字)
 * - **下部固定 CTA**: 「予定を追加 (×N)」 (disabled if size===0)
 * - **完了 navigation**: router.replace で目的タブに直接戻る (改善 I、 dismissAll の 1 階問題解消)
 *   - schedule mode → router.replace('/(tabs)/plan')
 *   - log mode (toggle OFF) → bulkLogEvents loop + router.replace('/(tabs)/record')
 *   - log mode (toggle ON) → BulkLogConfirm に push (types[] 渡す) → 作業ごとメモ入力
 * - **書き込み**: types loop で bulkScheduleEvents / bulkLogEvents を Promise.all
 */
import { router, useLocalSearchParams, type Href } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useToastStore } from '@/src/components/Toast';
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
} from '@/src/core/theme/colors';
import { bulkLogEvents, bulkScheduleEvents } from '@/src/db/eventRepository';
import type { EventType } from '@/src/db/schema';
import { triggerSummaryReschedule } from '@/src/features/notification/triggerReschedule';
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

  // Sess12 PR-G 改善 H: 複数作業選択 state
  const [selectedTypes, setSelectedTypes] = React.useState<Set<EventType>>(new Set());
  // log mode のみ: 「メモを追加する」 toggle (default OFF)
  const [addNote, setAddNote] = React.useState(false);
  // 書き込み中の重複 tap 防止
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const subKey: TranslationKey = mode === 'log' ? 'bulkPickerSheetSubLog' : 'bulkPickerSheetSub';

  const toggleType = React.useCallback((type: EventType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const handleConfirm = async () => {
    if (selectedTypes.size === 0 || isSubmitting) return;
    setIsSubmitting(true);
    const types = Array.from(selectedTypes);
    const bonsaiIds = selectedBonsais.map((b) => b.id);

    if (mode === 'schedule') {
      // ADR-0008 §TZ 3 層防御: new Date() 引数なし禁止、 nowUtc() 経由
      const dateStr = scheduleDate || (nowUtc() as string).slice(0, 10);
      const occurredAtUtc = `${dateStr}T00:00:00.000Z`;
      try {
        await Promise.all(
          types.map((type) => bulkScheduleEvents({ bonsaiIds, type, occurredAtUtc })),
        );
        useToastStore
          .getState()
          .show(t('bulkScheduleDoneToast').replace('{count}', String(types.length)));
      } catch (error) {
        console.warn('[bulk-schedule] failed:', error);
      }
      // Sess12 PR-I: 通知 reschedule (planned events 変化 → 当日まとめ通知再予約)
      void triggerSummaryReschedule(t);
      // Sess12 PR-G 改善 I: dismissAll は 1 階のみ閉じる仕様、 router.replace で予定タブに直接遷移
      router.replace('/(tabs)/plan' as Href);
      return;
    }

    // log mode
    if (addNote && types.length >= 2) {
      // toggle ON + 複数作業: BulkLogConfirm にタブ式 note 入力で push
      const typesParam = encodeURIComponent(types.join(','));
      setIsSubmitting(false);
      router.push(`/bulk-log-confirm?types=${typesParam}` as Href);
      return;
    }

    if (types.length === 1) {
      // 単一作業 log: 従来の BulkLogConfirm で note 入力
      setIsSubmitting(false);
      router.push(`/bulk-log-confirm?types=${types[0]}` as Href);
      return;
    }

    // 複数作業 + toggle OFF: 即書き込み (note なし)
    try {
      await Promise.all(types.map((type) => bulkLogEvents({ bonsaiIds, type, note: null })));
      useToastStore.getState().show(t('bulkLogDoneToast').replace('{count}', String(types.length)));
    } catch (error) {
      console.warn('[bulk-log] failed:', error);
    }
    router.replace('/(tabs)/record' as Href);
  };

  const ctaDisabled = selectedTypes.size === 0 || isSubmitting;
  const ctaKey: TranslationKey = mode === 'log' ? 'bulkLogConfirmCta' : 'bulkScheduleConfirmCta';
  const ctaLabel = t(ctaKey).replace('{count}', String(selectedTypes.size));
  // log mode で 2+ 件選択時のみ toggle 表示
  const showAddNoteToggle = mode === 'log' && selectedTypes.size >= 2;

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
          {BULK_WORK_TYPES.map((type) => {
            const selected = selectedTypes.has(type);
            return (
              <Pressable
                key={type}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={t(`eventType_${type}` as TranslationKey)}
                style={[styles.cell, selected && styles.cellSelected]}
                onPress={() => toggleType(type)}
                testID={`e2e_bulk_work_picker_${type}`}
              >
                <WorkTypeIcon type={type} size={32} color={selected ? ON_BRAND : TEXT_PRIMARY} />
                <ThemedText style={[styles.label, selected && styles.labelSelected]}>
                  {t(`eventType_${type}` as TranslationKey)}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Sess12 PR-G 改善 H: 下部固定 footer (toggle + CTA) */}
      <View style={styles.footer}>
        {showAddNoteToggle && (
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: addNote }}
            accessibilityLabel={t('bulkLogAddNoteToggle')}
            style={styles.toggleRow}
            onPress={() => setAddNote((v) => !v)}
            testID="e2e_bulk_work_picker_add_note_toggle"
          >
            <View style={[styles.toggleCheckbox, addNote && styles.toggleCheckboxOn]}>
              {addNote ? <ThemedText style={styles.toggleCheckMark}>✓</ThemedText> : null}
            </View>
            <ThemedText style={styles.toggleLabel}>{t('bulkLogAddNoteToggle')}</ThemedText>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          accessibilityState={{ disabled: ctaDisabled }}
          disabled={ctaDisabled}
          style={[styles.cta, ctaDisabled && styles.ctaDisabled]}
          onPress={handleConfirm}
          testID="e2e_bulk_work_picker_confirm"
        >
          <ThemedText style={styles.ctaText}>{ctaLabel}</ThemedText>
        </Pressable>
      </View>
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
  // Sess12 PR-G 改善 H: 選択中 cell = 緑反転 (背景 BRAND_GREEN + アイコン/文字白)
  cellSelected: {
    backgroundColor: BRAND_GREEN,
    borderColor: BRAND_GREEN,
  },
  label: { fontSize: 13, color: TEXT_PRIMARY, textAlign: 'center' },
  labelSelected: { color: ON_BRAND, fontWeight: '600' },
  // 下部固定 footer (CTA + toggle)
  footer: {
    padding: 16,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: BORDER_DEFAULT,
    backgroundColor: BG_PRIMARY,
    gap: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  toggleCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: BORDER_DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  toggleCheckboxOn: {
    borderColor: BRAND_GREEN,
    backgroundColor: BRAND_GREEN,
  },
  toggleCheckMark: { color: ON_BRAND, fontSize: 14, fontWeight: '700' },
  toggleLabel: { fontSize: 14, color: TEXT_PRIMARY },
  cta: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_GREEN,
  },
  ctaDisabled: { backgroundColor: TEXT_MUTED, opacity: 0.5 },
  ctaText: { fontSize: 17, fontWeight: '500', color: ON_BRAND, letterSpacing: 0.6 },
});
