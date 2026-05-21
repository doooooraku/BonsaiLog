/**
 * Tab Layout (ADR-0020 Phase 1: 4 タブ構成 + ADR-0025 Phase 2 案 B FAB 起動)。
 *
 * - 盆栽 (Leaf): 盆栽カード一覧
 * - 予定 (Calendar): 月カレンダー画面 + FAB、 タブ tap で source=tab + 明日 default (ADR-0035 D1/D2)
 * - 記録 (Droplet): タブ tap で予定タブ (= カレンダー画面) + 今日 default に遷移 (ADR-0035 D6、 ADR-0025 §② 案 X revert)
 * - ふりかえり (Pencil): CareHub Hub 画面 + 検索 (ADR-0020 §Decision §7、 2026-05-10 改訂)
 *
 * ADR-0035 D1 + D6 (Sess23 PR-2-1 + PR-2-2):
 * - タブ「カレンダー」 → 「予定」 revert (ADR-0031 D2 取消)、 タブ「予定」 tap で source=tab 付与 → 明日 default
 * - 記録タブ tap = カレンダー画面 (今日 default) 遷移、 旧 modal 起動 (案 X) を revert
 *
 * 実装: React Navigation v7 公式パターン (`<Tabs.Screen listeners>` で screen config 経由、
 * lazy render 制約回避)。
 */
import { Tabs, useRouter, type Href } from 'expo-router';
import React, { useCallback } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { CalendarIcon, DropletIcon, LeafIcon, PencilNavIcon } from '@/src/components/icons';
import { getTzOffsetMin, nowUtc } from '@/src/core/datetime';
import { useTranslation } from '@/src/core/i18n/i18n';
import { toLocalDateKey } from '@/src/features/watering/wateringHeatmap';

export default function TabLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  // Sess6 PR-1: TabBar 強制 light 固定 (user 「ライトモード設定なのに dark」 bug 解消、
  // dark mode 完全対応は Phase C 別 PR で扱う、 ADR-0015 TT2 パターン拡張)。
  const c = Colors.light;

  // ADR-0035 D2 (Sess23 PR-2-1): 予定タブ tap で source=tab 付与 → PlanScreen で明日 default selectedDateKey
  const handlePlanTabPress = useCallback(
    (e: { preventDefault: () => void }) => {
      e.preventDefault();
      router.push('/(tabs)/plan?source=tab' as Href);
    },
    [router],
  );

  // ADR-0035 D6 (Sess23 PR-2-2): 記録タブ tap で予定タブに source=tab + 今日 selectedDateKey で遷移
  // (旧 ADR-0025 §② 案 X modal 直接起動を revert)
  const handleRecordTabPress = useCallback(
    (e: { preventDefault: () => void }) => {
      e.preventDefault();
      const todayKey = toLocalDateKey(nowUtc() as string, getTzOffsetMin());
      router.push(`/(tabs)/plan?source=tab&selectedDateKey=${todayKey}` as Href);
    },
    [router],
  );

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
        listeners={() => ({
          tabPress: handlePlanTabPress,
        })}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: t('tabRecord'),
          tabBarIcon: ({ color }) => <DropletIcon size={28} color={color} />,
          tabBarButtonTestID: 'e2e_tab_record',
        }}
        listeners={() => ({
          tabPress: handleRecordTabPress,
        })}
      />
      <Tabs.Screen
        name="look-back"
        options={{
          title: t('tabLookBack'),
          tabBarIcon: ({ color }) => <PencilNavIcon size={28} color={color} />,
          tabBarButtonTestID: 'e2e_tab_look_back',
        }}
      />
    </Tabs>
  );
}
