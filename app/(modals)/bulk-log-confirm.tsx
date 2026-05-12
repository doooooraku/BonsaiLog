/**
 * 一括記録 詳細 入力画面 (Phase G3a、ADR-0024 Accepted)。
 *
 * `presentation: 'formSheet'` + `sheetAllowedDetents: [0.5, 1]` (Stack 共通設定)。
 *
 * caller は `usePickerStore.setBulkContext({ selectedBonsais })` 後に
 * `router.push('/bulk-log-confirm?type=...')`、結果は
 * `usePickerStore.setBulkLogConfirmResult({ note })` + `router.back()` で返却。
 */
export { default } from '@/src/features/event/BulkLogConfirmScreen';
