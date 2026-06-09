/**
 * F-08 カスタム樹種管理画面 (Sess89 Phase 2、 ADR-0049 ⑥ Grandfathered 緩 削除/編集 OK の構造実装、
 * Sess91 PR-1 で /tags 同型の row 横並び layout + 共通 managerScreenStyles に統一)。
 *
 * 動線: ふりかえりタブ → 「樹種を管理」 card tap → 本画面
 *
 * 責務:
 * - カスタム樹種一覧 (createdAt ASC) + 使用件数 + 最終使用日
 * - 「+ 樹種を追加」 button → /custom-species/edit (add mode、 JSX 側で `+ ` prefix)
 * - row 主部 tap → /custom-species/edit?id=xxx&initialName=yyy (edit mode)
 * - kebab (⋮) → RowActionMenu (= 編集 / 削除 2 択、 ADR-0036 D7 整合)
 * - 削除 → ConfirmDialog → deleteCustomSpecies + reload (= bonsai.custom_species_id ON DELETE SET NULL)
 *
 * 模倣 pattern (= Sess91 PR-1 で SoT 化):
 * - src/features/manager-screen/managerScreenStyles.ts (= 3 画面共通 styles SoT)
 * - app/tags.tsx (= rowMain 横並び + rowMainTextWrap 構造)
 * - src/features/recurrence/RecurrenceListScreen.tsx (= kebab + RowActionMenu + ConfirmDialog)
 *
 * 注: master 5 種 (= SPECIES_SEED) は本画面に含めない (= 編集/削除不可、 picker でのみ表示)。
 *     master の存在は user に自明なので、 本画面では custom のみフォーカス。
 */
