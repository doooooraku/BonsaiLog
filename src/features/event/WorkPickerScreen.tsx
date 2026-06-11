/**
 * 作業選択 画面 (ADR-0024 で native presentation `(modals)/work-picker` に移行、 `presentation: 'modal'`)。
 *
 * Sess16 PR-A1 で nav title を mode URL param で動的化
 * (log → 「作業を記録」 / schedule → 「予定を追加」)。
 *
 * 14 種別の作業タイプを 3 列 grid (WorkTypeIcon SVG outline + ラベル) で表示。
 * Sess16 PR-Q (2026-05-20): candle_cut の松類限定表示を撤廃、 user 真意「どんな盆栽でも全種別表示」
 * シンプル化反映。 EVENT_TYPES を直接使用 (filter なし)。
 *
 * Sess18 PR-1 (2026-05-21、 ADR-0030 D2): log mode は直接 router.push('/work-log-confirm')
 * (Case C → 解消、 戻る挙動 1 step)。
 * Sess99 #1127 (案 A): schedule mode の store-callback (Case A、 setWorkPickerResult +
 * caller DatePicker dialog) は撤去 — 予定追加は BulkWorkPicker → BulkLogConfirmScreen
 * (確認画面) 動線に統一。本画面の残責務 = log mode + planned event 種別編集 (editingPlannedId)。
 *
 * Query params:
 * - bonsaiName: 表示用 (サブタイトル)
 * - mode: nav title 切替用 (`(modals)/work-picker.tsx` が参照)、デフォルト `'log'`
 */
import { router, useLocalSearchParams, type Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useToastStore } from '@/src/components/Toast';
import { useTranslation } from '@/src/core/i18n/i18n';
// Sess68 PR #C: 全 forbidden token を inline c.* 化。
import { useColors } from '@/src/core/theme/useColors';
import { updateEvent } from '@/src/db/eventRepository';
import { EVENT_TYPES, type EventType } from '@/src/db/schema';
import { triggerSummaryReschedule } from '@/src/features/notification/triggerReschedule';
import { WorkTypeIcon } from '@/src/features/event/WorkTypeIcon';

export default function WorkPickerScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const params = useLocalSearchParams<{
    bonsaiName?: string;
    bonsaiId?: string;
    /**
     * Sess77 Follow-up (ADR-0055 Notes Amended): planned event 編集モード trigger。
     * 指定時、 種別 tap で `updateEvent(id, {type: newType, payload: {}})` を 呼び、
     * 元 planned event の 作業種別を 差し替え (payload はリセット)。
     */
    editingPlannedId?: string;
    /** 編集モードで 現在の type を highlighted 表示するための param */
    currentType?: EventType;
  }>();
  const bonsaiName = params.bonsaiName ?? '';
  const bonsaiId = params.bonsaiId ?? '';
  const editingPlannedId = params.editingPlannedId ?? null;
  const currentType = params.currentType ?? null;

  const items = EVENT_TYPES;
  const handleSelect = async (type: EventType) => {
    if (editingPlannedId) {
      // Sess77 Follow-up: 編集モード = 既存 planned event の 種別差し替え。
      // payload は型整合性のため {} reset (type に応じた default 値で 再入力できる)。
      try {
        await updateEvent(editingPlannedId, { type, payload: {} });
        void triggerSummaryReschedule(t);
        useToastStore.getState().show(t('workLogPlannedTypeUpdatedToast'));
        router.back();
      } catch (err) {
        console.warn('[WorkPickerScreen] planned type update failed', err);
        useToastStore.getState().show(t('error'));
      }
      return;
    }
    // Sess18 PR-1 (ADR-0030 D2): Case C 解消、 WorkLogConfirm に直接 push。
    // user 体感「← で 1 画面ずつ戻る」 達成 (Stack: detail → picker → confirm)。
    // Sess19 PR-4 (ADR-0031 D1): bonsaiId 渡す (WorkLogConfirm 直接 await + createEvent で必須)
    // Sess99 #1127: 旧 schedule store-callback 分岐 (Case A) は撤去済み —
    // 予定追加で本画面に来る経路は editingPlannedId (種別編集) のみで、上の early return が担う。
    router.push(
      `/work-log-confirm?bonsaiName=${encodeURIComponent(bonsaiName)}&bonsaiId=${bonsaiId}&type=${type}` as Href,
    );
  };

  return (
    <View
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_work_picker_screen"
    >
      <View style={styles.header}>
        <ThemedText style={[styles.subject, { color: c.text }]}>{bonsaiName}</ThemedText>
      </View>
      <View style={styles.grid} testID="e2e_work_picker_grid">
        {items.map((type) => {
          // Sess77 Follow-up: 編集モードで 現在 type を 視覚的 highlighted
          const isCurrent = editingPlannedId !== null && currentType === type;
          return (
            <Pressable
              key={type}
              accessibilityRole="button"
              accessibilityLabel={t(`eventType_${type}` as Parameters<typeof t>[0])}
              style={[
                styles.cell,
                { backgroundColor: c.surface, borderColor: c.border },
                isCurrent && { borderColor: c.tint, borderWidth: 2 },
              ]}
              onPress={() => handleSelect(type)}
              testID={`e2e_work_picker_${type}`}
            >
              <WorkTypeIcon type={type} size={32} color={isCurrent ? c.tint : c.text} />
              <ThemedText style={[styles.label, { color: isCurrent ? c.tint : c.text }]}>
                {t(`eventType_${type}` as Parameters<typeof t>[0])}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  header: { paddingTop: 8, paddingBottom: 12, alignItems: 'center' },
  subject: { fontSize: 14 },
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
