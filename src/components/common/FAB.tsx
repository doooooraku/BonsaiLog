/**
 * 共通 FAB (Floating Action Button) component (ADR-0042 D3 / Sess36 PR-3 新設)。
 *
 * 全 4 画面 (盆栽 tab / 予定 tab / 記録 tab / bonsai-detail history+timeline) で
 * 共通使用。 SoT は本 component + design_system.md §FAB (PR-4 で追記)。
 *
 * 設計判断 (ADR-0042 D3):
 * - **right: 20** (旧 inline は 16、 16 → 20 で +4px = 8px grid 整合 + 端からの誤タップ余裕)
 * - **bottom 計算**: `tabBarHeight + (showAdBanner ? AD_BANNER_HEIGHT_APPROX : 0) + insets.bottom + 16`
 *   - `useBottomTabBarHeight()` (expo-router) で tab bar 高さ動的取得
 *   - `useSafeAreaInsets()` (react-native-safe-area-context) で iOS Home Indicator (34pt) /
 *     Android gesture nav 帯を反映 (旧 bonsai-detail は `bottom: 24` 固定で SafeArea 無視
 *     の bug あり、 本 component で恒久解消)
 *   - showAdBanner=true 時 (盆栽 tab のみ) は広告 banner 上に FAB を配置
 * - **size 56×56dp** (Material 3 FAB 標準、 WCAG 2.2 SC 2.5.8 minTarget 44dp を余裕クリア)
 * - **bg**: `BRAND_GREEN` (disabled 時 `TEXT_MUTED`)
 * - **icon default**: `<PlusIcon size={28} color={ON_BRAND} />`
 *   (旧 bonsai-detail は `<ThemedText>+</ThemedText>` 文字列で実装されていた不整合を統一)
 * - **shadow + elevation**: 既存 inline 値を踏襲、 全画面で統一
 */
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlusIcon } from '@/src/components/icons';
import { BRAND_GREEN, ON_BRAND, TEXT_MUTED } from '@/src/core/theme/colors';

/** AdBanner の概算高さ (INLINE_ADAPTIVE_BANNER + maxHeight=90、 Repolog 同等)。 */
const AD_BANNER_HEIGHT_APPROX = 60;

export type FABProps = {
  onPress: () => void;
  /** A11y label。 i18n key 解決後の文字列を渡す。 */
  accessibilityLabel: string;
  /** Maestro E2E 用 testID。 全 FAB 必須。 */
  testID: string;
  /** icon。 default は `<PlusIcon size={28} color={ON_BRAND} />`。 */
  icon?: React.ReactNode;
  /**
   * 盆栽 tab など AdBanner と併用する画面では true。
   * default false。 true 時は bottom 計算に AD_BANNER_HEIGHT_APPROX を加算。
   */
  showAdBanner?: boolean;
  /**
   * disabled state (CalendarTabScreen plan mode の過去日選択時など)。
   * default false。 true 時は bg=TEXT_MUTED + opacity 0.5 + shadow なし。
   */
  disabled?: boolean;
};

export function FAB({
  onPress,
  accessibilityLabel,
  testID,
  icon,
  showAdBanner = false,
  disabled = false,
}: FABProps) {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

  const bottom = tabBarHeight + (showAdBanner ? AD_BANNER_HEIGHT_APPROX : 0) + insets.bottom + 16;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={[
        styles.fab,
        {
          backgroundColor: disabled ? TEXT_MUTED : BRAND_GREEN,
          bottom,
        },
        disabled && styles.fabDisabled,
      ]}
      onPress={onPress}
      testID={testID}
    >
      {icon ?? <PlusIcon size={28} color={ON_BRAND} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabDisabled: { opacity: 0.5, elevation: 0, shadowOpacity: 0 },
});
