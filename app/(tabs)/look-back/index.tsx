/**
 * ふりかえりタブ index = CareHub Hub 画面 (3 カード)。
 *
 * ADR-0039 (Sess31 PR-B、 F-04 水やりヒートマップ撤廃) で「水やり履歴」 card 削除、 4→3 card。
 * ADR-0020 §Decision §7 (2026-05-10 改訂、T1-8c) + §Notes Amended (2026-05-18、 Sess9 PR-6) +
 * Sess23 ADR-0035 D9 (Sess22 PR-4-1 #714「カレンダー」 5 card 化を完全 revert、 5→4 card に戻し)。
 *
 * 3 カード (Sess31 状態):
 * 1. 針金がけ一覧 → /(tabs)/plan/wiring (既存)
 * 2. 盆栽を検索 → /(tabs)/look-back/search (T1-8c で sub-route 化)
 * 3. タグを管理 → /tags (Sess9 PR-6 新規追加、 設定 row も併存維持)
 *
 * 動線整合 (BonsaiLog-Flow.html v1.10):
 * - 経路 1 (高速): Home Header 検索 → /(tabs)/look-back/search (1 タップ)
 * - 経路 2 (Hub): TabBar ふりかえり → 本画面 → 盆栽を検索カード → search (3 タップ)
 * - 経路 3 (Sess9 PR-6 新規): TabBar ふりかえり → 本画面 → タグを管理カード → tags (3 タップ)
 *
 * Sess31 ADR-0039 削除済: 「水やり履歴」 card (横断 watering history 画面遷移)。
 * user 判断「水やりは土の湿り気・天気・気温・湿度依存で履歴可視化は意思決定価値なし、 ADR-0011
 * 『記録のみ』 哲学整合」、 同時に WateringHeatmap / CrossWateringCalendar / WateringDayDetail
 * 経路の画面群を全削除。
 *
 * Sess23 ADR-0035 D9 削除済: 「カレンダー」 card (過去 30 日 default deep link)。
 * user 真意「別にタブバー記録から確認すればいいのだから不要」、 ADR-0035 D6 (記録タブ tap →
 * カレンダー画面遷移) で hub 経由は二重動線。
 */
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  ChevronRightIcon,
  DownloadIcon,
  RepeatIcon,
  SearchIcon,
  SproutIcon,
  StyleIcon,
  TagIcon,
  WireIcon,
} from '@/src/components/icons';
import { useTranslation } from '@/src/core/i18n/i18n';
import { useColors } from '@/src/core/theme/useColors';
import { SearchHeader } from '@/src/features/bonsai/SearchHeader';

type CardDef = {
  key: 'wiring' | 'search' | 'tags' | 'species' | 'styles' | 'recurring' | 'export';
  title: string;
  desc: string;
  Icon: typeof WireIcon;
  onPress: () => void;
  /** Pro 限定機能の card に PRO バッジを出す (押下後 Paywall の混乱防止)。 */
  pro?: boolean;
};

