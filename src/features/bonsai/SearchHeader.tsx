/**
 * 共通 Header (Claude Design `home-screens.jsx HomeHeader` 整合)。
 *
 * - 左: タイトル「盆栽手帳」(NotoSerifJP 22pt、または任意のタイトル)
 * - 中: 「複数選択 / キャンセル」テキストボタン (onSelectPress 指定時のみ、mockup v1.0 02-Home.html 整合)
 * - 右: 検索ボタン (44×44) + 設定タブ遷移ボタン (Cog 44×44)
 * - 高さ 56、border-bottom 1px
 * - 各タブのヘッダーで利用 (盆栽 / 予定 / 探す / 設定)
 *
 * Issue #255 (ADR-0021 PoC follow-up): Header 右上を Claude Design 整合の
 * Cog (設定タブ遷移) に置換。屋外モード切替は設定タブの Switch UI に集約 (移設済)。
 * OutdoorToggleButton (src/features/theme/) は他画面 (tags / export 系) で引き続き使用。
 *
 * 複数選択モード追加 (mockups v1.0 02-Home.html 整合): 盆栽タブで複数選択モードに
 * 入るためのトグル。onPress callback で state 管理は呼び出し側 (bonsai/index.tsx)。
 * 本 PR では state トグルのみ、BonsaiCard チェックボックス・一括タグ付与・一括作業 UI は別 Issue。
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
  /** 複数選択モードの状態 (default false、selectMode 表示色と aria-state 用) */
  selectMode?: boolean;
  /**
   * 複数選択モードトグル callback (undefined ならボタン非表示)。
   * mockups v1.0 02-Home.html の HomeHeader 「複数選択」テキストボタン整合。
   */
  onSelectPress?: () => void;
  /**
   * Issue #346: selectMode 中の選択件数を表示するための件数。
   * - selectMode false: 表示なし
   * - selectMode true && selectedCount > 0: 「N件選択中」(タイトルの代替)
   * - selectMode true && selectedCount === 0: 「項目を選択」(タイトルの代替)
   * mockups v1.0 home-screens.jsx HomeHeader L410-459 整合。
   */
  selectedCount?: number;
  style?: ViewStyle;
  testIdSuffix?: string;
};

export function SearchHeader({
  title,
  showSearch = true,
  showSettings = true,
  searchHref = '/search' as Href,
  selectMode = false,
  onSelectPress,
  selectedCount,
  style,
  testIdSuffix = 'header',
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useColors();
  // Issue #259: status bar / notch と被らないよう safe-area top inset を吸収
  // (app/_layout.tsx で headerShown:false のため、各タブのコンテンツ側で吸収する必要あり)
  const insets = useSafeAreaInsets();

  // Issue #346: selectMode 中はタイトルを件数表示に置換 (mockups v1.0 HomeHeader 整合)。
  // selectedCount が undefined または selectMode false の場合はタイトル維持。
  const displayTitle =
    selectMode && selectedCount !== undefined
      ? selectedCount > 0
        ? t('bulkSelectedCount').replace('{count}', String(selectedCount))
        : t('bulkSelectPlaceholder')
      : title;

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
        {displayTitle}
      </ThemedText>
      <View style={styles.actions}>
        {onSelectPress && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selectMode }}
            accessibilityLabel={selectMode ? t('selectModeCancel') : t('selectModeAction')}
            testID={`e2e_${testIdSuffix}_select_toggle`}
            style={styles.selectBtn}
            hitSlop={8}
            onPress={onSelectPress}
          >
            <ThemedText style={[styles.selectText, { color: c.text }]} numberOfLines={1}>
              {selectMode ? t('selectModeCancel') : t('selectModeAction')}
            </ThemedText>
          </Pressable>
        )}
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
            onPress={() => router.push('/settings' as Href)}
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
  selectBtn: {
    paddingHorizontal: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectText: { fontSize: 14, letterSpacing: 0.3 },
});
