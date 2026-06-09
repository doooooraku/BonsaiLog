/**
 * Manager Screen Template (Sess91 PR-4 起票、 R-76 master/custom 管理画面 UI 統一 SoT)。
 *
 * 将来「カスタム肥料」 「カスタム道具」 等の master/custom 領域 を追加する際の copy 雛形。
 * 5 軸 SoT (= R-76) に従って `/tags` / `/custom-species` / `/custom-styles` と同型に実装。
 *
 * 使い方:
 *   1. このファイルを `cp .claude/templates/manager-screen-template.tsx app/custom-<x>.tsx`
 *   2. 全 `Fertilizer` を 新領域名 (例: `Tool`) に置換
 *   3. 全 `fertilizer` (lowercase) を 新領域名 (例: `tool`) に置換
 *   4. 全 `customFertilizer` を `customTool` に置換 (CamelCase)
 *   5. retrieval 関数 (= `getAllActiveBonsaiByCustomFertilizerId`) を `bonsaiRepository.ts` に新規追加
 *   6. ふりかえりタブ Hub card (`app/(tabs)/look-back/index.tsx`) に新 card 追加
 *   7. `scripts/dev/check-manager-screen-symmetry.mjs` の TARGET_FILES に追加
 *   8. i18n 19 言語に `customFertilizerManagerTitle` / `customFertilizerAddCta` / `customFertilizerEmpty` 等 追加
 *
 * 関連 SoT:
 *   - .claude/recurrence-prevention/specialized.md R-76 (= 本テンプレートの根拠 meta-rule)
 *   - docs/adr/ADR-0036-destructive-action-pattern.md §Notes Amended Sess91 PR-4
 *   - src/features/manager-screen/managerScreenStyles.ts (= 3 画面共通 styles SoT)
 *
 * 参照実装 (= 同型 3 画面、 どれもこのテンプレートと同じ構造):
 *   - app/tags.tsx (Sess9 PR-10 + Sess91 PR-2 kebab 配線)
 *   - app/custom-species.tsx (Sess89 PR-2 + Sess91 PR-1/PR-3 統一)
 *   - app/custom-styles.tsx (Sess89 PR-3 + Sess91 PR-1/PR-3 統一)
 */
