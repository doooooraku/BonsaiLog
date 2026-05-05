import { Stack } from 'expo-router';
import React from 'react';

/**
 * Bonsai タブ内 Stack ナビゲーション (ADR-0020 Phase 2 改修)。
 *
 * Routes:
 * - index: 一覧画面 (Claude Design HomeScreen 整合、SearchHeader 自前で持つので headerShown=false)
 * - new: 新規登録画面 (modal、Phase 3 で create-screens.jsx 整合に改修予定)
 * - [id]: 詳細画面 (Phase 3 で detail-screens.jsx Hero + 3 Tabs 整合に改修予定)
 */
export default function BonsaiStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="new"
        options={{ title: '新規登録', presentation: 'modal', headerShown: true }}
      />
      <Stack.Screen name="[id]" options={{ title: '盆栽の詳細', headerShown: true }} />
    </Stack>
  );
}
