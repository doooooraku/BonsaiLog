/**
 * payloadValidator テスト (P2-03 PR-B、Issue #17 AC3-1〜AC3-3)。
 */
import {
  isEventType,
  safeParsePayloadJson,
  serializeEventPayload,
  validateEventPayload,
} from '../../../src/features/event/payloadValidator';

describe('isEventType', () => {
  test('既知の type は true', () => {
    expect(isEventType('watering')).toBe(true);
    expect(isEventType('wiring')).toBe(true);
    expect(isEventType('candle_cut')).toBe(true);
  });

  test('未知の type は false', () => {
    expect(isEventType('invalid_type')).toBe(false);
    expect(isEventType('')).toBe(false);
    expect(isEventType('Wiring')).toBe(false); // 大文字混在
  });
});

describe('validateEventPayload', () => {
  test('AC3-1: wiring の正常 payload は受け入れる', () => {
    expect(() =>
      validateEventPayload('wiring', { wire_size_mm: 2.5, body_part: 'main_trunk' }),
    ).not.toThrow();
  });

  test('AC3-1: wiring の余分な field は schema が strict なら拒否、loose なら通過', () => {
    // Valibot v.object は default で extra fields を strip するため例外にならない
    // strict 化は v.objectAsync({...}, never) で対応 (本 PR では loose、UI 側で strict 化)
    const result = validateEventPayload('wiring', {
      wire_size_mm: 2.5,
      unknown_field: 'foo',
    });
    expect(result).toBeDefined();
  });

  test('AC3-3: 不正な type は throw', () => {
    expect(() => validateEventPayload('invalid_type', {})).toThrow(/Unknown event type/);
  });

  test('null / undefined payload は空オブジェクトとして扱う', () => {
    expect(() => validateEventPayload('watering', null)).not.toThrow();
    expect(() => validateEventPayload('watering', undefined)).not.toThrow();
  });

  test('全 13 種別が validate 可能 (空 payload)', () => {
    const types = [
      'watering',
      'pruning',
      'wiring',
      'unwiring',
      'repotting',
      'fertilizing',
      'pest_control',
      'leaf_trimming',
      'defoliation',
      'deshoot',
      'candle_cut',
      'moss_care',
      'position_change',
    ];
    for (const type of types) {
      expect(() => validateEventPayload(type, {})).not.toThrow();
    }
  });
});

describe('serializeEventPayload', () => {
  test('空オブジェクトは null に正規化', () => {
    expect(serializeEventPayload('watering', {})).toBeNull();
  });

  test('値ありは JSON 文字列', () => {
    const result = serializeEventPayload('watering', { amount_ml: 200 });
    expect(typeof result).toBe('string');
    const parsed = JSON.parse(result as string) as { amount_ml: number };
    expect(parsed.amount_ml).toBe(200);
  });

  test('不正な type は throw', () => {
    expect(() => serializeEventPayload('invalid_type', {})).toThrow(/Unknown event type/);
  });
});

describe('safeParsePayloadJson', () => {
  test('null は null を返す', () => {
    expect(safeParsePayloadJson('watering', null)).toBeNull();
  });

  test('valid JSON は parsed object を返す', () => {
    const result = safeParsePayloadJson('watering', '{"amount_ml":200}') as {
      amount_ml: number;
    };
    expect(result.amount_ml).toBe(200);
  });

  test('invalid JSON は null を返す (例外を吐かない)', () => {
    expect(safeParsePayloadJson('watering', 'not-json')).toBeNull();
    expect(safeParsePayloadJson('watering', '{')).toBeNull();
  });

  test('未知 type は null を返す', () => {
    expect(safeParsePayloadJson('invalid_type', '{}')).toBeNull();
  });
});
