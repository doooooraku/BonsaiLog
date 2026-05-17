/**
 * 記録タブ Stack (ADR-0025、 Sess7 PR-1 で新設 stub)。
 *
 * Phase 1b (本 PR、 Sess7 PR-1): stub 画面のみ (Empty State + 「Phase 2 で action 起動実装予定」 説明)
 * Phase 2 (Sess7 PR-2): タブ tap → 盆栽選択モード自動入り → SelectionToolbar 「一括記録」 → BulkWorkPickerSheet 起動経路
 */
import { Stack } from 'expo-router';
import React from 'react';

export default function RecordStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
