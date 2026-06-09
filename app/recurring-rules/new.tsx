/**
 * Route entry for /recurring-rules/new (新規定期予定追加画面、 Sess82 PR-D、 ADR-0056)。
 *
 * 動線: ふりかえり → 定期予定を管理 → BottomCtaBar 「+ 新規追加」 → 本画面
 * URL param: bonsaiId, eventType (caller 必須、 不正 param で router.back())
 */
export { default } from '@/src/features/recurrence/RecurrenceFormScreen';
