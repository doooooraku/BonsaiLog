/**
 * 一括予定追加 日付選択画面 (Phase G3b、ADR-0024 Accepted、skip-list home-bulk-sched-date 解消)。
 *
 * `presentation: 'formSheet'` + `sheetAllowedDetents: [0.5, 1]` (Stack 共通設定)。
 *
 * caller は `usePickerStore.setBulkContext({ selectedBonsais })` 後に
 * `router.push('/bulk-schedule-date?type=...')`、結果は
 * `usePickerStore.setBulkScheduleDateResult({ occurredAtUtc })` + `router.back()` で返却。
 */
export { default } from '@/src/features/event/BulkScheduleDateScreen';
