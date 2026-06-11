/**
 * RecurrenceListScreen = 定期予定ルール一覧画面 (Sess81 PR-7.5、 ADR-0056 D R-67)。
 *
 * 動線: ふりかえりタブ → 「🔁 定期予定を管理」 card tap → 本画面
 *
 * 責務:
 * - active rules (deleted_at IS NULL) を 作成順 (新しい順) で グループ 1 行 一覧表示
 * - 各グループ = 種別 · RRULE 人間可読ラベル (主役) / 盆栽件数 / 次回 (ローカライズ日付 + 通知時刻)
 *   (Sess101 #1158: 予定グループ中心 UI — 盆栽名 join + ×N badge は廃止、 盆栽は件数のみ)
 * - 削除 kebab → ConfirmDialog → softDeleteRecurrenceRule + reload (= R-44 破壊的操作 pattern)
 * - empty state (= 「予定タブから 🔁 で作成できます」 案内)
 * - 編集動線 = v1.0.1 PR-8 (連動編集 3 択 ConfirmDialog) で 追加予定、 本 PR-7.5 では 表示 + 削除のみ
 *
 * Pro 境界 (Sess101 #1159: 予定グループ単位):
 * - Free user で グループ数 > FREE_RECURRENCE_GROUP_LIMIT (= 3) の場合のみ Grandfathered badge 表示
 *   (= ADR-0049 ⑦ Sess101 Amendment 既存 4+ グループは表示/編集/削除 OK、 追加のみ Paywall)
 *
 * 参照: docs/adr/ADR-0056-recurring-schedule.md / docs/adr/ADR-0035 D9 Sess81 部分 revert
 *        src/features/recurrence/useRecurrenceRules.ts (hook)
 *        src/db/recurrenceRuleRepository.ts (listActiveRecurrenceRules / softDeleteRecurrenceRule)
 */
import { Stack, useRouter, type Href } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomCtaBar } from '@/src/components/common/BottomCtaBar';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { EventIcon, MoreVerticalIcon } from '@/src/components/icons';
import { RowActionMenu, type RowActionMenuItem } from '@/src/components/RowActionMenu';
import { formatLocalizedShortDateWithWeekday } from '@/src/core/datetime/formatLocalized';
import { useTranslation } from '@/src/core/i18n/i18n';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import { parseCustomRruleDays } from '@/src/core/recurrence/rrule';
import { useColors } from '@/src/core/theme/useColors';
import {
  FREE_RECURRENCE_GROUP_LIMIT,
  softDeleteRecurrenceRule,
} from '@/src/db/recurrenceRuleRepository';
import type { EventType } from '@/src/db/schema';
import { useBulkActionFlow } from '@/src/features/event/useBulkActionFlow';
import {
  useRecurrenceRules,
  type RecurrenceRuleGroup,
} from '@/src/features/recurrence/useRecurrenceRules';
import { useSettingsStore } from '@/src/stores/settingsStore';

/**
 * RRULE 文字列 → 人間可読 label に変換 (= preset 静的逆引き、 Sess89 PR-B 拡張)。
 *
 * Sess78 当初 = 6 preset、 Sess89 PR-B で 7 preset + custom (FREQ=DAILY;INTERVAL=N) に拡張。
 * 既存 rule の旧 RRULE (= weeklyMonday=FREQ=WEEKLY;BYDAY=MO / biweekly=FREQ=WEEKLY;INTERVAL=2)
 * は migration せず維持、 表示連続性のため 旧 key も逆引き対応を保持。
 *
 * 未マッチは「カスタム」 fallback (= caller で parseCustomRruleDays で N 抽出して
 * 「{n} 日ごと」 と置換表示する pattern を併用、 RecurrenceListScreen renderItem 参照)。
 */
function rruleToHumanLabel(rrule: string): TranslationKey {
  // 7 preset の逆引き (= Sess89 PR-B 拡張)
  if (rrule === 'FREQ=DAILY') return 'recurringPresetDaily';
  if (rrule === 'FREQ=WEEKLY') return 'recurringPresetWeekly';
  if (rrule === 'FREQ=MONTHLY') return 'recurringPresetMonthly';
  if (rrule === 'FREQ=MONTHLY;INTERVAL=3') return 'recurringPresetEvery3Months';
  if (rrule === 'FREQ=MONTHLY;INTERVAL=6') return 'recurringPresetEvery6Months';
  if (rrule === 'FREQ=YEARLY') return 'recurringPresetYearly';
  // 旧 preset 維持 (= 既存 rule 表示連続性、 PRESET_ORDER から外れているが key 残存)
  if (rrule === 'FREQ=WEEKLY;BYDAY=MO') return 'recurringPresetWeeklyMonday';
  if (rrule === 'FREQ=WEEKLY;INTERVAL=2') return 'recurringPresetBiweekly';
  // FREQ=DAILY;INTERVAL=N (= custom) は caller で parseCustomRruleDays + 置換、 ここでは fallback
  return 'recurringRruleHumanCustom';
}

