/**
 * G0 PoC Modals Stack Layout (ADR-0024 / Issue #475 Phase G0)。
 *
 * Y 案 (presentation: 'modal') と Z 案 (presentation: 'formSheet') を 1 ディレクトリで並存。
 * 各 Stack.Screen options で個別 presentation を指定。
 *
 * Phase G1 以降で Y / Z 勝者案を main 採用、敗者案ファイルは削除。
 */
import { Stack } from 'expo-router';
import React from 'react';

export default function ModalsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="species-picker-y"
        options={{
          presentation: 'modal',
          title: '樹種を選ぶ (Y / modal)',
        }}
      />
      <Stack.Screen
        name="species-picker-z"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.5, 1],
          contentStyle: { height: '100%' },
          title: '樹種を選ぶ (Z / formSheet)',
        }}
      />
    </Stack>
  );
}
