/**
 * 一括記録 詳細 入力画面 (Phase G3a、ADR-0024 Accepted)。
 *
 * caller (BulkWorkPickerScreen mode='log') は `router.push('/bulk-log-confirm?type=...')` で起動。
 *
 * Sess12 PR-B+C で書き込み配線: BulkLogConfirmScreen 内で bulkLogEvents 直接呼び出し
 * → Toast → router.dismissAll で元タブに復帰。
 */
export { default } from '@/src/features/event/BulkLogConfirmScreen';
