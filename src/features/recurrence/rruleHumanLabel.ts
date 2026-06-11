/**
 * 曜日付き頻度ラベルの SoT (Sess101 #1168)。
 *
 * 「毎週 + 曜日選択 (BYDAY)」 の人間可読ラベルを 1 箇所で生成する。
 * 利用箇所 = RecurrenceFormScreen (プレビュー summary) + RecurrenceListScreen (一覧 rruleLabel)。
 * 旧実装はフォームが「毎週」 止まり、 一覧は BYDAY=MO 以外「カスタム」 fallback という
 * 同型の表示穴が 2 箇所にあった (R-55 網羅 → R-77 SoT 化)。
 *
 * 表示例 (ja): [1] → 「毎週月曜」 / [1,3,5] → 「毎週月・水・金曜」
 * 表示例 (en): [1] → 'Weekly on Mon' / [1,3,5] → 'Weekly on Mon, Wed, Fri'
 */
import type { TranslationKey } from '@/src/core/i18n/locales/en';

/** 曜日番号 (= 0=Sun 〜 6=Sat、 JavaScript Date.getDay() 互換) → 短縮名 i18n key。 */
const WEEKDAY_SHORT_KEYS: readonly TranslationKey[] = [
  'weekdaySunShort',
  'weekdayMonShort',
  'weekdayTueShort',
  'weekdayWedShort',
  'weekdayThuShort',
  'weekdayFriShort',
  'weekdaySatShort',
];

/**
 * 曜日番号配列 → 「毎週{曜日}」 ラベル。
 *
 * @param byday - 曜日番号配列 (= parseWeeklyByDay の戻り値 / RecurrenceValue.byday)
 * @param t - i18n 翻訳関数
 * @returns ラベル文字列。 byday が空 (= 曜日指定なし) なら null (caller が「毎週」 等に fallback)
 */
export function buildWeeklyByDayHumanLabel(
  byday: readonly number[],
  t: (key: TranslationKey) => string,
): string | null {
  const valid = byday.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  if (valid.length === 0) return null;
  const days = [...new Set(valid)]
    .sort((a, b) => a - b)
    .map((n) => t(WEEKDAY_SHORT_KEYS[n]!))
    .join(t('recurringWeeklyByDaysSeparator'));
  return t('recurringWeeklyByDaysSummary').replace('{days}', days);
}
