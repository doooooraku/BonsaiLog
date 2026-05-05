/**
 * 探すタブ Stack (ADR-0020 Phase 6、本 PR は stub)。
 *
 * Phase 6 で Claude Design `care-screens.jsx SearchScreen` 整合に本実装:
 * - 既存 `app/search.tsx` 廃止統合
 * - 検索履歴 + chip + マッチハイライト
 */
import { Stack } from 'expo-router';
import React from 'react';

export default function FindStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: '探す' }} />
    </Stack>
  );
}
