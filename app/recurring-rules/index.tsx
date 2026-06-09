/**
 * Route entry for /recurring-rules (定期予定の管理画面、 Sess81 PR-7.5、 ADR-0056)。
 *
 * ふりかえりタブ → 「🔁 定期予定を管理」 card tap で 本画面に遷移。
 * Stack header は RecurrenceListScreen 内の <Stack.Screen options={{ title }}/> で 設定。
 */
export { default } from '@/src/features/recurrence/RecurrenceListScreen';
