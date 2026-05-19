/**
 * Modals Stack Layout (ADR-0024 Notes Amended 2026-05-15、formSheet 全廃 → modal 一本化)。
 *
 * 全画面 `presentation: 'modal'` で統一 (Stack screenOptions で default、各 Screen は title のみ)。
 * 旧 formSheet (`sheetAllowedDetents [0.5, 1]` + `contentStyle height 100%`) は廃止。
 *
 * 改訂理由 (ADR-0024 §Notes Amended 2026-05-15):
 * - 公式仕様 (Expo Router docs 2026-04-02 更新版) で `presentation: 'modal'` は iOS-only、
 *   Android では regular screen と判明 → Android 主開発の本プロジェクトで modal/formSheet 区別の必然性薄
 * - Issue #522 (BonsaiCreate modal → species-picker formSheet の Android screencap 取得不能) 完全解消
 * - expo-router formSheet 既知 bug 群 (Issue #33092/#42066/#42904/#3181/#35616) 全回避
 * - 設計シンプル化、Maestro 安定性向上、ui-diff capture 全件 OK
 */
import { Stack } from 'expo-router';
import React from 'react';

export default function ModalsLayout() {
  return (
    <Stack screenOptions={{ presentation: 'modal' }}>
      <Stack.Screen name="species-picker" options={{ title: '樹種を選ぶ' }} />
      <Stack.Screen name="style-picker" options={{ title: '樹形を選ぶ' }} />
      <Stack.Screen name="work-picker" options={{ title: '作業を選ぶ' }} />
      <Stack.Screen name="work-log-confirm" options={{ title: '作業を記録' }} />
      <Stack.Screen name="bonsai-multi-select" options={{ title: '盆栽を選ぶ' }} />
      <Stack.Screen name="bulk-work-picker" options={{ title: '作業を選ぶ' }} />
      <Stack.Screen name="bulk-log-confirm" options={{ title: 'まとめて記録' }} />
      <Stack.Screen name="bulk-schedule-date" options={{ title: '予定日を選ぶ' }} />
      <Stack.Screen name="watering-day-detail" options={{ title: 'この日の水やり' }} />
      <Stack.Screen name="bonsai-new" options={{ title: '盆栽を登録' }} />
    </Stack>
  );
}
