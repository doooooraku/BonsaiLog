/**
 * ふりかえりタブ Stack。
 *
 * ADR-0020 §Decision §7 (2026-05-10 改訂) で「探す」を「ふりかえり」に rename。
 * 本 stack は CareHub Hub 画面 (T1-8c で実装) + 検索 (既存) を束ねる。
 */
import { Stack } from 'expo-router';
import React from 'react';

export default function LookBackStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
