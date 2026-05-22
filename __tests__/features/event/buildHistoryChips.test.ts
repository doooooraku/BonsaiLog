/**
 * buildHistoryChips 14 種別フル網羅 + exhaustive switch unit test (Sess34 ADR-0041 PR-2)。
 *
 * 確認項目:
 * 1. 14 種別すべてで適切な chip[] が生成される (Issue #296 Phase 2 + ADR-0041 D4)
 * 2. leaf_first_aid case の bug fix (旧 silent fallthrough → 適切な chips 生成)
 * 3. wiring の scheduled_unwire_at chip 削除 (ADR-0041 D9、 WiringPeriodDisplay と重複)
 * 4. exhaustive switch (新規 EventType 追加時に TypeScript compile error 化)
 * 5. payload 空 / 不正 JSON / 旧 schema event の graceful degradation
 *
 * 参照: src/features/event/buildHistoryChips.ts
 *        src/features/event/WorkLogTypeFormFields.tsx buildWorkLogPayload (実保存 SoT)
 *        src/db/schema.ts EVENT_TYPES (14 種別 SoT)
 */
import { EVENT_TYPES, type EventType } from '@/src/db/schema';
import { buildHistoryChips, type HistoryChip } from '@/src/features/event/buildHistoryChips';

/** Helper: payload object を JSON 化して buildHistoryChips 呼出 */
function chipsOf(type: string, payload: Record<string, unknown> | null = null): HistoryChip[] {
  return buildHistoryChips({ type, payloadJson: payload ? JSON.stringify(payload) : null });
}

/** Helper: chip[] を「labelKey or text」 の文字列配列に簡略化 (比較容易化) */
function chipsToStr(chips: HistoryChip[]): string[] {
  return chips.map((c) => c.labelKey ?? c.text ?? '');
}

