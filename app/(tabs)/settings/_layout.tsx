/**
 * 設定タブ Stack (ADR-0020 Phase 7、本 PR は既存 app/settings.tsx の移行)。
 *
 * Phase 7 で Claude Design `monetization-screens.jsx Settings*` 整合に本改修。
 */
import { Stack } from 'expo-router';
import React from 'react';

export default function SettingsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: '設定' }} />
    </Stack>
  );
}
