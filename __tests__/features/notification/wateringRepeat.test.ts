/**
 * F-16 水やり繰り返し通知 純関数テスト (Issue #30 / ADR-0014)。
 *
 * 検証範囲:
 * - parseTimeString / formatTimeString の双方向変換
 * - buildWateringIdentifier の prefix と 0 padding
 * - buildWateringSchedules の上限 5 件・重複除去・範囲外排除
 */
import {
  buildWateringIdentifier,
  buildWateringSchedules,
  formatTimeString,
  parseTimeString,
  WATERING_IDENTIFIER_PREFIX,
  WATERING_NOTIFICATION_LIMIT,
} from '../../../src/features/notification/wateringRepeat';

describe('parseTimeString / formatTimeString', () => {
  test('正常な "HH:MM" を {hour, minute} に変換', () => {
    expect(parseTimeString('07:30')).toEqual({ hour: 7, minute: 30 });
    expect(parseTimeString('00:00')).toEqual({ hour: 0, minute: 0 });
    expect(parseTimeString('23:59')).toEqual({ hour: 23, minute: 59 });
  });

  test('範囲外は null', () => {
    expect(parseTimeString('24:00')).toBeNull();
    expect(parseTimeString('07:60')).toBeNull();
    expect(parseTimeString('-1:00')).toBeNull();
  });

  test('0 padding 不足は null (UI 側でバリデーション一致)', () => {
    expect(parseTimeString('7:30')).toBeNull();
    expect(parseTimeString('07:5')).toBeNull();
  });

  test('非文字列・空文字は null', () => {
    expect(parseTimeString('')).toBeNull();
    expect(parseTimeString(' ')).toBeNull();
    expect(parseTimeString('hello')).toBeNull();
  });

  test('formatTimeString は 0 padding "HH:MM"', () => {
    expect(formatTimeString({ hour: 7, minute: 5 })).toBe('07:05');
    expect(formatTimeString({ hour: 0, minute: 0 })).toBe('00:00');
    expect(formatTimeString({ hour: 23, minute: 59 })).toBe('23:59');
  });

  test('双方向変換: parse(format(t)) === t', () => {
    const original = { hour: 14, minute: 25 };
    const round = parseTimeString(formatTimeString(original));
    expect(round).toEqual(original);
  });
});

describe('buildWateringIdentifier', () => {
  test('prefix と 0 padding', () => {
    expect(buildWateringIdentifier({ hour: 7, minute: 5 })).toBe(
      `${WATERING_IDENTIFIER_PREFIX}07_05`,
    );
    expect(buildWateringIdentifier({ hour: 0, minute: 0 })).toBe(
      `${WATERING_IDENTIFIER_PREFIX}00_00`,
    );
  });
});

describe('buildWateringSchedules', () => {
  test('正常入力 1 件', () => {
    const result = buildWateringSchedules([{ hour: 7, minute: 0 }]);
    expect(result).toEqual([{ identifier: `${WATERING_IDENTIFIER_PREFIX}07_00`, hour: 7, minute: 0 }]);
  });

  test('5 件丁度', () => {
    const times = [
      { hour: 6, minute: 0 },
      { hour: 9, minute: 0 },
      { hour: 12, minute: 0 },
      { hour: 17, minute: 0 },
      { hour: 21, minute: 0 },
    ];
    const result = buildWateringSchedules(times);
    expect(result).toHaveLength(5);
  });

  test('6 件目以降は切り捨て (ADR-0014 §H3)', () => {
    const times = Array.from({ length: 7 }, (_, i) => ({ hour: 6 + i, minute: 0 }));
    const result = buildWateringSchedules(times);
    expect(result).toHaveLength(WATERING_NOTIFICATION_LIMIT);
    expect(result[0]?.hour).toBe(6);
    expect(result[4]?.hour).toBe(10);
  });

  test('重複時刻は除去 (identifier ユニーク性)', () => {
    const times = [
      { hour: 7, minute: 0 },
      { hour: 7, minute: 0 }, // duplicate
      { hour: 9, minute: 30 },
    ];
    const result = buildWateringSchedules(times);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.identifier)).toEqual([
      `${WATERING_IDENTIFIER_PREFIX}07_00`,
      `${WATERING_IDENTIFIER_PREFIX}09_30`,
    ]);
  });

  test('範囲外時刻 (hour=24, minute=60, NaN) は除外', () => {
    const times = [
      { hour: 7, minute: 0 },
      { hour: 24, minute: 0 },
      { hour: 7, minute: 60 },
      { hour: Number.NaN, minute: 0 },
    ];
    const result = buildWateringSchedules(times);
    expect(result).toEqual([{ identifier: `${WATERING_IDENTIFIER_PREFIX}07_00`, hour: 7, minute: 0 }]);
  });

  test('空配列は空仕様', () => {
    expect(buildWateringSchedules([])).toEqual([]);
  });
});
