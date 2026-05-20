/**
 * 一括 (予定追加 / 記録) 作業選択画面 (Phase G3a、ADR-0024 Accepted)。
 *
 * `presentation: 'modal'` (ADR-0024 Notes Amended 2026-05-15 で modal 一本化、
 * `(modals)/_layout.tsx` の screenOptions で適用)。Sess16 PR-A1 で nav title を mode URL
 * param で動的化 (log → 「作業を記録」 / schedule → 「予定を追加」)。
 *
 * caller は `usePickerStore.setBulkContext({ selectedBonsais })` 後に
 * `router.push('/bulk-work-picker?mode=log|schedule&date=YYYY-MM-DD')` で起動。
 *
 * Sess12 PR-B+C で書き込み配線 + Sess12 PR-G で複数作業選択:
 * - schedule: BulkWorkPickerScreen 内で bulkScheduleEvents 直接呼び出し → Toast → router.replace('/(tabs)/plan')
 * - log (単一作業 or 複数 + memo ON): `/bulk-log-confirm?types=...` に push
 * - log (複数 + memo OFF): bulkLogEvents loop で即書き込み → router.replace('/(tabs)/record')
 */
export { default } from '@/src/features/event/BulkWorkPickerScreen';
