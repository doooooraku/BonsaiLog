/**
 * F-08 カスタム樹形管理画面 (Sess89 Phase 3、 ADR-0049 ⑥ Grandfathered 緩 削除/編集 OK の構造実装)。
 *
 * 動線: ふりかえりタブ → 「樹形を管理」 card tap → 本画面
 *
 * 責務:
 * - カスタム樹形一覧 (createdAt ASC) + 使用件数 + 最終使用日
 * - 「+ 樹形を追加」 button → /custom-styles/edit (add mode)
 * - row 主部 tap → /custom-styles/edit?id=xxx&initialName=yyy (edit mode)
 * - kebab (⋮) → RowActionMenu (= 編集 / 削除 2 択、 ADR-0036 D7 整合)
 * - 削除 → ConfirmDialog → deleteCustomStyle + cascade UPDATE bonsai.style = NULL (= 案 c atomic)
 *
 * 模倣 pattern:
 * - app/tags.tsx (= 一覧 + 件数 + 最終使用日)
 * - src/features/recurrence/RecurrenceListScreen.tsx (= kebab + RowActionMenu + ConfirmDialog)
 *
 * 注: master 5 種 (= BONSAI_STYLES) は本画面に含めない (= 編集/削除不可、 picker でのみ表示)。
 *     master の存在は user に自明なので、 本画面では custom のみフォーカス。
 */
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { ChevronRightIcon, MoreVerticalIcon } from '@/src/components/icons';
import { RowActionMenu, type RowActionMenuItem } from '@/src/components/RowActionMenu';
import { elapsedDaysFromIsoUtc, formatElapsedDays } from '@/src/core/datetime';
import { useTranslation } from '@/src/core/i18n/i18n';
import { BRAND_GREEN, ON_BRAND, TEXT_MUTED, TEXT_PRIMARY } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import {
  deleteCustomStyle,
  getCustomStylesWithStats,
  type CustomStyleWithStats,
} from '@/src/db/bonsaiStylesCustomRepository';

export default function CustomStylesManagerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const [items, setItems] = React.useState<CustomStyleWithStats[]>([]);
  const [kebabTarget, setKebabTarget] = React.useState<CustomStyleWithStats | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<CustomStyleWithStats | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const reload = React.useCallback(async () => {
    const rows = await getCustomStylesWithStats();
    setItems(rows);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      reload().catch(() => setItems([]));
      setKebabTarget(null);
    }, [reload]),
  );

  const openAdd = () => {
    router.push('/custom-styles/edit' as Href);
  };

  const openEdit = (item: CustomStyleWithStats) => {
    router.push(
      `/custom-styles/edit?id=${encodeURIComponent(item.id)}&initialName=${encodeURIComponent(item.name)}` as Href,
    );
  };

  const handleDeleteRequest = (item: CustomStyleWithStats) => {
    setDeleteTarget(item);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteCustomStyle(deleteTarget.id);
      setDeleteTarget(null);
      await reload();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    if (isDeleting) return;
    setDeleteTarget(null);
  };

  const kebabItems: readonly RowActionMenuItem[] = kebabTarget
    ? [
        {
          key: 'edit',
          label: t('rowActionMenuEdit'),
          onPress: () => openEdit(kebabTarget),
          testID: `e2e_custom_styles_kebab_edit_${kebabTarget.id}`,
        },
        {
          key: 'delete',
          label: t('rowActionMenuDelete'),
          destructive: true,
          onPress: () => handleDeleteRequest(kebabTarget),
          testID: `e2e_custom_styles_kebab_delete_${kebabTarget.id}`,
        },
      ]
    : [];

  const buildStatsLabel = (item: CustomStyleWithStats): string => {
    const countLabel = t('customStylesUsageCountFormat').replace(
      '{count}',
      String(item.usageCount),
    );
    if (item.usageCount === 0 || item.lastUsedAt == null) {
      return `${countLabel} · ${t('customStylesLastUsedNever')}`;
    }
    const days = elapsedDaysFromIsoUtc(item.lastUsedAt);
    if (days === 0) {
      return `${countLabel} · ${t('customStylesLastUsedToday')}`;
    }
    const elapsed = formatElapsedDays(days, t) ?? '';
    return `${countLabel} · ${t('customStylesLastUsedFormat').replace('{relative}', elapsed)}`;
  };

  const deleteDialogTitle = deleteTarget
    ? t('customStylesDeleteConfirmTitle').replace('{name}', deleteTarget.name)
    : '';
  const deleteDialogBody = deleteTarget
    ? deleteTarget.usageCount > 0
      ? t('customStylesDeleteImpactBody').replace('{count}', String(deleteTarget.usageCount))
      : t('customStylesDeleteConfirmBody')
    : '';

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_custom_styles_manager"
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ThemedText type="title" style={styles.title}>
          {t('customStylesManagerTitle')}
        </ThemedText>
        <ThemedText style={[styles.desc, { color: c.textSecondary }]}>
          {t('customStylesManagerDesc')}
        </ThemedText>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('customStylesAddCta')}
          testID="e2e_custom_styles_add_open"
          style={styles.addBtn}
          onPress={openAdd}
        >
          <ThemedText style={styles.addBtnText}>{t('customStylesAddCta')}</ThemedText>
        </Pressable>

        {items.length === 0 && (
          <ThemedText style={[styles.empty, { color: c.textSecondary }]}>
            {t('customStylesEmpty')}
          </ThemedText>
        )}

        {items.map((item) => (
          <View
            key={item.id}
            style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.name} ${buildStatsLabel(item)}`}
              testID={`e2e_custom_styles_row_${item.id}`}
              style={styles.rowMain}
              onPress={() => openEdit(item)}
            >
              <ThemedText type="defaultSemiBold" style={{ color: TEXT_PRIMARY }}>
                {item.name}
              </ThemedText>
              <ThemedText
                style={[
                  styles.rowStats,
                  { color: c.textSecondary },
                  item.usageCount === 0 && { color: TEXT_MUTED, fontStyle: 'italic' },
                ]}
              >
                {buildStatsLabel(item)}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('rowActionMenuEdit') + ' / ' + t('rowActionMenuDelete')}
              style={styles.kebabButton}
              hitSlop={8}
              onPress={() => setKebabTarget(item)}
              testID={`e2e_custom_styles_kebab_${item.id}`}
            >
              <MoreVerticalIcon size={20} color={c.textSecondary} />
            </Pressable>
            <ChevronRightIcon size={16} color={c.textMuted} />
          </View>
        ))}
      </ScrollView>

      <RowActionMenu
        visible={kebabTarget !== null}
        items={kebabItems}
        onDismiss={() => setKebabTarget(null)}
        testID="e2e_custom_styles_kebab_menu"
      />

      <ConfirmDialog
        visible={deleteTarget !== null}
        title={deleteDialogTitle}
        description={deleteDialogBody}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        destructive
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={handleDeleteCancel}
        testID="e2e_custom_styles_delete_dialog"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  title: { marginBottom: 4 },
  desc: { fontSize: 13, marginBottom: 12, lineHeight: 18 },
  addBtn: {
    paddingVertical: 14,
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  addBtnText: { color: ON_BRAND, fontSize: 17, fontWeight: '600', letterSpacing: 0.5 },
  empty: { textAlign: 'center', paddingVertical: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  rowStats: { fontSize: 12 },
  kebabButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
