/**
 * 共通 Header (Claude Design `home-screens.jsx HomeHeader` 整合)。
 *
 * - 左: タイトル「盆栽手帳」(NotoSerifJP 22pt、または任意のタイトル)
 * - 右: 検索ボタン (44×44) + 屋外モードトグル (44×44) + 任意で追加ボタン
 * - 高さ 56、border-bottom 1px
 * - 各タブのヘッダーで利用 (盆栽 / 予定 / 探す / 設定)
 */
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SearchIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/core/i18n/i18n';
import { ACCENT_GOLD, BORDER_DEFAULT, TEXT_PRIMARY } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { useSettingsStore } from '@/src/stores/settingsStore';

type Props = {
  title: string;
  /** 検索ボタンを表示するか (default true、検索タブ自身では false 推奨) */
  showSearch?: boolean;
  /** 屋外モードトグルを表示するか (default true) */
  showOutdoor?: boolean;
  /** 検索ボタン押下時の遷移先 (default '/search') */
  searchHref?: Href;
  style?: ViewStyle;
  testIdSuffix?: string;
};

export function SearchHeader({
  title,
  showSearch = true,
  showOutdoor = true,
  searchHref = '/search' as Href,
  style,
  testIdSuffix = 'header',
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const outdoorMode = useSettingsStore((s) => s.outdoorMode);
  const setOutdoorMode = useSettingsStore((s) => s.setOutdoorMode);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: c.background, borderBottomColor: c.border },
        style,
      ]}
    >
      <ThemedText
        style={[styles.title, { color: c.text }]}
        numberOfLines={1}
        testID={`e2e_${testIdSuffix}_title`}
      >
        {title}
      </ThemedText>
      <View style={styles.actions}>
        {showSearch && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('searchAction')}
            testID={`e2e_${testIdSuffix}_search`}
            style={styles.iconBtn}
            hitSlop={8}
            onPress={() => router.push(searchHref)}
          >
            <SearchIcon size={24} color={c.text} />
          </Pressable>
        )}
        {showOutdoor && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('outdoorModeToggleA11y')}
            accessibilityState={{ selected: outdoorMode }}
            testID={`e2e_${testIdSuffix}_outdoor_toggle`}
            style={[styles.iconBtn, outdoorMode && styles.iconBtnActive]}
            hitSlop={8}
            onPress={() => setOutdoorMode(!outdoorMode)}
          >
            <ThemedText style={styles.outdoorIcon}>{outdoorMode ? '🌞' : '☀️'}</ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
  },
  title: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 22,
    letterSpacing: 0.9,
    color: TEXT_PRIMARY,
    flex: 1,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  iconBtnActive: { backgroundColor: ACCENT_GOLD },
  outdoorIcon: { fontSize: 20, lineHeight: 24 },
});
