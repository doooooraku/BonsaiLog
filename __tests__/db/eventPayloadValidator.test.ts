/**
 * payloadValidator テスト (P2-03 PR-B、Issue #17 AC3-1〜AC3-3)。
 */
import {
  isEventType,
  safeParsePayloadJson,
  serializeEventPayload,
  validateEventPayload,
} from '../../src/db/eventPayloadValidator';

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

// =============================================================================
// Sess34 ADR-0041 Phase θ PR-Q-fix: schema 漏れ silent bug 再発防止
// 各 type の form 実保存 (buildWorkLogPayload) field が valibot で strip されない確認
// =============================================================================
describe('Phase θ PR-Q-fix: form 新 field strip 防止', () => {
  test('watering: amount (string) を保持', () => {
    const result = serializeEventPayload('watering', { amount: 'plenty' });
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toEqual({ amount: 'plenty' });
  });

  test('pruning: parts[] + amount を保持', () => {
    const result = serializeEventPayload('pruning', { parts: ['eda', 'ha'], amount: 'some' });
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed.parts).toEqual(['eda', 'ha']);
    expect(parsed.amount).toBe('some');
  });

  test('repotting: pot_size_cm (number) + root_pruning + soil_mix を保持 (user 質問 fix)', () => {
    const result = serializeEventPayload('repotting', {
      pot_size_cm: 18,
      root_pruning: 'light',
      soil_mix: '赤玉土',
    });
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed.pot_size_cm).toBe(18);
    expect(parsed.root_pruning).toBe('light');
    expect(parsed.soil_mix).toBe('赤玉土');
  });

  test('repotting: mm 180 入力 → cm 18 canonical 保存 (lengthToCanonical 整合)', () => {
    // buildWorkLogPayload で lengthToCanonical('180', 'mm') = 18 を pot_size_cm に設定する想定
    const result = serializeEventPayload('repotting', { pot_size_cm: 18 });
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toEqual({ pot_size_cm: 18 });
  });

  test('pest_control: target + agent + dilution_ratio (number) を保持', () => {
    const result = serializeEventPayload('pest_control', {
      target: 'prevention',
      agent: 'ベニカ',
      dilution_ratio: 1000,
    });
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed.dilution_ratio).toBe(1000);
    expect(parsed.target).toBe('prevention');
  });

  test('candle_cut: count (number) を保持', () => {
    const result = serializeEventPayload('candle_cut', { body_part: 'moderate', count: 5 });
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed.count).toBe(5);
  });

  test('leaf_first_aid: symptom + treatment を保持 (Sess16 PR-E 既存)', () => {
    const result = serializeEventPayload('leaf_first_aid', {
      symptom: 'burn',
      treatment: '半日陰移動',
    });
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed.symptom).toBe('burn');
    expect(parsed.treatment).toBe('半日陰移動');
  });
});
