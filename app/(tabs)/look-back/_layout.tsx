/**
 * ふりかえりタブ Stack。
 *
 * ADR-0020 §Decision §7 (2026-05-10 改訂、T1-8c) 整合:
 * - index: CareHub 3 カード Hub (水やり履歴 / 針金がけ一覧 / 盆栽を検索)
 * - search: 盆栽検索 sub-route (旧 find/index.tsx の検索ロジックを移植)
 */
import { Stack } from 'expo-router';
import React from 'react';

export default function LookBackStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ headerShown: false }} />
    </Stack>
  );
}
