/**
 * 横断水やり日付詳細画面 (Phase G4 part 1、ADR-0024 Accepted)。
 *
 * `presentation: 'formSheet'` + `sheetAllowedDetents: [0.5, 1]` (Stack 共通設定)。
 *
 * caller は `usePickerStore.setWateringDayDetailContext({ dateKey, events, bonsaiById })` 後に
 * `router.push('/watering-day-detail')`、結果は entry tap で `setWateringDayDetailEntry(bonsaiId)`
 * + `router.back()` で返却。caller は `useFocusEffect` で `consumeWateringDayDetailEntry()` 取得 →
 * `/bonsai/<id>` 遷移。
 */
export { default } from '@/src/features/watering/WateringDayDetailScreen';
