/**
 * 一括 (予定追加 / 記録) 作業選択画面 (Phase G3a、ADR-0024 Accepted)。
 *
 * caller は `usePickerStore.setBulkContext({ selectedBonsais })` 後に
 * `router.push('/bulk-work-picker?mode=log|schedule&date=YYYY-MM-DD')` で起動。
 *
 * Sess12 PR-B+C で書き込み配線:
 * - schedule: BulkWorkPickerScreen 内で bulkScheduleEvents 直接呼び出し → Toast → dismissAll
 * - log: 次画面 `/bulk-log-confirm?type=...` に push、 そこで bulkLogEvents 呼び出し
 */
export { default } from '@/src/features/event/BulkWorkPickerScreen';