import { Stack, useFocusEffect, useNavigation, useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { ChevronRightIcon, MoreVerticalIcon } from '@/src/components/icons';
import { RowActionMenu, type RowActionMenuItem } from '@/src/components/RowActionMenu';
import {
  elapsedDaysFromIsoUtc,
  formatElapsedDays,
  getTzOffsetMin,
  nowUtc,
} from '@/src/core/datetime';
import { useTranslation } from '@/src/core/i18n/i18n';
import { TEXT_MUTED, TEXT_PRIMARY } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
// TODO: 新領域用 retrieval 関数を bonsaiRepository.ts に新規追加して import
// import { getAllActiveBonsaiByCustomFertilizerId } from '@/src/db/bonsaiRepository';
// TODO: 新領域用 repository (delete / WithStats) を新規作成して import
// import {
//   deleteCustomFertilizer,
//   getCustomFertilizersWithStats,
//   type CustomFertilizerWithStats,
// } from '@/src/db/bonsaiFertilizerCustomRepository';
import { BonsaiCard, type BonsaiCardData } from '@/src/features/bonsai/BonsaiCard';
import { buildBonsaiCardData } from '@/src/features/bonsai/cardDataBuilder';
import { managerScreenStyles as styles } from '@/src/features/manager-screen/managerScreenStyles';
import { toLocalDateKey } from '@/src/features/watering/dateUtils';

// TODO: 領域固有の型を定義 (= bonsai{Domain}CustomRepository から import 推奨)
type CustomFertilizerWithStats = {
  id: string;
  name: string;
  usageCount: number;
  lastUsedAt: string | null;
};

const PEEK_LIMIT = 3;

export default function CustomFertilizerManagerScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const c = useColors();
  const [items, setItems] = React.useState<CustomFertilizerWithStats[]>([]);
  const [kebabTarget, setKebabTarget] = React.useState<CustomFertilizerWithStats | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<CustomFertilizerWithStats | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [expandedItemId, setExpandedItemId] = React.useState<string | null>(null);
  const [expandAll, setExpandAll] = React.useState(false);
  const [expandedBonsai, setExpandedBonsai] = React.useState<BonsaiCardData[]>([]);
  const [loadingBonsai, setLoadingBonsai] = React.useState(false);

  // R-74 (Stack header transient 漏れ対策、 ADR-0053 Sess90 Amendment) — 必須:
  React.useEffect(() => {
    navigation.setOptions({ title: t('customFertilizerManagerTitle') });
  }, [navigation, t, lang]);

  const reload = React.useCallback(async () => {
    // TODO: 新領域 repository の getXxxWithStats() を呼ぶ
    // const rows = await getCustomFertilizersWithStats();
    // setItems(rows);
    setItems([]);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      reload().catch(() => setItems([]));
      setKebabTarget(null);
      setExpandedItemId(null);
      setExpandAll(false);
      setExpandedBonsai([]);
    }, [reload]),
  );

  const openAdd = () => {
    router.push('/custom-fertilizer/edit' as Href);
  };

  const openEdit = (item: CustomFertilizerWithStats) => {
    router.push(
      `/custom-fertilizer/edit?id=${encodeURIComponent(item.id)}&initialName=${encodeURIComponent(item.name)}` as Href,
    );
  };

  const handleToggle = async (item: CustomFertilizerWithStats) => {
    if (item.usageCount === 0) return;
    if (expandedItemId === item.id) {
      setExpandedItemId(null);
      setExpandAll(false);
      setExpandedBonsai([]);
      return;
    }
    setExpandedItemId(item.id);
    setExpandAll(false);
    setLoadingBonsai(true);
    try {
      const tzOffsetMin = getTzOffsetMin();
      const todayLocalKey = toLocalDateKey(nowUtc() as string, tzOffsetMin);
      // TODO: 新領域 retrieval 関数を呼ぶ
      // const bonsai = await getAllActiveBonsaiByCustomFertilizerId(item.id, lang);
      const bonsai: never[] = [];
      const cards = await Promise.all(
        bonsai.map((b) => buildBonsaiCardData(b, todayLocalKey, tzOffsetMin, t)),
      );
      setExpandedBonsai(cards);
    } catch {
      setExpandedBonsai([]);
    } finally {
      setLoadingBonsai(false);
    }
  };

  const handleCardPress = (bonsaiId: string) => {
    router.push(`/(tabs)/bonsai/${bonsaiId}` as Href);
  };

  const handleDeleteRequest = (item: CustomFertilizerWithStats) => {
    setDeleteTarget(item);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      // TODO: 新領域 delete 関数を呼ぶ (= R-72 整合、 repository 経由必須)
      // await deleteCustomFertilizer(deleteTarget.id);
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
          testID: `e2e_custom_fertilizer_kebab_edit_${kebabTarget.id}`,
        },
        {
          key: 'delete',
          label: t('rowActionMenuDelete'),
          destructive: true,
          onPress: () => handleDeleteRequest(kebabTarget),
          testID: `e2e_custom_fertilizer_kebab_delete_${kebabTarget.id}`,
        },
      ]
    : [];

  const buildStatsLabel = (item: CustomFertilizerWithStats): string => {
    const countLabel = t('customFertilizerUsageCountFormat').replace(
      '{count}',
      String(item.usageCount),
    );
    if (item.usageCount === 0 || item.lastUsedAt == null) {
      return `${countLabel} · ${t('customFertilizerLastUsedNever')}`;
    }
    const days = elapsedDaysFromIsoUtc(item.lastUsedAt);
    if (days === 0) {
      return `${countLabel} · ${t('customFertilizerLastUsedToday')}`;
    }
    const elapsed = formatElapsedDays(days, t) ?? '';
    return `${countLabel} · ${t('customFertilizerLastUsedFormat').replace('{relative}', elapsed)}`;
  };

  const deleteDialogTitle = deleteTarget
    ? t('customFertilizerDeleteConfirmTitle').replace('{name}', deleteTarget.name)
    : '';
  const deleteDialogBody = deleteTarget
    ? deleteTarget.usageCount > 0
      ? t('customFertilizerDeleteImpactBody').replace('{count}', String(deleteTarget.usageCount))
      : t('customFertilizerDeleteConfirmBody')
    : '';

  const visibleBonsai = expandAll ? expandedBonsai : expandedBonsai.slice(0, PEEK_LIMIT);
  const remainingCount = expandedBonsai.length - PEEK_LIMIT;

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_custom_fertilizer_manager"
    >
      <Stack.Screen options={{ title: t('customFertilizerManagerTitle') }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ThemedText style={[styles.desc, { color: c.textSecondary }]}>
          {t('customFertilizerManagerDesc')}
        </ThemedText>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('customFertilizerAddCta')}
          testID="e2e_custom_fertilizer_add_open"
          style={styles.addBtn}
          onPress={openAdd}
        >
          {/* R-76 (e): addBtn JSX 側で `+ ` prefix を統一 (i18n 値からは prefix 撤去)。 */}
          <ThemedText style={styles.addBtnText}>+ {t('customFertilizerAddCta')}</ThemedText>
        </Pressable>

        {items.length === 0 && (
          <ThemedText style={[styles.empty, { color: c.textSecondary }]}>
            {t('customFertilizerEmpty')}
          </ThemedText>
        )}

        {items.map((item) => {
          const isExpanded = expandedItemId === item.id;
          const togglable = item.usageCount > 0;
          return (
            <React.Fragment key={item.id}>
              {/* R-76 (b): rowWithToggle (= 左 toggle area + 横並び layout)。 */}
              <View
                style={[
                  styles.rowWithToggle,
                  { backgroundColor: c.surface, borderColor: c.border },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isExpanded ? t('tagsToggleCollapse') : t('tagsToggleExpand')}
                  testID={`e2e_custom_fertilizer_toggle_${item.id}`}
                  style={[styles.toggleArea, !togglable && styles.toggleAreaDisabled]}
                  onPress={() => {
                    void handleToggle(item);
                  }}
                  disabled={!togglable}
                >
                  <View
                    style={[
                      styles.chevronWrap,
                      { transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] },
                    ]}
                  >
                    <ChevronRightIcon size={18} color={togglable ? TEXT_PRIMARY : TEXT_MUTED} />
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name} ${buildStatsLabel(item)}`}
                  testID={`e2e_custom_fertilizer_row_${item.id}`}
                  style={styles.rowMain}
                  onPress={() => openEdit(item)}
                >
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
                {/* R-76 (c): 右 kebab (⋮) → RowActionMenu (編集 + 削除 2 択)。 */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('rowActionMenuEdit') + ' / ' + t('rowActionMenuDelete')}
                  style={styles.kebabButton}
                  hitSlop={8}
                  onPress={() => setKebabTarget(item)}
                  testID={`e2e_custom_fertilizer_kebab_${item.id}`}
                >
                  <MoreVerticalIcon size={20} color={c.textSecondary} />
                </Pressable>
              </View>

              {/* R-76 (d): inline 関連盆栽展開 (= PEEK_LIMIT=3 + 「もっと見る」)。 */}
              {isExpanded && (
                <View
                  style={styles.expandedArea}
                  testID={`e2e_custom_fertilizer_expanded_${item.id}`}
                >
                  {loadingBonsai && (
                    <ThemedText style={[styles.expandedLoading, { color: c.textSecondary }]}>
                      {t('loading')}
                    </ThemedText>
                  )}
                  {!loadingBonsai &&
                    visibleBonsai.map((b) => (
                      <BonsaiCard
                        key={b.id}
                        data={b}
                        onPress={handleCardPress}
                        testID={`e2e_custom_fertilizer_inline_card_${b.id}`}
                      />
                    ))}
                  {!loadingBonsai && remainingCount > 0 && !expandAll && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('tagsMoreLink').replace(
                        '{count}',
                        String(remainingCount),
                      )}
                      testID={`e2e_custom_fertilizer_more_${item.id}`}
                      style={styles.moreLink}
                      onPress={() => setExpandAll(true)}
                    >
                      <ThemedText style={styles.moreLinkText}>
                        {t('tagsMoreLink').replace('{count}', String(remainingCount))}
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
              )}
            </React.Fragment>
          );
        })}
      </ScrollView>

      <RowActionMenu
        visible={kebabTarget !== null}
        items={kebabItems}
        onDismiss={() => setKebabTarget(null)}
        testID="e2e_custom_fertilizer_kebab_menu"
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
        testID="e2e_custom_fertilizer_delete_dialog"
      />
    </ThemedView>
  );
}
