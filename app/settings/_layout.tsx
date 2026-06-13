/**
 * 設定タブ Stack (ADR-0020 Phase 7、 Sess66 PR5 で Stack native header 化)。
 *
 * Sess66 PR5 (ADR-0053 起票): settings/index.tsx を SearchHeader showBack 自前 →
 * Expo Stack native header に統一。 root Stack screenOptions (useColors 整合) を
 * 継承するため screenOptions を本 _layout でも明示。
 */
import { Stack } from 'expo-router';

import { useColors } from '@/src/core/theme/useColors';
// Sess90 PR-A: font geometry SoT 化 (ADR-0053 Sess90 Amendment、 R-75)。
// 旧 hardcode `fontFamily: 'NotoSerifJP_500Medium'` は screenTitleStack token に置換、
// root と同一値で SoT 一元化。 root screenOptions は settings sub-tree には cascade しない
// (= root が name="settings" screen 自体に headerShown:false 付与しているため) ので、
// settings nested layout でも明示的に token spread が必要。
import { screenTitleStack } from '@/src/core/theme/typography';

export default function SettingsStackLayout() {
  const c = useColors();
  return (
    <Stack
      screenOptions={{
        // Sess66 PR5: NotoSerifJP + dark cascade 対応 (root Stack と同 pattern)。
        // Sess90 PR-B: header 背景を c.surface → c.background に統一 (= タブ画面 SearchHeader と同色、
        // ADR-0053 Sess90 PR-B Amendment)。 scheme-aware: light=washi / dark=宵墨 自動切替。
        headerStyle: { backgroundColor: c.background },
        headerTintColor: c.text,
        headerTitleStyle: { color: c.text, ...screenTitleStack },
        contentStyle: { backgroundColor: c.background },
      }}
    />
  );
}
