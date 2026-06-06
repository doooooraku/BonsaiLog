/**
 * 設定タブ Stack (ADR-0020 Phase 7、 Sess66 PR5 で Stack native header 化)。
 *
 * Sess66 PR5 (ADR-0053 起票): settings/index.tsx を SearchHeader showBack 自前 →
 * Expo Stack native header に統一。 root Stack screenOptions (useColors 整合) を
 * 継承するため screenOptions を本 _layout でも明示。
 */
import { Stack } from 'expo-router';
import React from 'react';

import { useColors } from '@/src/core/theme/useColors';

export default function SettingsStackLayout() {
  const c = useColors();
  return (
    <Stack
      screenOptions={{
        // Sess66 PR5: NotoSerifJP + dark cascade 対応 (root Stack と同 pattern)。
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.text,
        headerTitleStyle: { color: c.text, fontFamily: 'NotoSerifJP_500Medium' },
        contentStyle: { backgroundColor: c.background },
      }}
    />
  );
}
