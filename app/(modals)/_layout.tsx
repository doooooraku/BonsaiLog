/**
 * Modals Stack Layout (ADR-0024 Notes Amended 2026-05-15、formSheet 全廃 → modal 一本化)。
 *
 * 全画面 `presentation: 'modal'` で統一 (Stack screenOptions で default、各 Screen は title のみ)。
 * 旧 formSheet (`sheetAllowedDetents [0.5, 1]` + `contentStyle height 100%`) は廃止。
 *
 * Sess16 PR-A1 (2026-05-20): work-picker / bulk-work-picker の nav title を `mode` URL param で
 * 動的化 (mode='log' → 「作業を記録」 / mode='schedule' → 「予定を追加」)。 823810d 削除で
 * content title が消失し mode 情報が user に伝わらない問題を nav title 統合で解消。
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

import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';

export default function ModalsLayout() {
  const { t } = useTranslation();

  // Sess16 PR-A1: mode URL param で nav title を切替 (log → 作業を記録 / schedule → 予定を追加)
  const workTitleFor = (mode: unknown): string => {
    const key: TranslationKey = mode === 'schedule' ? 'addScheduleTitle' : 'workPickerTitle';
    return t(key);
  };

  return (
    <Stack screenOptions={{ presentation: 'modal' }}>
      <Stack.Screen name="species-picker" options={{ title: t('stackSpeciesPickerTitle') }} />
      <Stack.Screen name="style-picker" options={{ title: t('stackStylePickerTitle') }} />
      <Stack.Screen
        name="work-picker"
        options={({ route }) => ({
          title: workTitleFor((route.params as { mode?: string } | undefined)?.mode),
        })}
      />
      <Stack.Screen name="work-log-confirm" options={{ title: t('workPickerTitle') }} />
      <Stack.Screen
        name="bonsai-multi-select"
        options={{ title: t('stackBonsaiMultiSelectTitle') }}
      />
      <Stack.Screen
        name="bulk-work-picker"
        options={({ route }) => ({
          title: workTitleFor((route.params as { mode?: string } | undefined)?.mode),
        })}
      />
      <Stack.Screen name="bulk-log-confirm" options={{ title: t('stackBulkLogConfirmTitle') }} />
      <Stack.Screen name="bonsai-new" options={{ title: t('stackBonsaiNewTitle') }} />
      {/* Sess34 ADR-0041 PR-4: event 紐付け写真の全画面 swipe Viewer (title は内部で動的設定) */}
      <Stack.Screen name="photo-viewer" options={{ title: '' }} />
    </Stack>
  );
}
