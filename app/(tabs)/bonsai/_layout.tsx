import { Stack } from 'expo-router';
import React from 'react';

/**
 * Bonsai タブ内 Stack ナビゲーション (P2-01 PR-D)。
 *
 * Routes:
 * - index: 一覧画面
 * - new: 新規登録画面
 * - [id]: 詳細画面
 *
 * F-15 連動 (ADR-0015): ヘッダーは expo-router 標準、Tamagui themes 配線は v1.x。
 */
export default function BonsaiStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: '盆栽' }} />
      <Stack.Screen name="new" options={{ title: '新規登録', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: '盆栽の詳細' }} />
    </Stack>
  );
}
