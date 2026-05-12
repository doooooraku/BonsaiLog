/**
 * 一括 (予定追加 / 記録) 作業選択画面 (Phase G3a、ADR-0024 Accepted)。
 *
 * `presentation: 'formSheet'` + `sheetAllowedDetents: [0.5, 1]` (Stack 共通設定)。
 *
 * caller は `usePickerStore.setBulkContext({ selectedBonsais })` 後に
 * `router.push('/bulk-work-picker?mode=log|schedule')`、結果は
 * `usePickerStore.setBulkWorkPickerResult({ type, mode })` + `router.back()` で返却。
 */
export { default } from '@/src/features/event/BulkWorkPickerScreen';