describe('buildHistoryChips — 14 種別フル網羅 (ADR-0041 D4)', () => {
  // ============================================================
  // 1. watering: payload.amount = 'normal' | 'plenty' | 'light'
  // ============================================================
  describe('1. watering', () => {
    test(`amount=normal → ['historyLabelAmountNormal']`, () => {
      expect(chipsToStr(chipsOf('watering', { amount: 'normal' }))).toEqual([
        'historyLabelAmountNormal',
      ]);
    });
    test(`amount=plenty → ['historyLabelAmountPlenty']`, () => {
      expect(chipsToStr(chipsOf('watering', { amount: 'plenty' }))).toEqual([
        'historyLabelAmountPlenty',
      ]);
    });
    test('payload 空 → 空配列', () => {
      expect(chipsOf('watering', {})).toEqual([]);
    });
  });

  // ============================================================
  // 2. pruning: payload.parts = string[], amount = 'few' | 'some' | 'lot'
  // ============================================================
  describe('2. pruning', () => {
    test('parts=[eda, ha] + amount=some → 3 chips', () => {
      const chips = chipsToStr(chipsOf('pruning', { parts: ['eda', 'ha'], amount: 'some' }));
      expect(chips).toEqual([
        'historyLabelPartsEda',
        'historyLabelPartsHa',
        'historyLabelPruneAmountSome',
      ]);
    });
    test('parts のみ → 部位 chips のみ', () => {
      expect(chipsToStr(chipsOf('pruning', { parts: ['shinme'] }))).toEqual([
        'historyLabelPartsShinme',
      ]);
    });
    test('parts が非配列 → 無視 (graceful)', () => {
      expect(chipsToStr(chipsOf('pruning', { parts: 'not_array', amount: 'few' }))).toEqual([
        'historyLabelPruneAmountFew',
      ]);
    });
  });

  // ============================================================
  // 3. wiring: payload.wire_size_mm + body_part (scheduled_unwire_at は chip 化しない、 D9)
  // ============================================================
  describe('3. wiring (D9: scheduled_unwire_at chip 削除)', () => {
    test('wire_size_mm=2 + body_part=miki → 2 chips', () => {
      const chips = chipsToStr(chipsOf('wiring', { wire_size_mm: 2, body_part: 'miki' }));
      expect(chips).toEqual(['2mm', 'historyLabelPartsMiki']);
    });
    test('scheduled_unwire_at は chip に含まない (ADR-0041 D9、 WiringPeriodDisplay 側で表示)', () => {
      const chips = chipsOf('wiring', {
        wire_size_mm: 1.5,
        body_part: 'all',
        scheduled_unwire_at: '2026-08-15T00:00:00.000Z',
      });
      const strs = chipsToStr(chips);
      expect(strs).toEqual(['1.5mm', 'historyLabelPartsAll']);
      // scheduled_unwire_at の日付が chip text に出現しないこと
      expect(strs.some((s) => s.includes('2026-08-15'))).toBe(false);
    });
  });

  // ============================================================
  // 4. unwiring
  // ============================================================
  describe('4. unwiring', () => {
    test(`body_part=eda → ['historyLabelPartsEda']`, () => {
      expect(chipsToStr(chipsOf('unwiring', { body_part: 'eda' }))).toEqual([
        'historyLabelPartsEda',
      ]);
    });
  });

  // ============================================================
  // 5. repotting: pot_size_cm + soil_mix + root_pruning
  // ============================================================
  describe('5. repotting', () => {
    test('全 field → 3 chips (順: pot_size / root_pruning / soil_mix)', () => {
      const chips = chipsToStr(
        chipsOf('repotting', { pot_size_cm: 15, soil_mix: '赤玉土', root_pruning: 'third' }),
      );
      expect(chips).toEqual(['15cm', 'historyLabelRepotRootsThird', '赤玉土']);
    });
    test('root_pruning=light は repot 専用 i18n (water amount の light と分離)', () => {
      expect(chipsToStr(chipsOf('repotting', { root_pruning: 'light' }))).toEqual([
        'historyLabelRepotRootsLight',
      ]);
    });
    test('soil_mix 空文字列 → chip 化しない', () => {
      expect(chipsToStr(chipsOf('repotting', { soil_mix: '   ' }))).toEqual([]);
    });
  });

  // ============================================================
  // 6. fertilizing: kind + amount (product 銘柄、 free text)
  // ============================================================
  describe('6. fertilizing', () => {
    test('kind=solid + amount=「マグァンプK」 → 2 chips', () => {
      expect(chipsToStr(chipsOf('fertilizing', { kind: 'solid', amount: 'マグァンプK' }))).toEqual([
        'historyLabelFertKindSolid',
        'マグァンプK',
      ]);
    });
    test('kind=slow_release → 新 i18n key', () => {
      expect(chipsToStr(chipsOf('fertilizing', { kind: 'slow_release' }))).toEqual([
        'historyLabelFertKindSlowRelease',
      ]);
    });
  });

  // ============================================================
  // 7. pest_control: target + agent (free) + dilution_ratio (number)
  // ============================================================
  describe('7. pest_control', () => {
    test('target=prevention + agent=「ベニカ」 + dilution=1000 → 3 chips', () => {
      expect(
        chipsToStr(
          chipsOf('pest_control', {
            target: 'prevention',
            agent: 'ベニカ',
            dilution_ratio: 1000,
          }),
        ),
      ).toEqual(['historyLabelPestPurposePrevention', 'ベニカ', '×1000']);
    });
    test('target=treatment → 新 i18n key', () => {
      expect(chipsToStr(chipsOf('pest_control', { target: 'treatment' }))).toEqual([
        'historyLabelPestPurposeTreatment',
      ]);
    });
  });

  // ============================================================
  // 8-11. leaf_trimming / defoliation / deshoot: body_part = trim_range
  // ============================================================
  describe('8. leaf_trimming', () => {
    test('body_part=moderate → trim range i18n', () => {
      expect(chipsToStr(chipsOf('leaf_trimming', { body_part: 'moderate' }))).toEqual([
        'historyLabelTrimRangeModerate',
      ]);
    });
  });
  describe('9. defoliation', () => {
    test('body_part=heavy → trim range i18n', () => {
      expect(chipsToStr(chipsOf('defoliation', { body_part: 'heavy' }))).toEqual([
        'historyLabelTrimRangeHeavy',
      ]);
    });
  });
  describe('10. deshoot', () => {
    test('body_part=tips_only → trim range i18n', () => {
      expect(chipsToStr(chipsOf('deshoot', { body_part: 'tips_only' }))).toEqual([
        'historyLabelTrimRangeTipsOnly',
      ]);
    });
  });

  // ============================================================
  // 11. candle_cut: body_part + count
  // ============================================================
  describe('11. candle_cut', () => {
    test('body_part=moderate + count=5 → 2 chips', () => {
      expect(chipsToStr(chipsOf('candle_cut', { body_part: 'moderate', count: 5 }))).toEqual([
        'historyLabelTrimRangeModerate',
        '×5',
      ]);
    });
    test('count のみ → 1 chip', () => {
      expect(chipsToStr(chipsOf('candle_cut', { count: 3 }))).toEqual(['×3']);
    });
  });

  // ============================================================
  // 12. moss_care: action = attach/remove/moisten
  // ============================================================
  describe('12. moss_care', () => {
    test('action=attach → moss action i18n', () => {
      expect(chipsToStr(chipsOf('moss_care', { action: 'attach' }))).toEqual([
        'historyLabelMossActionAttach',
      ]);
    });
    test('action=moisten → 新 i18n key', () => {
      expect(chipsToStr(chipsOf('moss_care', { action: 'moisten' }))).toEqual([
        'historyLabelMossActionMoisten',
      ]);
    });
  });

  // ============================================================
  // 13. position_change: from / to (free text)
  // ============================================================
  describe('13. position_change', () => {
    test('to=「ベランダ南」 → 「→ ベランダ南」 形式', () => {
      expect(chipsToStr(chipsOf('position_change', { to: 'ベランダ南' }))).toEqual([
        '→ ベランダ南',
      ]);
    });
    test('to 空 + from=「室内」 → from 表示', () => {
      expect(chipsToStr(chipsOf('position_change', { from: '室内', to: '' }))).toEqual(['室内']);
    });
  });

  // ============================================================
  // 14. leaf_first_aid: symptom + treatment (旧 silent fallthrough bug fix)
  // ============================================================
  describe('14. leaf_first_aid (ADR-0041 D4 bug fix: 旧 case 欠落)', () => {
    test('symptom=burn + treatment=「半日陰移動」 → 2 chips', () => {
      expect(
        chipsToStr(chipsOf('leaf_first_aid', { symptom: 'burn', treatment: '半日陰移動' })),
      ).toEqual(['historyLabelLeafAidSymptomBurn', '半日陰移動']);
    });
    test('symptom のみ (treatment 未入力) → 1 chip', () => {
      expect(chipsToStr(chipsOf('leaf_first_aid', { symptom: 'mold' }))).toEqual([
        'historyLabelLeafAidSymptomMold',
      ]);
    });
    test('symptom=other → 独立 LEAF_AID_SYMPTOM_LABEL_MAP で resolve (FERT other と分離)', () => {
      expect(chipsToStr(chipsOf('leaf_first_aid', { symptom: 'other' }))).toEqual([
        'historyLabelLeafAidSymptomOther',
      ]);
    });
  });

  // ============================================================
  // Edge cases: 空 / 不正 / 旧 schema
  // ============================================================
  describe('Edge cases', () => {
    test('payloadJson=null → 空配列 (新規 event の payload 未保存時)', () => {
      expect(buildHistoryChips({ type: 'watering', payloadJson: null })).toEqual([]);
    });
    test('payloadJson=不正 JSON → 空配列 (graceful degradation)', () => {
      expect(buildHistoryChips({ type: 'watering', payloadJson: '{not json' })).toEqual([]);
    });
    test('不正 type → 空配列 (graceful degradation、 EVENT_TYPES 外)', () => {
      // exhaustive switch の default 分岐で空配列を返す
      expect(buildHistoryChips({ type: 'unknown_type', payloadJson: '{}' })).toEqual([]);
    });
    test('旧 schema event (legacy field 名) → 空配列 (forward-only、 chip ゼロは正常)', () => {
      // 旧 watering: amount_ml (number) は新 payload schema 'amount' (string) と異なる
      expect(buildHistoryChips({ type: 'watering', payloadJson: '{"amount_ml": 50}' })).toEqual([]);
    });
  });

  // ============================================================
  // Exhaustive coverage: EVENT_TYPES に対応する case が存在することを保証
  // (TypeScript compile-time check は exhaustive switch + `never` assertion で担保、
  //  本 test は runtime レベルで各 type を呼び出してエラーが出ないことを確認)
  // ============================================================
  describe('exhaustive: EVENT_TYPES 全 14 種別で buildHistoryChips が動作する', () => {
    test.each(EVENT_TYPES as readonly EventType[])('type=%s で chips[] を返す', (type) => {
      const result = buildHistoryChips({ type, payloadJson: '{}' });
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
