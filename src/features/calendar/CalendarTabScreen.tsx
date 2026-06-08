/**
 * カレンダータブ画面 共通 coordinator (Sess30 PR-1 / ADR-0038 D2、 Phase 4 B1 で分割)。
 *
 * 旧 PlanScreen / RecordTabScreen の重複を集約し、 props `mode` で plan / record を切替:
 *   1. useBulkActionFlow(mode === 'plan' ? 'schedule' : 'log') (FAB action)
 *   2. default 日付: plan = 明日 / record = 今日 (useCalendarData が算出)
 *   3. titleKey / testIdPrefix / fabAccessibilityLabelKey / bonsaiDetailTab
 *   4. FAB disabled: plan のみ過去日 (useCalendarData の isFabDisabled)
 *
 * Phase 4 B1 (ADR-0045): 974 行 god を coordinator (routing+配線+render骨格) に分解。
 * - データ/選択: useCalendarData(mode)
 * - 削除/変換/kebab: useCalendarEventActions
 * - 月グリッド: CalendarMonthGrid / 選択日一覧: CalendarEventGroupList
 * 振る舞い・計算式 (ADR-0031/0034/0035) は完全不変、 mode prop / URL route も不変。
 */
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { BottomCtaBar } from '@/src/components/common/BottomCtaBar';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { RowActionMenu, type RowActionMenuItem } from '@/src/components/RowActionMenu';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
import { useColors } from '@/src/core/theme/useColors';
import { SearchHeader } from '@/src/features/bonsai/SearchHeader';
import { useBulkActionFlow } from '@/src/features/event/useBulkActionFlow';
import { useSettingsStore } from '@/src/stores/settingsStore';

import { CalendarEventGroupList } from './CalendarEventGroupList';
import { CalendarMonthGrid } from './CalendarMonthGrid';
import type { CalendarTabScreenProps } from './calendarTabTypes';
import { useCalendarData } from './useCalendarData';
import { useCalendarEventActions } from './useCalendarEventActions';

export type { CalendarTabMode, CalendarTabScreenProps } from './calendarTabTypes';

// S6 (ADR-0024 Phase G retro): Screen testID 静的 string で hint (動的 testID="e2e_plan_screen" と
// "e2e_record_screen" を mode 切替で出力するが、 lint script (regex) のため静的 string も併記)。
// 静的 testID 一覧: testID="e2e_plan_screen" / testID="e2e_record_screen"

