/**
 * Tab Layout (ADR-0020 Phase 1: 4 タブ構成)。
 *
 * - 盆栽 (Leaf): 盆栽カード一覧
 * - 予定 (Calendar): 作業予定カレンダー + 針金がけ一覧
 * - ふりかえり (Pencil): CareHub Hub 画面 + 検索 (ADR-0020 §Decision §7、2026-05-10 改訂)
 * - 設定 (Cog): 設定 / Paywall
 */
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CalendarIcon, CogIcon, LeafIcon, PencilNavIcon } from '@/src/components/icons';
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
          tabBarButtonTestID: 'e2e_tab_bonsai',
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: t('tabPlan'),
          tabBarIcon: ({ color }) => <CalendarIcon size={28} color={color} />,
          tabBarButtonTestID: 'e2e_tab_plan',
        }}
      />
      <Tabs.Screen
        name="look-back"
        options={{
          title: t('tabLookBack'),
          tabBarIcon: ({ color }) => <PencilNavIcon size={28} color={color} />,
          tabBarButtonTestID: 'e2e_tab_look_back',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabSettings'),
          tabBarIcon: ({ color }) => <CogIcon size={28} color={color} />,
          tabBarButtonTestID: 'e2e_tab_settings',
        }}
      />
    </Tabs>
  );
}
