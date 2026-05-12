/**
 * Modals Stack Layout (Phase G1-G2、ADR-0024 Accepted)。
 *
 * 全 modal を `presentation: 'formSheet'` + `sheetAllowedDetents: [0.5, 1]` +
 * `contentStyle: { height: '100%' }` で統一 (Expo v54 既知バグ予防、iOS Sheet 標準 detent)。
 *
 * Phase G3-G4 で bulk-* / bonsai-new / heatmap-tap も追加予定。
 */
import { Stack } from 'expo-router';
import React from 'react';

const FORM_SHEET_OPTIONS = {
  presentation: 'formSheet' as const,
  sheetAllowedDetents: [0.5, 1] as [number, number],
  contentStyle: { height: '100%' as const },
};

export default function ModalsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="species-picker"
        options={{ ...FORM_SHEET_OPTIONS, title: '樹種を選ぶ' }}
      />
      <Stack.Screen name="style-picker" options={{ ...FORM_SHEET_OPTIONS, title: '樹形を選ぶ' }} />
      <Stack.Screen name="work-picker" options={{ ...FORM_SHEET_OPTIONS, title: '作業を選ぶ' }} />
      <Stack.Screen
        name="work-log-confirm"
        options={{ ...FORM_SHEET_OPTIONS, title: '作業を記録' }}
      />
    </Stack>
  );
}