export function CalendarTabScreen({ mode }: CalendarTabScreenProps) {
  const { t, lang } = useTranslation();
  const c = useColors();
  // mode 切替: schedule (予定追加 flow) / log (作業を記録 flow)
  const { startBulkAction } = useBulkActionFlow(mode === 'plan' ? 'schedule' : 'log');

  // testID prefix + i18n key + bonsai-detail 遷移先 tab を mode で切替
  const testIdPrefix = mode === 'plan' ? 'plan' : 'record';
  const titleKey: TranslationKey = mode === 'plan' ? 'tabPlan' : 'tabRecord';
  const fabAccessibilityLabelKey: TranslationKey =
    mode === 'plan' ? 'planFabLabel' : 'recordFabLabel';
  const bonsaiDetailTab = mode === 'plan' ? 'timeline' : 'history';

  const data = useCalendarData(mode);
  const actions = useCalendarEventActions({ bonsaiMap: data.bonsaiMap, reload: data.reload, t });

  const calendarLegendCollapsed = useSettingsStore((s) => s.calendarLegendCollapsed);
  const setCalendarLegendCollapsed = useSettingsStore((s) => s.setCalendarLegendCollapsed);
  const toggleLegend = useCallback(() => {
    setCalendarLegendCollapsed(!calendarLegendCollapsed);
  }, [calendarLegendCollapsed, setCalendarLegendCollapsed]);

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID={`e2e_${testIdPrefix}_screen`}
    >
      <SearchHeader title={t(titleKey)} showSearch={false} testIdSuffix={testIdPrefix} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <CalendarMonthGrid
          year={data.year}
          month={data.month}
          setYear={data.setYear}
          setMonth={data.setMonth}
          selectedDateKey={data.selectedDateKey}
          todayLocalKey={data.todayLocalKey}
          dotsByDay={data.dotsByDay}
          onSelectDate={data.setSelectedDateKey}
          calendarLegendCollapsed={calendarLegendCollapsed}
          onToggleLegend={toggleLegend}
          testIdPrefix={testIdPrefix}
        />

        <CalendarEventGroupList
          testIdPrefix={testIdPrefix}
          bonsaiDetailTab={bonsaiDetailTab}
          selectedDateKey={data.selectedDateKey}
          todayLocalKey={data.todayLocalKey}
          tzOffsetMin={data.tzOffsetMin}
          selectedDayEvents={data.selectedDayEvents}
          plannedGroupedEvents={data.plannedGroupedEvents}
          loggedGroupedEvents={data.loggedGroupedEvents}
          expandedTypes={actions.expandedTypes}
          toggleExpand={actions.toggleExpand}
          bonsaiMap={data.bonsaiMap}
          lang={lang}
          t={t}
          formatGroupCount={actions.formatGroupCount}
          formatGroupAccessibility={actions.formatGroupAccessibility}
          confirmDeleteEvent={actions.confirmDeleteEvent}
          confirmDeleteGroup={actions.confirmDeleteGroup}
          handleKebabPress={actions.handleKebabPress}
          handleBulkConvert={actions.handleBulkConvert}
          handleSingleConvert={actions.handleSingleConvert}
        />
      </ScrollView>

      {/* Sess72 ADR-0054 D1: FAB -> BottomCtaBar replacement. plan mode disables
          on past dates, record mode always enabled. Inline layout solves overlap
          structurally (R-62 Layout Contract). */}
      <BottomCtaBar
        onPress={() =>
          startBulkAction(
            data.bonsai.map((b) => ({ id: b.id, name: b.name })),
            data.selectedDateKey,
          )
        }
        label={t(fabAccessibilityLabelKey)}
        testID={`e2e_${testIdPrefix}_bottom_cta_action`}
        disabled={data.isFabDisabled}
      />

      <ConfirmDialog
        visible={actions.pendingDelete !== null}
        title={actions.confirmDialogTitle}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        destructive
        onConfirm={actions.handleConfirmDelete}
        onCancel={actions.handleCancelDelete}
        testID={`e2e_${testIdPrefix}_confirm_delete`}
      />

      <RowActionMenu
        visible={actions.kebabMenu !== null}
        items={
          actions.kebabMenu === null
            ? []
            : (() => {
                // ADR-0055 Sess77 PR-3: 個別 row kebab (events.length === 1) で「編集」 item を先頭に追加。
                // group kebab (events.length > 1) では編集を出さない (個別行のみ、 group 編集は意味不明)。
                const isIndividual = actions.kebabMenu.events.length === 1;
                const status = actions.kebabMenu.status;
                const type = actions.kebabMenu.type;
                const events = actions.kebabMenu.events;
                // Sess77 Follow-up (ADR-0055 Notes Amended): planned/logged で 編集動線 分岐。
                // - planned: 種別差し替え (= WorkPicker 起動)
                // - logged: payload 編集 (= 現状 WorkLogConfirm edit mode)
                const editItem: RowActionMenuItem | null = isIndividual
                  ? {
                      key: 'edit',
                      label: t('rowActionMenuEdit'),
                      onPress: () =>
                        status === 'planned'
                          ? actions.handleEditPlannedEvent(events[0]!)
                          : actions.handleEditEvent(events[0]!),
                      testID: `e2e_${testIdPrefix}_kebab_edit_${type}`,
                    }
                  : null;
                const deleteItem: RowActionMenuItem = {
                  key: 'delete',
                  label: t('rowActionMenuDelete'),
                  destructive: true,
                  onPress: () => actions.confirmDeleteGroup(status, type, events),
                  testID: `e2e_${testIdPrefix}_kebab_delete_${type}`,
                };
                if (status === 'planned') {
                  const recordAllItem: RowActionMenuItem = {
                    key: 'record-all',
                    label: t('rowActionMenuRecordAll').replace('{count}', String(events.length)),
                    onPress: () => actions.handleBulkConvert(type, events),
                    testID: `e2e_${testIdPrefix}_kebab_record_all_${type}`,
                  };
                  return editItem
                    ? [editItem, deleteItem, recordAllItem]
                    : [deleteItem, recordAllItem];
                }
                return editItem ? [editItem, deleteItem] : [deleteItem];
              })()
        }
        onDismiss={actions.handleKebabDismiss}
        testID={`e2e_${testIdPrefix}_kebab_menu`}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Sess72 ADR-0054 D1: 旧 paddingBottom 96 (FAB クリアランス) は撤去。 BottomCtaBar
  // (画面下端 inline) が container に直接配置され、 ScrollView は BottomCtaBar の上で
  // 自然に終わるため paddingBottom 計算不要 (R-62 Layout Contract 構造解決)。
  scrollContent: { paddingBottom: 16 },
});
