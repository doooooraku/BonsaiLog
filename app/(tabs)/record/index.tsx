/**
 * 記録タブ (Sess30 PR-1 refactor、 ADR-0038 D1 整合)。
 *
 * 旧実装 (約 897 行、 Sess29 PR-2 で新規実装) は src/features/calendar/CalendarTabScreen.tsx に
 * 共通化、 本 file は mode='record' を渡すだけの薄い wrapper に縮約。
 *
 * 振る舞い (mode='record'):
 * - SearchHeader タイトル: 「記録」
 * - default 日付: 今日 (URL param 優先 / stored fallback / today fallback)
 * - FAB: useBulkActionFlow('log') = 「作業を記録」 5 ステップ flow 起動 (ADR-0038 D1)
 * - FAB 有効: 過去日でも有効 (記録は過去日も意味あり)
 * - 個別 row tap → bonsai-detail?tab=history
 * - testID prefix: 'record' (e2e_record_*)
 *
 * 関連: ADR-0038 D1/D2 (タブハイライト整合 + FAB log mode)。
 */
import React from 'react';

import { CalendarTabScreen } from '@/src/features/calendar/CalendarTabScreen';

export default function RecordTabScreen() {
  return <CalendarTabScreen mode="record" />;
}
