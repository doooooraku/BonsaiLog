/**
 * Tab Layout (ADR-0020 Phase 1: 4 タブ構成 + ADR-0025 Phase 2 案 B FAB 起動)。
 *
 * - 盆栽 (Leaf): 盆栽カード一覧
 * - 予定 (Calendar): 月カレンダー画面 (PlanScreen) + FAB「予定追加」 flow、 タブ tap で source=tab + 明日 default (ADR-0035 D1/D2)
 * - 記録 (Notebook): 月カレンダー画面 (RecordTabScreen) + FAB「作業を記録」 flow、 タブ tap で今日 default (ADR-0038 D1)。 ADR-0042 D2 で icon を Droplet (mockup HI.Droplet = EventIcons watering 用 size override 兼用) → Notebook (14 種別記録象徴の帳簿型) に変更
 * - ふりかえり (Pencil): CareHub Hub 画面 + 検索 (ADR-0020 §Decision §7、 2026-05-10 改訂)
 *
 * Sess29 ADR-0038 D1 (本 PR): 旧 handleRecordTabPress (Sess23 ADR-0035 D6 で予定タブに統合) を撤去、
 * 記録タブは RecordTabScreen 独立画面に移行 (タブハイライト整合 + FAB 動作整合)。
 *
 * 実装: React Navigation v7 公式パターン (`<Tabs.Screen listeners>` で screen config 経由、
 * lazy render 制約回避)。
 */
import { Tabs, useRouter, type Href } from 'expo-router';
import React, { useCallback } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { BonsaiIcon, CalendarIcon, NotebookIcon, PencilNavIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/core/i18n/i18n';
import { useColors } from '@/src/core/theme/useColors';

export default function TabLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  // Sess69 PR-B: Sess6 PR-1 leftover (`const c = Colors.light` 強制 light 固定) 解消。
  // 60+ session 放置されていた技術的負債、 ADR-0052 Amendment (Sess69 PR-A) で
  // 「Colors.light literal を app/** で禁止」 を明文化、 cascade pattern に合流。
  // useColors hook が themeMode (system/light/dark) + OS appearance を resolveEffectiveScheme で
  // 統合済みなので、 Sess6 PR-1 の「light mode 設定なのに dark」 bug は再発しない。
  const c = useColors();

  // ADR-0035 D2 (Sess23 PR-2-1): 予定タブ tap で source=tab 付与 → PlanScreen で明日 default selectedDateKey
  const handlePlanTabPress = useCallback(
    (e: { preventDefault: () => void }) => {
      e.preventDefault();
      router.push('/(tabs)/plan?source=tab' as Href);
    },
    [router],
  );

  // Sess29 ADR-0038 D1: 旧 handleRecordTabPress 撤去。 記録タブは RecordTabScreen 独立画面で
  // 通常 tab navigation、 タブハイライト「記録」 自然遷移、 FAB「作業を記録」 flow 起動。

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
          tabBarIcon: ({ color }) => <BonsaiIcon size={28} color={color} />,
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
          tabBarIcon: ({ color }) => <NotebookIcon size={28} color={color} />,
          tabBarButtonTestID: 'e2e_tab_record',
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
    </Tabs>
  );
}
