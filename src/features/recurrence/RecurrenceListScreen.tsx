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
import { Stack } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { EventIcon, MoreVerticalIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/core/i18n/i18n';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import { useColors } from '@/src/core/theme/useColors';
import {
  FREE_RECURRENCE_RULE_LIMIT,
  softDeleteRecurrenceRule,
  type RecurrenceRuleRow,
} from '@/src/db/recurrenceRuleRepository';
import type { EventType } from '@/src/db/schema';
import { useRecurrenceRules } from '@/src/features/recurrence/useRecurrenceRules';

/**
 * RRULE 文字列 → 人間可読 label に変換 (= 6 preset の逆引き)。
 * 未マッチは「カスタム」 として表示 (v1.2 で 詳細表示候補)。
 */
function rruleToHumanLabel(rrule: string): TranslationKey {
  // 6 preset の逆引き (ADR-0056 D4 + recurringPicker preset 整合)
  if (rrule === 'FREQ=DAILY') return 'recurringPresetDaily';
  if (rrule === 'FREQ=WEEKLY;BYDAY=MO') return 'recurringPresetWeeklyMonday';
  if (rrule === 'FREQ=WEEKLY') return 'recurringPresetWeekly';
  if (rrule === 'FREQ=WEEKLY;INTERVAL=2') return 'recurringPresetBiweekly';
  if (rrule === 'FREQ=MONTHLY') return 'recurringPresetMonthly';
  return 'recurringRruleHumanCustom';
}

export default function RecurrenceListScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const { rules, bonsaiMap, loading, reload } = useRecurrenceRules();
  const [deleteTarget, setDeleteTarget] = useState<RecurrenceRuleRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
            const endLabel = item.endAtUtc
              ? t('recurringListItemEndDate').replace('{date}', item.endAtUtc.slice(0, 10))
              : t('recurringListItemEndDateNever');
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
                    {eventLabel} · {t(humanRruleKey)}
                  </ThemedText>
                  <ThemedText style={[styles.endLabel, { color: c.textMuted }]}>
                    {endLabel}
                  </ThemedText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('delete')}
                  style={styles.kebabButton}
                  hitSlop={8}
                  onPress={() => handleDeleteRequest(item)}
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
  endLabel: { fontSize: 12 },
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
