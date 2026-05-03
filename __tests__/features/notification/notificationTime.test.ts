/**
 * F-16 notificationTime 純関数テスト (Issue #30)。
 */
import { parseHhmmToDate, formatDateToHhmm } from '@/src/features/notification/notificationTime';

describe('parseHhmmToDate', () => {
  const base = new Date(2026, 4, 3, 12, 34, 56, 789); // 2026-05-03 12:34:56.789

  test('"07:00" → 同日 07:00:00', () => {
    const result = parseHhmmToDate('07:00', base);
    expect(result.getHours()).toBe(7);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  test('"23:59" → 同日 23:59:00', () => {
    const result = parseHhmmToDate('23:59', base);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
  });

  test('"24:00" (不正) → デフォルト 07:00', () => {
    const result = parseHhmmToDate('24:00', base);
    expect(result.getHours()).toBe(7);
    expect(result.getMinutes()).toBe(0);
  });

  test('"abc" (不正) → デフォルト 07:00', () => {
    const result = parseHhmmToDate('abc', base);
    expect(result.getHours()).toBe(7);
    expect(result.getMinutes()).toBe(0);
  });

  test('"7:00" (zero-pad なし、不正) → デフォルト 07:00', () => {
    const result = parseHhmmToDate('7:00', base);
    expect(result.getHours()).toBe(7);
  });

  test('日付部分は base から保持', () => {
    const result = parseHhmmToDate('15:30', base);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(4);
    expect(result.getDate()).toBe(3);
  });
});

describe('formatDateToHhmm', () => {
  test('07:00 を ZeroPadded で返す', () => {
    const d = new Date(2026, 4, 3, 7, 0, 0, 0);
    expect(formatDateToHhmm(d)).toBe('07:00');
  });

  test('23:59 → "23:59"', () => {
    const d = new Date(2026, 4, 3, 23, 59, 0, 0);
    expect(formatDateToHhmm(d)).toBe('23:59');
  });

  test('00:05 → "00:05" (両方 ZeroPad)', () => {
    const d = new Date(2026, 4, 3, 0, 5, 0, 0);
    expect(formatDateToHhmm(d)).toBe('00:05');
  });

  test('parse → format で round-trip', () => {
    const base = new Date(2026, 4, 3, 12, 0, 0, 0);
    expect(formatDateToHhmm(parseHhmmToDate('15:42', base))).toBe('15:42');
  });
});
