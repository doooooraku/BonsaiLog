/**
 * ふりかえりタブ index = CareHub Hub 画面 (3 カード)。
 *
 * ADR-0020 §Decision §7 (2026-05-10 改訂、T1-8c) 整合実装。
 * mockup `docs/mockups/v1.0/wireframes/care-screens.jsx CareHubScreen` (L1576-1719) を移植。
 *
 * 3 カード:
 * 1. 水やり履歴 → /(tabs)/look-back/watering-history (Issue #361 で本実装)
 * 2. 針金がけ一覧 → /(tabs)/plan/wiring (既存)
 * 3. 盆栽を検索 → /(tabs)/look-back/search (T1-8c で sub-route 化)
 *
 * 動線整合 (BonsaiLog-Flow.html v1.10):
 * - 経路 1 (高速): Home Header 検索 → /(tabs)/look-back/search (1 タップ)
 * - 経路 2 (Hub): TabBar ふりかえり → 本画面 → 盆栽を検索カード → search (3 タップ)
 */
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChevronRightIcon, DropletIcon, SearchIcon, WireIcon } from '@/src/components/icons';
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
  key: 'watering' | 'wiring' | 'search';
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
  ];

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_look_back_hub"
    >
      <SearchHeader
        title={t('tabLookBack')}
        testIdSuffix="look_back"
        showSearch={false}
        showSettings={false}
      />

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
