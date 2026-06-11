/**
 * buildWeeklyByDayHumanLabel 純関数 test (Sess101 #1168)。
 *
 * 「毎週 + 曜日選択」 の人間可読ラベル SoT — フォームプレビューと一覧の両方が使う。
 * t は ja 値の最小 mock (実 i18n は i18n:check が 19 言語 parity を担保)。
 */
import { buildWeeklyByDayHumanLabel } from '@/src/features/recurrence/rruleHumanLabel';

const JA: Record<string, string> = {
  weekdaySunShort: '日',
  weekdayMonShort: '月',
  weekdayTueShort: '火',
  weekdayWedShort: '水',
  weekdayThuShort: '木',
  weekdayFriShort: '金',
  weekdaySatShort: '土',
  recurringWeeklyByDaysSummary: '毎週{days}曜',
  recurringWeeklyByDaysSeparator: '・',
};
const t = (key: string): string => JA[key] ?? key;

describe('buildWeeklyByDayHumanLabel (Sess101 #1168、 曜日入り頻度ラベル SoT)', () => {
  test('単数 [1] (月) → 「毎週月曜」 (= 旧 BYDAY=MO preset の表示と同一)', () => {
    expect(buildWeeklyByDayHumanLabel([1], t)).toBe('毎週月曜');
  });

  test('複数 [1, 3, 5] (月水金) → 「毎週月・水・金曜」', () => {
    expect(buildWeeklyByDayHumanLabel([1, 3, 5], t)).toBe('毎週月・水・金曜');
  });

  test('未ソート + 重複 [5, 1, 1, 3] → dedupe + ソートで 「毎週月・水・金曜」', () => {
    expect(buildWeeklyByDayHumanLabel([5, 1, 1, 3], t)).toBe('毎週月・水・金曜');
  });

  test('空配列 (= 曜日指定なし) → null (caller が「毎週」 に fallback)', () => {
    expect(buildWeeklyByDayHumanLabel([], t)).toBe(null);
  });

  test('範囲外のみ [-1, 7] → null', () => {
    expect(buildWeeklyByDayHumanLabel([-1, 7], t)).toBe(null);
  });

  test('範囲外混在 [-1, 2] → 有効分のみ 「毎週火曜」', () => {
    expect(buildWeeklyByDayHumanLabel([-1, 2], t)).toBe('毎週火曜');
  });

  test('全曜日 [0..6] → 「毎週日・月・火・水・木・金・土曜」 (UI 側は全選択時 daily へ自動切替のため通常到達しない)', () => {
    expect(buildWeeklyByDayHumanLabel([0, 1, 2, 3, 4, 5, 6], t)).toBe(
      '毎週日・月・火・水・木・金・土曜',
    );
  });

  test('en mock: [1, 3] → Weekly on Mon, Wed', () => {
    const EN: Record<string, string> = {
      weekdayMonShort: 'Mon',
      weekdayWedShort: 'Wed',
      recurringWeeklyByDaysSummary: 'Weekly on {days}',
      recurringWeeklyByDaysSeparator: ', ',
    };
    expect(buildWeeklyByDayHumanLabel([1, 3], (k: string) => EN[k] ?? k)).toBe(
      'Weekly on Mon, Wed',
    );
  });
});
