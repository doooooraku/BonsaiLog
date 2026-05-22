/**
 * 予定タブ (Sess30 PR-1 refactor、 ADR-0038 D2 整合)。
 *
 * 旧実装 (約 1014 行) は src/features/calendar/CalendarTabScreen.tsx に共通化、
 * 本 file は mode='plan' を渡すだけの薄い wrapper に縮約。
 *
 * 振る舞い (mode='plan'):
 * - SearchHeader タイトル: 「予定」
 * - default 日付: 明日 (source=tab 時) / URL param 優先 / stored fallback / today fallback
 * - FAB: useBulkActionFlow('schedule') = 「予定追加」 flow 起動 (ADR-0025 案 B)
 * - FAB disabled: 過去日選択時 (予定追加は過去不可)
 * - 個別 row tap → bonsai-detail?tab=timeline
 * - testID prefix: 'plan' (e2e_plan_*)
 *
 * 関連: ADR-0035 D1/D2 (タブ名 + tomorrow default) / ADR-0038 D1/D2 (RecordTabScreen 並存)。
 */
import React from 'react';

import { CalendarTabScreen } from '@/src/features/calendar/CalendarTabScreen';

export default function PlanScreen() {
  return <CalendarTabScreen mode="plan" />;
}
