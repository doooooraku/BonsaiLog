/**
 * Tab Layout (ADR-0020 Phase 1: 4 タブ構成 + ADR-0025 Phase 2 案 B FAB 起動 + 案 X 記録タブ部分回帰)。
 *
 * - 盆栽 (Leaf): 盆栽カード一覧
 * - 予定 (Calendar): 月カレンダー画面 + FAB → bulk-schedule (案 B)
 * - 記録 (Droplet): **タブ tap で intercept → 直接 bonsai-multi-select modal 起動** (案 X、 2026-05-18 Sess8 PR-3)
 * - ふりかえり (Pencil): CareHub Hub 画面 + 検索 (ADR-0020 §Decision §7、 2026-05-10 改訂)
 *
 * ADR-0025 §② Notes Amended (2026-05-18 Sess8 PR-3):
 * 記録タブのみ案 A (タブ tap intercept) に部分回帰、 予定タブは案 B (画面 + FAB) 維持の非対称設計。
 * user 真意「empty hub 不要、 タブ tap で直接 modal」 整合。
 *
 * 実装: React Navigation v7 公式パターン (`<Tabs.Screen listeners>` で screen config 経由、
 * lazy render 制約回避)。 件数分岐 (0/1/2+ 件) は useBulkActionFlow で集約。
 */
import { Tabs } from 'expo-router';
import React, { useCallback } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { CalendarIcon, DropletIcon, LeafIcon, PencilNavIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/core/i18n/i18n';
import { getAllActiveBonsai } from '@/src/db/bonsaiRepository';
import { useBulkActionFlow } from '@/src/features/event/useBulkActionFlow';

export default function TabLayout() {
  const { t } = useTranslation();
  // Sess6 PR-1: TabBar 強制 light 固定 (user 「ライトモード設定なのに dark」 bug 解消、
  // dark mode 完全対応は Phase C 別 PR で扱う、 ADR-0015 TT2 パターン拡張)。
  const c = Colors.light;

  // ADR-0025 案 X (2026-05-18): 記録タブ tap intercept で直接 bonsai-multi-select modal 起動。
  const { startBulkAction: startRecordAction } = useBulkActionFlow('log');

  const handleRecordTabPress = useCallback(
    async (e: { preventDefault: () => void }) => {
      e.preventDefault();
      const bonsais = await getAllActiveBonsai();
      startRecordAction(bonsais.map((b) => ({ id: b.id, name: b.name })));
    },
    [startRecordAction],
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
          title: t('tabCalendar'),
          tabBarIcon: ({ color }) => <CalendarIcon size={28} color={color} />,
          tabBarButtonTestID: 'e2e_tab_plan',
        }}
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