export default function LookBackHubScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const router = useRouter();

  const cards: readonly CardDef[] = [
    // Sess31 ADR-0039: 「水やり履歴」 card 削除 (user 判断「履歴可視化に価値なし」、
    // WateringHeatmap / CrossWateringCalendar / WateringDayDetail 画面群を全削除)。
    // Sess23 ADR-0035 D9: Sess22 PR-4-1 #714「カレンダー」 5 card 化を完全 revert
    // (user 真意「別にタブバー記録から確認すればいいのだから不要」)
    {
      key: 'wiring',
      title: t('lookBackCardWiringTitle'),
      desc: t('lookBackCardWiringDesc'),
      Icon: WireIcon,
      onPress: () => router.push('/(tabs)/plan/wiring' as Href),
    },
    {
      key: 'search',
      title: t('lookBackCardSearchTitle'),
      desc: t('lookBackCardSearchDesc'),
      Icon: SearchIcon,
      onPress: () => router.push('/(tabs)/look-back/search' as Href),
    },
    // Sess9 PR-6 (ADR-0020 §Notes Amended 2026-05-18、 user 真意 Q1 H1): 「タグを管理」 4 カード目。
    // mockup CareHubScreen には未掲載だが「ふりかえり = 振り返り + 整理」 と意義拡張。
    // 設定 row も併存維持 (高橋ペルソナの既存習慣尊重 + discoverability 最大化)。
    {
      key: 'tags',
      title: t('lookBackCardTagsTitle'),
      desc: t('lookBackCardTagsDesc'),
      Icon: TagIcon,
      onPress: () => router.push('/tags' as Href),
    },
    // Sess81 PR-7.5 (ADR-0035 D9 部分 revert、 ADR-0056 D R-67): 「🔁 定期予定を管理」 5 カード目。
    // Sess23 D9 真因 (= 「カレンダー card 重複動線」) に抵触しない (= 定期予定管理は tab で
    // 賄えない新画面、 重複動線にならない)。 タブ名「ふりかえり」 keep (Sess80-Sess81 Q1=B 確定)。
    {
      key: 'recurring',
      title: t('recurringHubCardTitle'),
      desc: t('recurringHubCardDesc'),
      Icon: RepeatIcon,
      onPress: () => router.push('/recurring-rules' as Href),
    },
    // Sess89 Phase 2 (ADR-0049 ⑥ Grandfathered 緩 削除/編集 OK の構造実装): カスタム樹種を管理 6 カード目。
    // タグ管理 (Sess9 PR-6) と同型、 custom 樹種の add/rename/delete (= master 5 種は不変、 picker でのみ表示)。
    {
      key: 'species',
      title: t('lookBackCardSpeciesTitle'),
      desc: t('lookBackCardSpeciesDesc'),
      Icon: SproutIcon,
      onPress: () => router.push('/custom-species' as Href),
    },
    // Sess89 Phase 3 (ADR-0049 ⑥): カスタム樹形を管理 7 カード目 (= 樹種と同型 + 案 c atomic NULL cascade)。
    // 削除時に bonsai.style raw text の orphan cleanup を deleteCustomStyle 関数内で atomic 実行。
    {
      key: 'styles',
      title: t('lookBackCardStylesTitle'),
      desc: t('lookBackCardStylesDesc'),
      Icon: StyleIcon,
      onPress: () => router.push('/custom-styles' as Href),
    },
    // Sess49 追補3: エクスポート動線 (設定からのみ → 発見性向上)。Pro 限定のため PRO バッジ。
    {
      key: 'export',
      title: t('lookBackCardExportTitle'),
      desc: t('lookBackCardExportDesc'),
      Icon: DownloadIcon,
      onPress: () => router.push('/export' as Href),
      pro: true,
    },
  ];

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_look_back_hub"
    >
      <SearchHeader title={t('tabLookBack')} testIdSuffix="look_back" showSearch={false} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Sess65: subtitle/cardDesc/icon/chevron/proBadge の static 色 (TEXT_SECONDARY/BRAND_GREEN/TEXT_MUTED/TEXT_PRIMARY)
            を useColors 経由化。 dark mode で 4 card の発見性ゼロ問題 (ユーザー報告 #1) の根本修正。
            icon は c.tint (dark で brandGreen `#6B9B7F` に明色化) で contrast 確保。 */}
        <ThemedText style={[styles.subtitle, { color: c.textSecondary }]}>
          {t('lookBackHubSubtitle')}
        </ThemedText>

        {cards.map((card) => (
          <Pressable
            key={card.key}
            accessibilityRole="button"
            accessibilityLabel={card.title}
            testID={`e2e_look_back_card_${card.key}`}
            style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={card.onPress}
          >
            <View
              style={[styles.iconBox, { backgroundColor: c.background, borderColor: c.border }]}
            >
              {/* Sess92 PR-2: RepeatIcon は default strokeWidth 2 (= EventRow inline 14px 用)、
                  hub 22px では他 icon (1.5) と統一感確保のため 1.5 override */}
              {card.key === 'recurring' ? (
                <RepeatIcon size={22} color={c.tint} strokeWidth={1.5} />
              ) : (
                <card.Icon size={22} color={c.tint} />
              )}
            </View>
            <View style={styles.cardBody}>
              <View style={styles.titleRow}>
                <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
                  {card.title}
                </ThemedText>
                {card.pro ? (
                  <View style={styles.proBadge}>
                    <ThemedText style={[styles.proBadgeText, { color: c.text }]}>
                      {t('proBadgeShort')}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
              <ThemedText style={[styles.cardDesc, { color: c.textSecondary }]}>
                {card.desc}
              </ThemedText>
            </View>
            <ChevronRightIcon size={20} color={c.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingTop: 24, paddingBottom: 96, gap: 12 },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 76,
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
  cardTitle: { fontSize: 17 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  proBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(198,158,72,0.18)',
  },
  proBadgeText: { fontSize: 9, letterSpacing: 0.6, fontWeight: '600' },
});
