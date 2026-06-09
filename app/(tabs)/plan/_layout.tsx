/**
 * 予定タブ Stack (ADR-0020 Phase 5、本 PR は stub)。
 *
 * Phase 5 で Claude Design `care-screens.jsx CalendarScreen` 整合に本実装:
 * - index: 月カレンダー + 当日リスト + FAB「今日の作業を一括記録」
 * - wiring: 針金がけ一覧 (`WiringListScreen`、タブ: すべて/未外し/1週間以内)
 */
import { Stack } from 'expo-router';
import React from 'react';

import { useTranslation } from '@/src/core/i18n/i18n';
// Sess90 PR-A: nested Stack でも font geometry を明示 spread (= root → nested は cascade しない)。
import { screenTitleStack } from '@/src/core/theme/typography';
// Sess90 PR-B: header 背景を c.background (= washi/宵墨 scheme-aware) で SoT 統一。
import { useColors } from '@/src/core/theme/useColors';

export default function PlanStackLayout() {
  const { t } = useTranslation();
  const c = useColors();
  return (
    <Stack
      screenOptions={{
        // Sess90 PR-A: font geometry SoT (R-75)。
        // Sess90 PR-B: header 背景 + tint も明示 (= nested は cascade されない)。
        headerStyle: { backgroundColor: c.background },
        headerTintColor: c.text,
        headerTitleStyle: { color: c.text, ...screenTitleStack },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="wiring"
        options={{
          title: t('stackWireListTitle'),
          headerShown: true,
          headerTitleAlign: 'center',
          // Sess90 PR-A: 旧 fontSize:20 hardcode は削除、 Stack screenOptions の screenTitleStack
          // token (= 18pt) に統一 (ADR-0053 Sess90 Amendment、 R-75)。 経緯コメント無き第三の値。
        }}
      />
    </Stack>
  );
}
