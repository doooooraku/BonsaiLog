/**
 * ふりかえりタブ index = CareHub Hub 画面 (4 カード)。
 *
 * ADR-0020 §Decision §7 (2026-05-10 改訂、T1-8c) + §Notes Amended (2026-05-18、 Sess9 PR-6) +
 * Sess23 ADR-0035 D9 (Sess22 PR-4-1 #714「カレンダー」 5 card 化を完全 revert、 5→4 card に戻し)。
 *
 * 4 カード (Sess23 状態):
 * 1. 水やり履歴 → /(tabs)/look-back/watering-history (Issue #361 で本実装)
 * 2. 針金がけ一覧 → /(tabs)/plan/wiring (既存)
 * 3. 盆栽を検索 → /(tabs)/look-back/search (T1-8c で sub-route 化)
 * 4. タグを管理 → /tags (Sess9 PR-6 新規追加、 設定 row も併存維持)
 *
 * 動線整合 (BonsaiLog-Flow.html v1.10):
 * - 経路 1 (高速): Home Header 検索 → /(tabs)/look-back/search (1 タップ)
 * - 経路 2 (Hub): TabBar ふりかえり → 本画面 → 盆栽を検索カード → search (3 タップ)
 * - 経路 3 (Sess9 PR-6 新規): TabBar ふりかえり → 本画面 → タグを管理カード → tags (3 タップ)
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
  DropletIcon,
  SearchIcon,
  TagIcon,
  WireIcon,
} from '@/src/components/icons';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_PRIMARY,
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  TEXT_MUTED,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { SearchHeader } from '@/src/features/bonsai/SearchHeader';

type CardDef = {
  key: 'watering' | 'wiring' | 'search' | 'tags';
  title: string;
  desc: string;
  Icon: typeof DropletIcon;
  onPress: () => void;
};

export default function LookBackHubScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const router = useRouter();

  const cards: readonly CardDef[] = [
    {
      key: 'watering',
      title: t('lookBackCardWateringTitle'),
      desc: t('lookBackCardWateringDesc'),
      Icon: DropletIcon,
      onPress: () => router.push('/(tabs)/look-back/watering-history' as Href),
    },
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
  ];

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_look_back_hub"
    >
      <SearchHeader title={t('tabLookBack')} testIdSuffix="look_back" showSearch={false} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText style={styles.subtitle}>{t('lookBackHubSubtitle')}</ThemedText>

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
              <card.Icon size={22} color={BRAND_GREEN} />
            </View>
            <View style={styles.cardBody}>
              <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
                {card.title}
              </ThemedText>
              <ThemedText style={styles.cardDesc}>{card.desc}</ThemedText>
            </View>
            <ChevronRightIcon size={20} color={TEXT_MUTED} />
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
    color: TEXT_SECONDARY,
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
    backgroundColor: BG_SURFACE,
    borderColor: BORDER_DEFAULT,
    minHeight: 76,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: BG_PRIMARY,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: { flex: 1, minWidth: 0, gap: 2 },
  cardTitle: { fontSize: 17 },
  cardDesc: { fontSize: 13, color: TEXT_SECONDARY, lineHeight: 18 },
});
