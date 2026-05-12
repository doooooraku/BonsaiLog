/**
 * 盆栽 新規登録画面 (Phase G4 part 2、ADR-0024 Accepted)。
 *
 * `presentation: 'modal'` (functional_spec §6.2 既存設計、`(modals)/bonsai-new` の指定通り)。
 * formSheet ではなく **modal** を採用 (form 入力の専有領域を確保、Sheet 風表示は不要)。
 *
 * caller は `router.push('/bonsai-new')`、結果は
 * `usePickerStore.setBonsaiCreateResult(bonsaiId)` + `router.back()` で返却。
 * caller 側 `useFocusEffect` で `consumeBonsaiCreateResult()` 取得 → `/bonsai/<id>` 遷移。
 */
export { default } from '@/src/features/bonsai/BonsaiCreateScreen';
