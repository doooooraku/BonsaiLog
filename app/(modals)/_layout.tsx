/**
 * Modals Stack Layout (Phase G1、ADR-0024 Provisionally Accepted)。
 *
 * 全 modal を `presentation: 'formSheet'` + `sheetAllowedDetents: [0.5, 1]` +
 * `contentStyle: { height: '100%' }` で統一 (Expo v54 既知バグ予防)。
 *
 * Phase G2-G4 で work-picker / work-log-confirm / bulk-* / bonsai-new / heatmap-tap も追加予定。
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
    </Stack>
  );
}
