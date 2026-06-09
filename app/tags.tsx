/**
 * F-09 タグ管理画面 (Issue #31 / ADR-0008 + §Notes Amended 2026-05-18)。
 *
 * 範囲:
 * - タグ一覧 (createdAt DESC) + 使用件数 + 最終使用日
 * - 「+ タグを追加」 button → /tag-edit 全画面 (Sess9 PR-3)
 * - row 主部 tap → /tag-edit?tagId=xxx&initialName=yyy 全画面 (旧 Alert.alert 置換)
 * - 左端 toggle ▶/▼ tap → 該当タグの盆栽カードを inline 展開 (Sess9 PR-10、 PR-9 置換)
 *
 * Sess9 進化:
 * - PR-1: event_tags 完全廃止 (dead code、 bonsai_tags 一本化)
 * - PR-3: Alert.alert を自前 tag-edit 全画面に置換
 * - PR-7: 情報設計刷新 — 件数 + 最終使用日
 * - PR-8: rename/削除影響範囲警告 (Linear パターン)
 * - PR-10: row 長押し→画面遷移 (PR-9) を 左端 toggle ▶/▼ + inline 展開 に置換
 *   - 単一展開のみ (他 tag tap で現在 tag は自動 collapse)
 *   - 最大 3 件 + 「もっと見る (残り N 件)」 で全件 inline 展開
 *   - /tag-bonsai-list 全画面廃止 (重複機能削除)
 */
import { Stack, useFocusEffect, useNavigation, useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChevronRightIcon } from '@/src/components/icons';
import { useToastStore } from '@/src/components/Toast';
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
import { getAllActiveBonsaiWithSpecies } from '@/src/db/bonsaiRepository';
import { isPresetTagName } from '@/src/db/seedTagPresets';
import { getTagsWithStats, type TagWithStats } from '@/src/db/tagRepository';
import { BonsaiCard, type BonsaiCardData } from '@/src/features/bonsai/BonsaiCard';
import { buildBonsaiCardData } from '@/src/features/bonsai/cardDataBuilder';
// Sess91 PR-1: 3 画面共通 styles SoT (= /tags、 /custom-species、 /custom-styles)。
// R-76 起票 + ADR-0036 §Notes Amended Sess91 PR-4 で正典化。
import { managerScreenStyles as styles } from '@/src/features/manager-screen/managerScreenStyles';
import { toLocalDateKey } from '@/src/features/watering/dateUtils';

/** Sess9 PR-10: peek 段階で表示する盆栽カード上限 (これを超えると「もっと見る」 link 表示)。 */
const PEEK_LIMIT = 3;