import { Stack, useFocusEffect, useNavigation, useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { MoreVerticalIcon } from '@/src/components/icons';
import { RowActionMenu, type RowActionMenuItem } from '@/src/components/RowActionMenu';
import { elapsedDaysFromIsoUtc, formatElapsedDays } from '@/src/core/datetime';
import { useTranslation } from '@/src/core/i18n/i18n';
import { useColors } from '@/src/core/theme/useColors';
import {
  deleteCustomSpecies,
  getCustomSpeciesWithStats,
  type CustomSpeciesWithStats,
} from '@/src/db/bonsaiSpeciesCustomRepository';
import { managerScreenStyles as styles } from '@/src/features/manager-screen/managerScreenStyles';

export default function CustomSpeciesManagerScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const c = useColors();
  const [items, setItems] = React.useState<CustomSpeciesWithStats[]>([]);
  const [kebabTarget, setKebabTarget] = React.useState<CustomSpeciesWithStats | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<CustomSpeciesWithStats | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Sess90 PR-A (ADR-0053 Sess90 Amendment、 R-74): 言語切替直後の Stack header transient
  // re-render 漏れ対策 (settings/index.tsx Sess74 PR-3 同型 pattern)。
  React.useEffect(() => {
    navigation.setOptions({ title: t('customSpeciesManagerTitle') });
  }, [navigation, t, lang]);

  const reload = React.useCallback(async () => {
    const rows = await getCustomSpeciesWithStats();
    setItems(rows);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      reload().catch(() => setItems([]));
      setKebabTarget(null);
    }, [reload]),
  );

  const openAdd = () => {
    router.push('/custom-species/edit' as Href);
  };

  const openEdit = (item: CustomSpeciesWithStats) => {
    router.push(
      `/custom-species/edit?id=${encodeURIComponent(item.id)}&initialName=${encodeURIComponent(item.name)}` as Href,
    );
  };

  const handleDeleteRequest = (item: CustomSpeciesWithStats) => {
    setDeleteTarget(item);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteCustomSpecies(deleteTarget.id);
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
          testID: `e2e_custom_species_kebab_edit_${kebabTarget.id}`,
        },
        {
          key: 'delete',
          label: t('rowActionMenuDelete'),
          destructive: true,
          onPress: () => handleDeleteRequest(kebabTarget),
          testID: `e2e_custom_species_kebab_delete_${kebabTarget.id}`,
        },
      ]
    : [];

  const buildStatsLabel = (item: CustomSpeciesWithStats): string => {
    const countLabel = t('customSpeciesUsageCountFormat').replace(
      '{count}',
      String(item.usageCount),
    );
    if (item.usageCount === 0 || item.lastUsedAt == null) {
      return `${countLabel} · ${t('customSpeciesLastUsedNever')}`;
    }
    const days = elapsedDaysFromIsoUtc(item.lastUsedAt);
    if (days === 0) {
      return `${countLabel} · ${t('customSpeciesLastUsedToday')}`;
    }
    const elapsed = formatElapsedDays(days, t) ?? '';
    return `${countLabel} · ${t('customSpeciesLastUsedFormat').replace('{relative}', elapsed)}`;
  };

  const deleteDialogTitle = deleteTarget
    ? t('customSpeciesDeleteConfirmTitle').replace('{name}', deleteTarget.name)
    : '';
  const deleteDialogBody = deleteTarget
    ? deleteTarget.usageCount > 0
      ? t('customSpeciesDeleteImpactBody').replace('{count}', String(deleteTarget.usageCount))
      : t('customSpeciesDeleteConfirmBody')
    : '';

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_custom_species_manager"
    >
      {/* Sess90 PR-A: Stack header title 配線 (= 旧 raw route 名「custom-species」 表示 bug fix)。 */}
      <Stack.Screen options={{ title: t('customSpeciesManagerTitle') }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Sess90 PR-A: body 内 large title (= ThemedText type="title") は Stack header と重複するため削除、
            desc 行のみ keep (= 画面の意図説明として残す)。 */}
        <ThemedText style={[styles.desc, { color: c.textSecondary }]}>
          {t('customSpeciesManagerDesc')}
        </ThemedText>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('customSpeciesAddCta')}
          testID="e2e_custom_species_add_open"
          style={styles.addBtn}
          onPress={openAdd}
        >
          {/* Sess91 PR-1: JSX 側で `+ ` prefix を統一 (= /tags pattern 同型、 i18n 値からは prefix 撤去)。 */}
          <ThemedText style={styles.addBtnText}>+ {t('customSpeciesAddCta')}</ThemedText>
        </Pressable>

        {items.length === 0 && (
          <ThemedText style={[styles.empty, { color: c.textSecondary }]}>
            {t('customSpeciesEmpty')}
          </ThemedText>
        )}

        {items.map((item) => (
          <View
            key={item.id}
            style={[styles.rowWithoutToggle, { backgroundColor: c.surface, borderColor: c.border }]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.name} ${buildStatsLabel(item)}`}
              testID={`e2e_custom_species_row_${item.id}`}
              style={styles.rowMain}
              onPress={() => openEdit(item)}
            >
              {/* Sess91 PR-1: /tags 同型の rowMainTextWrap 構造 (= 長文 name 時 flexShrink で
                   stats と被らない、 PR-3 で master badge 拡張 余地)。 */}
              <View style={styles.rowMainTextWrap}>
                <ThemedText
                  type="defaultSemiBold"
                  style={{ color: c.text }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.name}
                </ThemedText>
              </View>
              <ThemedText
                style={[
                  styles.rowStats,
                  { color: c.textSecondary },
                  item.usageCount === 0 && [styles.rowStatsUnused, { color: c.textMuted }],
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
              testID={`e2e_custom_species_kebab_${item.id}`}
            >
              <MoreVerticalIcon size={20} color={c.textSecondary} />
            </Pressable>
            {/* Sess91 PR-1: 旧 右 ChevronRightIcon (size=16 vestigial 飾り chev) を物理削除。
                 row 主部 tap は既に Pressable で配線済、 削除しても挙動変化なし。 */}
          </View>
        ))}
      </ScrollView>

      <RowActionMenu
        visible={kebabTarget !== null}
        items={kebabItems}
        onDismiss={() => setKebabTarget(null)}
        testID="e2e_custom_species_kebab_menu"
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
        testID="e2e_custom_species_delete_dialog"
      />
    </ThemedView>
  );
}
