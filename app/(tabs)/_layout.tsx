/**
 * Tab Layout (ADR-0020 Phase 1: 4 タブ構成)。
 *
 * - 盆栽 (Leaf): 盆栽カード一覧 (ADR-0020 Phase 2 で Claude Design HomeScreen 整合)
 * - 予定 (Calendar): 作業予定カレンダー + 針金がけ一覧 (ADR-0020 Phase 5)
 * - 探す (Compass): 検索 (ADR-0020 Phase 6 で既存 app/search.tsx 廃止統合)
 * - 設定 (Cog): 設定 / Paywall (ADR-0020 Phase 7 で Claude Design Settings* 整合)
 *
 * Issue #29 (F-04 統計タブ) は ADR-0020 で close 解除、集約モード K2 達成率は廃止、
 * 個別ヒートマップは盆栽詳細画面 (Phase 3) に移動。
 */
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CalendarIcon, CogIcon, CompassNavIcon, LeafIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/core/i18n/i18n';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const c = Colors[scheme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.tabIconSelected,
        tabBarInactiveTintColor: c.tabIconDefault,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
        tabBarLabelStyle: { color: c.textSecondary },
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="bonsai"
        options={{
          title: t('tabBonsai'),
          tabBarIcon: ({ color }) => <LeafIcon size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: t('tabPlan'),
          tabBarIcon: ({ color }) => <CalendarIcon size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="find"
        options={{
          title: t('tabFind'),
          tabBarIcon: ({ color }) => <CompassNavIcon size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabSettings'),
          tabBarIcon: ({ color }) => <CogIcon size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}