export default function TagsManagerScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const c = useColors();
  const [tags, setTags] = React.useState<TagWithStats[]>([]);

  // Sess90 PR-A (ADR-0053 Sess90 Amendment、 R-74): 言語切替直後の Stack header transient
  // re-render 漏れ対策 (settings/index.tsx Sess74 PR-3 同型 pattern)。
  React.useEffect(() => {
    navigation.setOptions({ title: t('tagsManagerTitle') });
  }, [navigation, t, lang]);
  // Sess9 PR-10: 単一展開のみ (他タグ tap で現タグ自動 collapse)
  const [expandedTagId, setExpandedTagId] = React.useState<string | null>(null);
  const [expandAll, setExpandAll] = React.useState(false);
  const [expandedBonsai, setExpandedBonsai] = React.useState<BonsaiCardData[]>([]);
  const [loadingBonsai, setLoadingBonsai] = React.useState(false);

  const reload = React.useCallback(async () => {
    const rows = await getTagsWithStats();
    setTags(rows);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      reload().catch(() => setTags([]));
      // タグが変更された可能性があるため、 focus 復帰時に collapse して整合性確保
      setExpandedTagId(null);
      setExpandAll(false);
      setExpandedBonsai([]);
    }, [reload]),
  );

  const openAdd = () => {
    router.push('/tag-edit' as Href);
  };

  const openEdit = (tag: TagWithStats) => {
    router.push(
      `/tag-edit?tagId=${encodeURIComponent(tag.id)}&initialName=${encodeURIComponent(tag.name)}` as Href,
    );
  };

  /** Sess9 PR-10: toggle ▶/▼ tap → 該当タグの盆栽 inline 展開 (単一展開のみ)。 */
  const handleToggle = async (tag: TagWithStats) => {
    if (tag.usageCount === 0) return; // 未使用タグは toggle 無効

    if (expandedTagId === tag.id) {
      // 現在展開中の同タグ → collapse
      setExpandedTagId(null);
      setExpandAll(false);
      setExpandedBonsai([]);
      return;
    }

    // 新規 expand (前タグ自動 collapse 含む)
    setExpandedTagId(tag.id);
    setExpandAll(false);
    setLoadingBonsai(true);
    try {
      const tzOffsetMin = getTzOffsetMin();
      const todayLocalKey = toLocalDateKey(nowUtc() as string, tzOffsetMin);
      const bonsai = await getAllActiveBonsaiWithSpecies(lang, { tagIds: [tag.id] });
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

  /**
   * Sess9 PR-7: row right value を「N 件 · 3 日前に使用」 形式で組み立て。
   *
   * - 未使用 (count = 0 or lastUsed null): 「N 件 · 未使用」
   * - 今日使用 (days = 0): 「N 件 · 今日使用」
   * - 過去使用 (days > 0): 「N 件 · 3 日前に使用」
   */
  const buildStatsLabel = (tag: TagWithStats): string => {
    const countLabel = t('tagsUsageCountFormat').replace('{count}', String(tag.usageCount));
    if (tag.usageCount === 0 || tag.lastUsedAt == null) {
      return `${countLabel} · ${t('tagsLastUsedNever')}`;
    }
    const days = elapsedDaysFromIsoUtc(tag.lastUsedAt);
    if (days === 0) {
      return `${countLabel} · ${t('tagsLastUsedToday')}`;
    }
    const elapsed = formatElapsedDays(days, t) ?? '';
    return `${countLabel} · ${t('tagsLastUsedFormat').replace('{relative}', elapsed)}`;
  };

  const visibleBonsai = expandAll ? expandedBonsai : expandedBonsai.slice(0, PEEK_LIMIT);
  const remainingCount = expandedBonsai.length - PEEK_LIMIT;

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_tags_manager"
    >
      {/* Sess90 PR-A: Stack header title 配線 (= 旧 raw route 名「tags」 表示 bug fix)。 */}
      <Stack.Screen options={{ title: t('tagsManagerTitle') }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Sess90 PR-A: body 内 large title (= ThemedText type="title") は Stack header と重複するため削除、
            desc 行のみ keep (= 画面の意図説明として残す)。 */}
        <ThemedText style={[styles.desc, { color: c.textSecondary }]}>
          {t('tagsManagerDesc')}
        </ThemedText>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('tagEditTitleAdd')}
          testID="e2e_tags_add_open"
          style={styles.addBtn}
          onPress={openAdd}
        >
          <ThemedText style={styles.addBtnText}>+ {t('tagEditTitleAdd')}</ThemedText>
        </Pressable>

        {tags.length === 0 && (
          <ThemedText style={[styles.empty, { color: c.textSecondary }]}>
            {t('tagsEmpty')}
          </ThemedText>
        )}

        {tags.map((tg) => {
          const isExpanded = expandedTagId === tg.id;
          const togglable = tg.usageCount > 0;
          // Sess74 PR-2: master preset 一致 → 「マスタ」 badge + 編集ロック
          // (ADR-0049 §Notes Amended / ADR-0026 §Notes Amended)。 rename/削除は不可、
          // tap 時は Toast で説明。 toggle (▶/▼ 展開) は引き続き有効 (使用件数を確認可能)。
          const isMaster = isPresetTagName(tg.nameNormalized);
          return (
            <React.Fragment key={tg.id}>
              <View
                style={[
                  styles.rowWithToggle,
                  { backgroundColor: c.surface, borderColor: c.border },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isExpanded ? t('tagsToggleCollapse') : t('tagsToggleExpand')}
                  testID={`e2e_tags_toggle_${tg.id}`}
                  style={[styles.toggleArea, !togglable && styles.toggleAreaDisabled]}
                  onPress={() => {
                    void handleToggle(tg);
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
                  accessibilityLabel={`${tg.name} ${tg.usageCount}件${isMaster ? ' (マスタ)' : ''}`}
                  accessibilityState={{ disabled: isMaster }}
                  testID={`e2e_tags_row_${tg.id}`}
                  style={styles.rowMain}
                  onPress={() => {
                    if (isMaster) {
                      // Sess74 PR-2: master row は rename/削除不可 → Toast で説明
                      useToastStore.getState().show(t('tagPresetLockedToast'));
                      return;
                    }
                    openEdit(tg);
                  }}
                >
                  <View style={styles.rowMainTextWrap}>
                    <ThemedText type="defaultSemiBold">{tg.name}</ThemedText>
                    {isMaster && (
                      <View
                        style={[styles.masterBadge, { borderColor: c.textMuted }]}
                        testID={`e2e_tags_master_badge_${tg.id}`}
                      >
                        <ThemedText style={[styles.masterBadgeText, { color: c.textMuted }]}>
                          {t('tagPresetBadgeMaster')}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText
                    style={[
                      styles.rowStats,
                      { color: c.textSecondary },
                      tg.usageCount === 0 && [styles.rowStatsUnused, { color: c.textMuted }],
                    ]}
                  >
                    {buildStatsLabel(tg)}
                  </ThemedText>
                </Pressable>
              </View>

              {isExpanded && (
                <View style={styles.expandedArea} testID={`e2e_tags_expanded_${tg.id}`}>
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
                        testID={`e2e_tags_inline_card_${b.id}`}
                      />
                    ))}
                  {!loadingBonsai && remainingCount > 0 && !expandAll && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('tagsMoreLink').replace(
                        '{count}',
                        String(remainingCount),
                      )}
                      testID={`e2e_tags_more_${tg.id}`}
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
    </ThemedView>
  );
}

// Sess91 PR-1: 旧 local StyleSheet は managerScreenStyles に SoT 集約 (R-76 起票、
// ADR-0036 §Notes Amended Sess91 PR-4)。 /tags 専用 styles (toggleArea / masterBadge /
// expandedArea 等) も managerScreenStyles 側で 3 画面共通候補として export。
