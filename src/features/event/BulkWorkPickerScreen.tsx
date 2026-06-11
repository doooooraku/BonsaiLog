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
 *   - schedule mode: router.push('/bulk-log-confirm?mode=schedule') (日付 + 定期 確認画面、 Sess99 #1119)
 *   - log mode: router.push('/bulk-log-confirm?type=<single>') (note + 日付 + 写真 入力画面)
 */
import { router, useLocalSearchParams, type Href } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BonsaiChipPickerLayout } from '@/src/features/bonsai/BonsaiChipPickerLayout';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
// Sess68 PR #C: 全 forbidden token を inline c.* 化。
import { useColors } from '@/src/core/theme/useColors';
import { type EventType } from '@/src/db/schema';
import { WorkTypeGrid } from '@/src/features/event/WorkTypeGrid';
import { usePickerStore } from '@/src/stores/pickerStore';

export default function BulkWorkPickerScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const params = useLocalSearchParams<{
    mode?: 'schedule' | 'log' | 'recurring';
    date?: string;
    /** Sess99 #1127: 保存後の戻り先 ('dismiss' = modal 全閉じで起点画面へ、盆栽詳細動線用)。 */
    returnTo?: string;
  }>();
  // Sess82 PR-D: 'recurring' mode 追加 (= 定期予定 新規作成動線、 BulkWorkPicker → /recurring-rules/new)
  const mode: 'schedule' | 'log' | 'recurring' =
    params.mode === 'log' ? 'log' : params.mode === 'recurring' ? 'recurring' : 'schedule';
  const scheduleDate = params.date ?? '';
  const returnTo = params.returnTo === 'dismiss' ? 'dismiss' : '';

  const selectedBonsais = usePickerStore((s) => s.bulkContext?.selectedBonsais ?? []);

  // Sess83 ADR-0025 §7 Notes Amended (R-71 起票): 1 件 case の表現契約 = 「同じ」 文言の
  // compositional 違和感 (1 件 case で「同じ」 は文法成立せず) + chip 視覚曖昧化を解消するため、
  // count=1 時は専用 i18n key (...Single) + 盆栽名直接埋込 + CheckIcon + 「自動選択」 hint。
  // 2 件以上は既存挙動完全維持 (デグレなし)、 mode=recurring も schedule key 共有で同時解消。
  const isSingle = selectedBonsais.length === 1;
  const subKey: TranslationKey = isSingle
    ? mode === 'log'
      ? 'bulkPickerSheetSubLogSingle'
      : 'bulkPickerSheetSubScheduleSingle'
    : mode === 'log'
      ? 'bulkPickerSheetSubLog'
      : 'bulkPickerSheetSub';
  const subText = isSingle
    ? t(subKey).replace('{name}', selectedBonsais[0]?.name ?? '')
    : t(subKey).replace('{count}', String(selectedBonsais.length));

  // Sess16 PR-B1: cell tap で即遷移 (複数作業対応削除、 user 真意「単一作業のみ」)。
  const handleSelect = React.useCallback(
    (type: EventType) => {
      const bonsaiIds = selectedBonsais.map((b) => b.id);

      // Sess99 #1119 (ADR-0056 Sess99 Amendment / 案 a): schedule mode は BulkLogConfirmScreen
      // (mode=schedule) 経由に変更。 Sess80 PR-6.5 の 1 タップ即書込は user 実機検証「確認画面が
      // 出ない」 指摘で改訂 — 確認画面で日付編集 + 定期 toggle を確認してから保存する。
      // 保存処理 (bulkScheduleEvents + toast + 通知 soft-ask + reschedule) は確認画面側に集約。
      if (mode === 'schedule') {
        const dateParam = scheduleDate ? `&date=${encodeURIComponent(scheduleDate)}` : '';
        // Sess99 #1127: returnTo を確認画面へ forward (盆栽詳細動線では保存後に modal 全閉じ)。
        const returnParam = returnTo ? `&returnTo=${returnTo}` : '';
        router.push(
          `/bulk-log-confirm?type=${type}&mode=schedule${dateParam}${returnParam}` as Href,
        );
        return;
      }

      // Sess82 PR-D + Sess89 PR-C: recurring mode = 定期予定 新規作成画面に push。
      // Sess89 PR-C「対象の盆栽 複数件対応」 (= 案 X N 件 loop bulkCreateRecurrenceRules):
      // - bonsai 情報は usePickerStore.bulkContext 経由 (= 既に setBulkContext 済、 全件 store 保持)
      // - URL param には eventType のみ載せて過大化回避
      // - RecurrenceFormScreen で usePickerStore.bulkContext.selectedBonsais を参照、 全件 Chip 表示
      //
      // Sess89 hotfix (2026-06-10): router.replace → router.push に変更。
      // 真因 = replace だと履歴 entry を上書きするため、 RecurrenceFormScreen で 戻る tap 時に
      // BulkWorkPicker (= 種別 grid) をスキップして BonsaiMultiSelect (or 「ふりかえり」 tab)
      // まで一気に戻ってしまう UX 不整合。 push で履歴維持 → 戻る 1 タップで 種別選択画面に戻る、
      // 業務プロ user が「種別だけ変えて作り直し」 動線が自然に成立。
      if (mode === 'recurring') {
        if (bonsaiIds.length === 0) {
          router.back();
          return;
        }
        router.push(`/recurring-rules/new?eventType=${type}` as Href);
        return;
      }

      // log mode: BulkLogConfirm に push (note + 日付 + 写真 入力画面)。
      const dateParam = scheduleDate ? `&date=${encodeURIComponent(scheduleDate)}` : '';
      router.push(`/bulk-log-confirm?type=${type}${dateParam}` as Href);
    },
    [mode, scheduleDate, selectedBonsais, returnTo],
  );

  return (
    <View
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_bulk_work_picker_screen"
    >
      {/* Sess92 PR-3 follow-up: BonsaiChipPickerLayout SoT 化 (= ScrollView wrap + BonsaiChipList + body
          統合)。 旧 View 直下に BonsaiChipList + grid 別個実装 → 全画面共通 layout に統一、 chip 数十件で
          grid 圧迫の構造問題を解消 (= user 苦情「全体画面としてスクロール」 由来)。 */}
      <BonsaiChipPickerLayout
        bonsais={selectedBonsais}
        headerText={subText}
        isSingle={isSingle}
        showAutoSelectedHint
        autoSelectedHintTestId="e2e_bulk_work_picker_auto_selected_hint"
      >
        {/* Sess99 #1122: grid を WorkTypeGrid (SoT) に集約 (WorkPickerScreen / RecurrenceFormScreen と共通)。 */}
        <WorkTypeGrid onSelect={handleSelect} testIDPrefix="e2e_bulk_work_picker" />
      </BonsaiChipPickerLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Sess92 PR-3 follow-up: header / sub / chipsRow / chip / chipText / autoSelectedHintRow /
  // autoSelectedHintText / body (= ScrollView + body padding) は BonsaiChipPickerLayout に SoT 移管。
  // Sess99 #1122: grid / cell / label は WorkTypeGrid に SoT 移管。
});
