import { Stack } from 'expo-router';
import React from 'react';

import { useTranslation } from '@/src/core/i18n/i18n';
// Sess90 PR-A: bonsai detail screen の Stack header font 統一 (ADR-0053 Sess90 Amendment、 R-75)。
import { screenTitleStack } from '@/src/core/theme/typography';
// Sess90 PR-B: header 背景を c.background (= washi/宵墨 scheme-aware) で SoT 統一。
import { useColors } from '@/src/core/theme/useColors';

/**
 * Bonsai タブ内 Stack ナビゲーション (ADR-0020 Phase 2 改修、 Sess20 PR-H1 i18n 化)。
 *
 * Routes (実在するもののみ宣言する):
 * - index: 一覧画面 (Claude Design HomeScreen 整合、SearchHeader 自前で持つので headerShown=false)
 * - [id]/index: 詳細画面
 *
 * 新規登録は (modals)/bonsai-new、watering 履歴は ADR-0039 で廃止済のため、
 * かつて宣言していた "new" / "[id]/watering" の Stack.Screen は削除 (起動時 extraneous 警告を解消)。
 */
export default function BonsaiStackLayout() {
  const { t } = useTranslation();
  const c = useColors();
  return (
    <Stack
      screenOptions={{
        // Sess90 PR-A: font geometry SoT (R-75)。
        // Sess90 PR-B: header 背景 + tint も明示 (= nested は cascade されない)。
        headerStyle: { backgroundColor: c.background },
        headerTintColor: c.text,
        headerTitleStyle: { color: c.text, ...screenTitleStack },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="[id]/index"
        options={{ title: t('stackBonsaiDetailTitle'), headerShown: true }}
      />
    </Stack>
  );
}
