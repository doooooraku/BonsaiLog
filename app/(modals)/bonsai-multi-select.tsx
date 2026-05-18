/**
 * 盆栽複数選択 画面 (ADR-0025 Phase 2 案 B、 Sess8 PR-2)。
 *
 * 起動経路: 予定/記録タブ FAB tap → useBulkActionFlow → router.push('/bonsai-multi-select?mode=...')
 *
 * 動作:
 * - 盆栽カード一覧表示 (selectMode true 固定)
 * - user が複数盆栽を tap で選択
 * - 「予定追加 / 一括記録」 ボタン (mode に応じて 1 つだけ表示)
 * - 確定 → setBulkContext + router.push('/bulk-work-picker?mode=...')
 * - キャンセル: 上部「閉じる」 ボタン → router.back() で盆栽タブに戻す (modal dismiss)
 */
export { default } from '@/src/features/event/BonsaiMultiSelectScreen';
