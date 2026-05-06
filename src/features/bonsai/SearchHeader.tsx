/**
 * 共通 Header (Claude Design `home-screens.jsx HomeHeader` 整合)。
 *
 * - 左: タイトル「盆栽手帳」(NotoSerifJP 22pt、または任意のタイトル)
 * - 右: 検索ボタン (44×44) + 設定タブ遷移ボタン (Cog 44×44)
 * - 高さ 56、border-bottom 1px
 * - 各タブのヘッダーで利用 (盆栽 / 予定 / 探す / 設定)
 *
 * Issue #255 (ADR-0021 PoC follow-up): Header 右上を Claude Design 整合の
 * Cog (設定タブ遷移) に置換。屋外モード切替は設定タブの Switch UI に集約 (移設済)。
 * OutdoorToggleButton (src/features/theme/) は他画面 (tags / export 系) で引き続き使用。
 */
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { CogIcon, SearchIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/core/i18n/i18n';
import { BORDER_DEFAULT, TEXT_PRIMARY } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';

type Props = {
  title: string;
  /** 検索ボタンを表示するか (default true、検索タブ自身では false 推奨) */
  showSearch?: boolean;
  /** 設定タブ遷移ボタン (Cog) を表示するか (default true、設定タブ自身では false) */
  showSettings?: boolean;
  /** 検索ボタン押下時の遷移先 (default '/search') */
  searchHref?: Href;
  style?: ViewStyle;
  testIdSuffix?: string;
};

export function SearchHeader({
  title,
  showSearch = true,
  showSettings = true,
  searchHref = '/search' as Href,
  style,
  testIdSuffix = 'header',
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useColors();
  // Issue #259: status bar / notch と被らないよう safe-area top inset を吸収
  // (app/_layout.tsx で headerShown:false のため、各タブのコンテンツ側で吸収する必要あり)
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: c.background,
          borderBottomColor: c.border,
          paddingTop: insets.top,
          height: HEADER_BASE_HEIGHT + insets.top,
        },
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
        {showSettings && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('tabSettings')}
            testID={`e2e_${testIdSuffix}_settings`}
            style={styles.iconBtn}
            hitSlop={8}
            onPress={() => router.push('/(tabs)/settings' as Href)}
          >
            <CogIcon size={24} color={c.text} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

// Issue #259: 基本高さ 56 + safe-area top inset を実行時に加算 (component 内 inline)
const HEADER_BASE_HEIGHT = 56;

const styles = StyleSheet.create({
  container: {
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
});
