/**
 * F-08 カスタム樹形管理画面 (Sess89 Phase 3、 ADR-0049 ⑥ Grandfathered 緩 削除/編集 OK の構造実装、
 * Sess91 PR-1 で /tags 同型の row 横並び layout + 共通 managerScreenStyles に統一、
 * Sess91 PR-3 で 左 toggle ▶/▼ + 関連盆栽 inline 展開を /tags Sess9 PR-10 同型で横展開)。
 *
 * 動線: ふりかえりタブ → 「樹形を管理」 card tap → 本画面
 *
 * 責務:
 * - カスタム樹形一覧 (createdAt ASC) + 使用件数 + 最終使用日
 * - 「+ 樹形を追加」 button → /custom-styles/edit (add mode、 JSX 側で `+ ` prefix)
 * - row 主部 tap → /custom-styles/edit?id=xxx&initialName=yyy (edit mode)
 * - kebab (⋮) → RowActionMenu (= 編集 / 削除 2 択、 ADR-0036 D7 整合)
 * - 削除 → ConfirmDialog → deleteCustomStyle + cascade UPDATE bonsai.style = NULL (= 案 c atomic)
 * - **(Sess91 PR-3)** 左端 toggle ▶/▼ tap → 該当樹形を使う盆栽カードを inline 展開
 *   (= 単一展開のみ、 最大 3 件 peek + 「もっと見る (残り N 件)」、 Free 全開放、 style raw text 一致検索)
 *
 * 模倣 pattern (= Sess91 PR-1/PR-3 で SoT 化):
 * - src/features/manager-screen/managerScreenStyles.ts (= 3 画面共通 styles SoT)
 * - app/tags.tsx (= toggle + inline 展開 + rowMain 横並び + kebab Sess9 PR-10 + Sess91 PR-2)
 *
 * 注: master 5 種 (= BONSAI_STYLES) は本画面に含めない (= 編集/削除不可、 picker でのみ表示)。
 *     master の存在は user に自明なので、 本画面では custom のみフォーカス。
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
// Sess66 PR6a: theme-dependent token を inline c.* に。 TEXT_PRIMARY/TEXT_MUTED は JSX inline で利用継続。
import { TEXT_MUTED, TEXT_PRIMARY } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { getAllActiveBonsaiByStyleName } from '@/src/db/bonsaiRepository';
import {
  deleteCustomStyle,
  getCustomStylesWithStats,
  type CustomStyleWithStats,
} from '@/src/db/bonsaiStylesCustomRepository';
import { BonsaiCard, type BonsaiCardData } from '@/src/features/bonsai/BonsaiCard';
import { buildBonsaiCardData } from '@/src/features/bonsai/cardDataBuilder';
import { managerScreenStyles as styles } from '@/src/features/manager-screen/managerScreenStyles';
import { toLocalDateKey } from '@/src/features/watering/dateUtils';

/** Sess91 PR-3: peek 段階で表示する盆栽カード上限 (= /tags Sess9 PR-10 同型、 これを超えると「もっと見る」 link 表示)。 */
const PEEK_LIMIT = 3;

