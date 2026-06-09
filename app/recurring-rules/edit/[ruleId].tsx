/**
 * Route entry for /recurring-rules/edit/[ruleId] (定期予定編集画面、 Sess82 PR-D、 ADR-0056)。
 *
 * 動線: ふりかえり → 定期予定を管理 → kebab → 編集 → 本画面
 * URL param: ruleId (動的、 不在で router.back())
 */
export { default } from '@/src/features/recurrence/RecurrenceFormScreen';