export default function RecurrenceListScreen() {
  const { t, lang } = useTranslation();
  const c = useColors();
  const router = useRouter();
  // Sess101 #1158: 「次回」 行 = フォーム RulePreviewCard と同形式 (ローカライズ日付 + 通知時刻 SoT)
  const notifTime = useSettingsStore((s) => s.notificationDailySummaryTime);
  // Sess99 #1122 案 G2: グループ単位 (= 同時作成 rule 群を 1 行) で表示・編集・削除する。
  const { rules, groups, bonsaiMap, nextOccurrenceMap, loading, reload } = useRecurrenceRules();
  // Sess82 PR-D: 「+ 新規追加」 BottomCtaBar = useBulkActionFlow('recurring') 経由で 盆栽 picker → BulkWorkPicker → /recurring-rules/new
  const { startBulkAction } = useBulkActionFlow('recurring');
  const handleCreateNew = useCallback((): void => {
    const allBonsais = Array.from(bonsaiMap.values()).map((b) => ({
      id: b.id,
      name: b.name,
    }));
    startBulkAction(allBonsais);
  }, [bonsaiMap, startBulkAction]);
  const [deleteTarget, setDeleteTarget] = useState<RecurrenceRuleGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Sess82 PR-C: kebab → RowActionMenu (= 編集 + 削除 2 択、 ADR-0036 D7 整合)
  const [kebabTarget, setKebabTarget] = useState<RecurrenceRuleGroup | null>(null);

  const handleKebabPress = useCallback((group: RecurrenceRuleGroup): void => {
    setKebabTarget(group);
  }, []);

  const handleKebabDismiss = useCallback((): void => {
    setKebabTarget(null);
  }, []);

  const handleDeleteRequest = useCallback((group: RecurrenceRuleGroup): void => {
    setDeleteTarget(group);
  }, []);

  // Sess99 #1122 案 G2: グループ削除 = メンバー rule 全件 soft-delete (cascade で未来予定も削除)
  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      for (const rule of deleteTarget.rules) {
        await softDeleteRecurrenceRule(rule.id);
      }
      setDeleteTarget(null);
      await reload();
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, isDeleting, reload]);

  const handleDeleteCancel = useCallback((): void => {
    if (isDeleting) return;
    setDeleteTarget(null);
  }, [isDeleting]);

  // Sess82 PR-C: kebab menu items 動的構築 (= CalendarTabScreen 既使用 pattern 踏襲、 ADR-0036 D7)
  // Sess99 #1122: 編集は代表 rule の id で起動 (RecurrenceFormScreen がグループ全員を復元)
  const kebabItems: readonly RowActionMenuItem[] = kebabTarget
    ? [
        {
          key: 'edit',
          label: t('rowActionMenuEdit'),
          onPress: () => {
            router.push(`/recurring-rules/edit/${kebabTarget.representative.id}` as Href);
          },
          testID: `e2e_recurrence_kebab_edit_${kebabTarget.representative.id}`,
        },
        {
          key: 'delete',
          label: t('rowActionMenuDelete'),
          destructive: true,
          onPress: () => handleDeleteRequest(kebabTarget),
          testID: `e2e_recurrence_kebab_delete_${kebabTarget.representative.id}`,
        },
      ]
    : [];

  // Sess101 #1159: Grandfathered badge 判定もグループ数 (= user 認知の「予定の件数」) で行う
  const isOverFreeLimit = groups.length > FREE_RECURRENCE_GROUP_LIMIT;

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_recurrence_list_screen"
    >
      <Stack.Screen options={{ title: t('recurringListScreenTitle') }} />

      {!loading && rules.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText style={[styles.emptyTitle, { color: c.text }]}>
            {t('recurringListEmptyTitle')}
          </ThemedText>
          <ThemedText style={[styles.emptyDesc, { color: c.textSecondary }]}>
            {t('recurringListEmptyDesc')}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            // Sess101 #1158: 1 行 = 1 グループ、 主役 = 種別 · 頻度 (= 予定グループ中心 UI)。
            // 盆栽は件数のみ表示 (盆栽名 join + ×N badge は廃止 — タグ型「予定単位の管理」 概念に整合)。
            const rep = item.representative;
            const eventLabel = t(`eventType_${rep.eventType}` as TranslationKey);
            const humanRruleKey = rruleToHumanLabel(rep.rrule);
            // Sess89 PR-B: custom RRULE (= FREQ=DAILY;INTERVAL=N) は N を抽出して「{n} 日ごと」 表示
            const customDays = parseCustomRruleDays(rep.rrule);
            const rruleLabel =
              customDays !== null
                ? t('recurringPresetCustomEveryNDays').replace('{n}', String(customDays))
                : t(humanRruleKey);
            // Sess82 PR-B: 終了日表示削除 → 次回予定日表示。 グループでは member 最小 (= 最も近い未来)。
            const nexts = item.rules
              .map((r) => nextOccurrenceMap.get(r.id) ?? null)
              .filter((v): v is string => v !== null)
              .sort();
            const nextOccurrence = nexts[0] ?? null;
            // Sess101 #1158: 生 ISO (YYYY-MM-DD) → ローカライズ日付 + 通知時刻 (フォームの次回行と形式統一)
            const nextLabel = nextOccurrence
              ? t('recurringListItemNextOccurrence').replace(
                  '{date}',
                  `${formatLocalizedShortDateWithWeekday(nextOccurrence.slice(0, 10), lang)} ${notifTime}`,
                )
              : t('recurringListItemNextOccurrenceNone');
            return (
              <View
                style={[styles.card, { backgroundColor: c.surface, borderColor: c.borderStrong }]}
                testID={`e2e_recurrence_rule_${rep.id}`}
              >
                <View
                  style={[styles.iconBox, { backgroundColor: c.background, borderColor: c.border }]}
                >
                  <EventIcon type={rep.eventType as EventType} size={22} />
                </View>
                <View style={styles.cardBody}>
                  <ThemedText style={[styles.groupTitle, { color: c.text }]} numberOfLines={1}>
                    {eventLabel} · {rruleLabel}
                  </ThemedText>
                  <ThemedText style={[styles.bonsaiCount, { color: c.textSecondary }]}>
                    {t('recurringListItemBonsaiCount').replace(
                      '{count}',
                      String(item.rules.length),
                    )}
                  </ThemedText>
                  <ThemedText style={[styles.nextLabel, { color: c.textMuted }]}>
                    {nextLabel}
                  </ThemedText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('rowActionMenuEdit') + ' / ' + t('rowActionMenuDelete')}
                  style={styles.kebabButton}
                  hitSlop={8}
                  onPress={() => handleKebabPress(item)}
                  testID={`e2e_recurrence_rule_kebab_${rep.id}`}
                >
                  <MoreVerticalIcon size={20} color={c.textSecondary} />
                </Pressable>
              </View>
            );
          }}
          ListHeaderComponent={
            isOverFreeLimit ? (
              <View
                style={[
                  styles.overLimitBadge,
                  { backgroundColor: c.buttonSecondaryBg, borderColor: c.tint },
                ]}
              >
                <ThemedText style={[styles.overLimitText, { color: c.tint }]}>
                  {t('recurringListProBadgeOverLimit')} ({groups.length}/
                  {FREE_RECURRENCE_GROUP_LIMIT})
                </ThemedText>
              </View>
            ) : null
          }
        />
      )}

      {/* Sess82 PR-D: BottomCtaBar 「+ 新規追加」 = useBulkActionFlow('recurring') 経由 */}
      <BottomCtaBar
        label={t('recurringListCreateNewLabel')}
        onPress={handleCreateNew}
        testID="e2e_recurrence_list_create_new"
      />

      {/* Sess82 PR-C: kebab → RowActionMenu (= 編集 + 削除 2 択、 ADR-0036 D7 整合) */}
      <RowActionMenu
        visible={kebabTarget !== null}
        items={kebabItems}
        onDismiss={handleKebabDismiss}
        testID="e2e_recurrence_kebab_menu"
      />

      <ConfirmDialog
        visible={deleteTarget !== null}
        title={t('recurringListDeleteConfirmTitle')}
        description={t('recurringListDeleteConfirmDesc')}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        destructive
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={handleDeleteCancel}
        testID="e2e_recurrence_delete_dialog"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 96, gap: 12 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyDesc: { fontSize: 13, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: { flex: 1, minWidth: 0, gap: 2 },
  // Sess101 #1158: 主役 = 種別 · 頻度 (16/600)、 2 行目 = 盆栽件数 (14)、 3 行目 = 次回 (13)
  groupTitle: { fontSize: 16, fontWeight: '600' },
  bonsaiCount: { fontSize: 14 },
  // Sess82 PR-B: endLabel → nextLabel (= 次回表示、 ADR-0056 D4-1)。 Sess101 #1158 で 12 → 13 拡大
  nextLabel: { fontSize: 13 },
  kebabButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overLimitBadge: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    alignItems: 'center',
  },
  overLimitText: { fontSize: 13, fontWeight: '600' },
});