export default function CustomStylesManagerScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const c = useColors();
  const [items, setItems] = React.useState<CustomStyleWithStats[]>([]);
  const [kebabTarget, setKebabTarget] = React.useState<CustomStyleWithStats | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<CustomStyleWithStats | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  // Sess91 PR-3: 単一展開のみ (他樹形 tap で現樹形自動 collapse)、 /tags Sess9 PR-10 同型。
  const [expandedItemId, setExpandedItemId] = React.useState<string | null>(null);
  const [expandAll, setExpandAll] = React.useState(false);
  const [expandedBonsai, setExpandedBonsai] = React.useState<BonsaiCardData[]>([]);
  const [loadingBonsai, setLoadingBonsai] = React.useState(false);

  // Sess90 PR-A (ADR-0053 Sess90 Amendment、 R-74): 言語切替直後の Stack header transient
  // re-render 漏れ対策 (settings/index.tsx Sess74 PR-3 同型 pattern)。
  React.useEffect(() => {
    navigation.setOptions({ title: t('customStylesManagerTitle') });
  }, [navigation, t, lang]);

  const reload = React.useCallback(async () => {
    const rows = await getCustomStylesWithStats();
    setItems(rows);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      reload().catch(() => setItems([]));
      setKebabTarget(null);
      // Sess91 PR-3: focus 復帰時に collapse して整合性確保 (= /tags 同型)。
      setExpandedItemId(null);
      setExpandAll(false);
      setExpandedBonsai([]);
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

  /** Sess91 PR-3: toggle ▶/▼ tap → 該当樹形を使う盆栽 inline 展開 (= 単一展開のみ、 style raw text 一致検索)。 */
  const handleToggle = async (item: CustomStyleWithStats) => {
    if (item.usageCount === 0) return; // 未使用樹形は toggle 無効

    if (expandedItemId === item.id) {
      // 現在展開中の同樹形 → collapse
      setExpandedItemId(null);
      setExpandAll(false);
      setExpandedBonsai([]);
      return;
    }

    // 新規 expand (前樹形自動 collapse 含む)
    setExpandedItemId(item.id);
    setExpandAll(false);
    setLoadingBonsai(true);
    try {
      const tzOffsetMin = getTzOffsetMin();
      const todayLocalKey = toLocalDateKey(nowUtc() as string, tzOffsetMin);
      // 樹形は raw text 一致検索 (= ADR-0026 raw text 設計、 案 c atomic NULL cascade)。
      const bonsai = await getAllActiveBonsaiByStyleName(item.name, lang);
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

  const visibleBonsai = expandAll ? expandedBonsai : expandedBonsai.slice(0, PEEK_LIMIT);
  const remainingCount = expandedBonsai.length - PEEK_LIMIT;

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_custom_styles_manager"
    >
      {/* Sess90 PR-A: Stack header title 配線 (= 旧 raw route 名「custom-styles」 表示 bug fix)。 */}
      <Stack.Screen options={{ title: t('customStylesManagerTitle') }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Sess90 PR-A: body 内 large title (= ThemedText type="title") は Stack header と重複するため削除、
            desc 行のみ keep (= 画面の意図説明として残す)。 */}
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
          {/* Sess91 PR-1: JSX 側で `+ ` prefix を統一 (= /tags pattern 同型、 i18n 値からは prefix 撤去)。 */}
          <ThemedText style={styles.addBtnText}>+ {t('customStylesAddCta')}</ThemedText>
        </Pressable>

        {items.length === 0 && (
          <ThemedText style={[styles.empty, { color: c.textSecondary }]}>
            {t('customStylesEmpty')}
          </ThemedText>
        )}

        {items.map((item) => {
          const isExpanded = expandedItemId === item.id;
          const togglable = item.usageCount > 0;
          return (
            <React.Fragment key={item.id}>
              {/* Sess91 PR-3: rowWithToggle (= padding 4 + 左 toggle area)、 /tags Sess9 PR-10 同型に切替。 */}
              <View
                style={[
                  styles.rowWithToggle,
                  { backgroundColor: c.surface, borderColor: c.border },
                ]}
              >
                {/* Sess91 PR-3: 左端 ▶/▼ toggle area (44 px ヒット領域、 シニア UX、 /tags 同型)。 */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isExpanded ? t('tagsToggleCollapse') : t('tagsToggleExpand')}
                  testID={`e2e_custom_styles_toggle_${item.id}`}
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
                  testID={`e2e_custom_styles_row_${item.id}`}
                  style={styles.rowMain}
                  onPress={() => openEdit(item)}
                >
                  {/* Sess91 PR-1: /tags 同型の rowMainTextWrap 構造 (= 長文 name 時 flexShrink で
                       stats と被らない)。 */}
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
                  testID={`e2e_custom_styles_kebab_${item.id}`}
                >
                  <MoreVerticalIcon size={20} color={c.textSecondary} />
                </Pressable>
              </View>

              {/* Sess91 PR-3: 展開エリア (= 関連盆栽 BonsaiCard inline 表示、 /tags Sess9 PR-10 同型)。 */}
              {isExpanded && (
                <View style={styles.expandedArea} testID={`e2e_custom_styles_expanded_${item.id}`}>
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
                        testID={`e2e_custom_styles_inline_card_${b.id}`}
                      />
                    ))}
                  {!loadingBonsai && remainingCount > 0 && !expandAll && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('tagsMoreLink').replace(
                        '{count}',
                        String(remainingCount),
                      )}
                      testID={`e2e_custom_styles_more_${item.id}`}
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
