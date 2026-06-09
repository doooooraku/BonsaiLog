/**
 * RecurrenceListScreen = 定期予定ルール一覧画面 (Sess81 PR-7.5、 ADR-0056 D R-67)。
 *
 * 動線: ふりかえりタブ → 「🔁 定期予定を管理」 card tap → 本画面
 *
 * 責務:
 * - active rules (deleted_at IS NULL) を 作成順 (新しい順) で 一覧表示
 * - 各 rule = 盆栽名 / 種別 / RRULE 人間可読ラベル / 次回 / 終了日
 * - 削除 kebab → ConfirmDialog → softDeleteRecurrenceRule + reload (= R-44 破壊的操作 pattern)
 * - empty state (= 「予定タブから 🔁 で作成できます」 案内)
 * - 編集動線 = v1.0.1 PR-8 (連動編集 3 択 ConfirmDialog) で 追加予定、 本 PR-7.5 では 表示 + 削除のみ
 *
 * Pro 境界:
 * - Free user で 件数 > FREE_RECURRENCE_RULE_LIMIT (= 3) の場合のみ Grandfathered badge 表示
 *   (= ADR-0049 ⑦ 既存 4+ rule は表示/削除 OK、 追加のみ Paywall)
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
import { useTranslation } from '@/src/core/i18n/i18n';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import { parseCustomRruleDays } from '@/src/core/recurrence/rrule';
import { useColors } from '@/src/core/theme/useColors';
import {
  FREE_RECURRENCE_RULE_LIMIT,
  softDeleteRecurrenceRule,
  type RecurrenceRuleRow,
} from '@/src/db/recurrenceRuleRepository';
import type { EventType } from '@/src/db/schema';
import { useBulkActionFlow } from '@/src/features/event/useBulkActionFlow';
import { useRecurrenceRules } from '@/src/features/recurrence/useRecurrenceRules';

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
  const { t } = useTranslation();
  const c = useColors();
  const router = useRouter();
  const { rules, bonsaiMap, nextOccurrenceMap, loading, reload } = useRecurrenceRules();
  // Sess82 PR-D: 「+ 新規追加」 BottomCtaBar = useBulkActionFlow('recurring') 経由で 盆栽 picker → BulkWorkPicker → /recurring-rules/new
  const { startBulkAction } = useBulkActionFlow('recurring');
  const handleCreateNew = useCallback((): void => {
    const allBonsais = Array.from(bonsaiMap.values()).map((b) => ({
      id: b.id,
      name: b.name,
    }));
    startBulkAction(allBonsais);
  }, [bonsaiMap, startBulkAction]);
  const [deleteTarget, setDeleteTarget] = useState<RecurrenceRuleRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Sess82 PR-C: kebab → RowActionMenu (= 編集 + 削除 2 択、 ADR-0036 D7 整合)
  const [kebabTarget, setKebabTarget] = useState<RecurrenceRuleRow | null>(null);

  const handleKebabPress = useCallback((rule: RecurrenceRuleRow): void => {
    setKebabTarget(rule);
  }, []);

  const handleKebabDismiss = useCallback((): void => {
    setKebabTarget(null);
  }, []);

  const handleDeleteRequest = useCallback((rule: RecurrenceRuleRow): void => {
    setDeleteTarget(rule);
  }, []);

  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      await softDeleteRecurrenceRule(deleteTarget.id);
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
  // 編集 onPress 配線先 = Sess82 PR-D で /recurring-rules/edit/[ruleId] route 新規実装
  const kebabItems: readonly RowActionMenuItem[] = kebabTarget
    ? [
        {
          key: 'edit',
          label: t('rowActionMenuEdit'),
          onPress: () => {
            router.push(`/recurring-rules/edit/${kebabTarget.id}` as Href);
          },
          testID: `e2e_recurrence_kebab_edit_${kebabTarget.id}`,
        },
        {
          key: 'delete',
          label: t('rowActionMenuDelete'),
          destructive: true,
          onPress: () => handleDeleteRequest(kebabTarget),
          testID: `e2e_recurrence_kebab_delete_${kebabTarget.id}`,
        },
      ]
    : [];

  const isOverFreeLimit = rules.length > FREE_RECURRENCE_RULE_LIMIT;

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
          data={rules}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const bonsai = bonsaiMap.get(item.bonsaiId);
            const bonsaiLabel = bonsai?.name ?? t('recurringListItemDeletedBonsai');
            const eventLabel = t(`eventType_${item.eventType}` as TranslationKey);
            const humanRruleKey = rruleToHumanLabel(item.rrule);
            // Sess89 PR-B: custom RRULE (= FREQ=DAILY;INTERVAL=N) は N を抽出して「{n} 日ごと」 表示
            const customDays = parseCustomRruleDays(item.rrule);
            const rruleLabel =
              customDays !== null
                ? t('recurringPresetCustomEveryNDays').replace('{n}', String(customDays))
                : t(humanRruleKey);
            // Sess82 PR-B: 終了日表示削除 → 次回予定日表示 (= ADR-0056 D4-1、 4 ペルソナ最大公約数)
            const nextOccurrence = nextOccurrenceMap.get(item.id) ?? null;
            const nextLabel = nextOccurrence
              ? t('recurringListItemNextOccurrence').replace('{date}', nextOccurrence.slice(0, 10))
              : t('recurringListItemNextOccurrenceNone');
            return (
              <View
                style={[styles.card, { backgroundColor: c.surface, borderColor: c.borderStrong }]}
                testID={`e2e_recurrence_rule_${item.id}`}
              >
                <View
                  style={[styles.iconBox, { backgroundColor: c.background, borderColor: c.border }]}
                >
                  <EventIcon type={item.eventType as EventType} size={22} />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.titleRow}>
                    <ThemedText style={[styles.bonsaiName, { color: c.text }]} numberOfLines={1}>
                      {bonsaiLabel}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.eventLabel, { color: c.textSecondary }]}>
                    {eventLabel} · {rruleLabel}
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
                  testID={`e2e_recurrence_rule_kebab_${item.id}`}
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
                  {t('recurringListProBadgeOverLimit')} ({rules.length}/{FREE_RECURRENCE_RULE_LIMIT}
                  )
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bonsaiName: { fontSize: 15, fontWeight: '600' },
  eventLabel: { fontSize: 13 },
  // Sess82 PR-B: endLabel → nextLabel (= 「次回 yyyy-mm-dd」 表示、 ADR-0056 D4-1)
  nextLabel: { fontSize: 12 },
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
