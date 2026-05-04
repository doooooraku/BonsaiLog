import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/src/core/i18n/i18n';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const c = Colors[scheme];

  return (
    <Tabs
      screenOptions={{
        // Phase B-1b: tabBar の背景・テキスト・ボーダーを Colors 経由 (design_system.md §2)
        tabBarActiveTintColor: c.tabIconSelected,
        tabBarInactiveTintColor: c.tabIconDefault,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
        tabBarLabelStyle: { color: c.textSecondary },
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="bonsai"
        options={{
          title: '盆栽',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="leaf.fill" color={color} />,
          headerShown: false,
        }}
      />
      {/* F-04 Phase G-2 (Issue #29, ADR-0013 §S26): stats タブ (全盆栽集約モード) */}
      <Tabs.Screen
        name="stats"
        options={{
          title: t('statsTabTitle'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
