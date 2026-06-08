/**
 * payloadToFormState unit tests (Sess77 PR-2、 ADR-0055 連動)。
 *
 * 14 種別 × {正常 / 旧 field 名 fallback / null / 不正 JSON / schema 違反} の
 * snapshot 的網羅。 「buildWorkLogPayload → JSON.stringify → payloadToFormState」
 * round-trip も検証 (対称性確認)。
 *
 * 関連: src/features/event/payloadToFormState.ts /
 *       src/features/event/WorkLogTypeFormFields.ts (buildWorkLogPayload 対) /
 *       ADR-0055 §Acceptance / R-52 (EventType 4 同期確認、 14 種別網羅)
 */
import {
  buildWorkLogPayload,
  createWorkLogTypeFormInitialState,
  type WorkLogTypeFormState,
} from './WorkLogTypeFormFields';
import { payloadToFormState } from './payloadToFormState';

// =========================================================================
// helpers
// =========================================================================

function defaultState(unit: 'cm' | 'mm' | 'inch' = 'cm'): WorkLogTypeFormState {
  return createWorkLogTypeFormInitialState(unit);
}

/** payload object を JSON 文字列化 (events.payload_json に保存される形) */
function toJson(payload: Record<string, unknown>): string {
  return JSON.stringify(payload);
}

// =========================================================================
// 共通: null / 不正 JSON / 不正 type の defensive 動作
// =========================================================================

describe('payloadToFormState — defensive behavior', () => {
  it('null payloadJson → base default 返却', () => {
    const state = payloadToFormState('watering', null, 'cm');
    expect(state).toEqual(defaultState('cm'));
  });

  it('empty string payloadJson → base default 返却', () => {
    const state = payloadToFormState('watering', '', 'cm');
    expect(state).toEqual(defaultState('cm'));
  });

  it('不正 JSON → base default 返却 (crash しない)', () => {
    const state = payloadToFormState('watering', '{invalid json}', 'cm');
    expect(state).toEqual(defaultState('cm'));
  });

  it('schema 違反 (wrong type) → base default 返却', () => {
    // amount は string expect、 number 渡しは valibot で reject
    const state = payloadToFormState('watering', toJson({ amount: 42 }), 'cm');
    expect(state).toEqual(defaultState('cm'));
  });

  it('未知の field を含む payload → 既知 field のみ反映 (其他は base 維持)', () => {
    const state = payloadToFormState(
      'watering',
      toJson({ amount: 'plenty', unknown_field: 'ignored' }),
      'cm',
    );
    expect(state.waterAmount).toBe('plenty');
    // 他 field は base default 維持
    expect(state.pruneParts).toEqual(['eda']);
  });
});

// =========================================================================
// 14 種別 × 正常 case + edge case 網羅
// =========================================================================

describe('payloadToFormState — 14 種別', () => {
  // -----------------------------------------------------------------------
  // 1. watering
  // -----------------------------------------------------------------------
  describe('watering', () => {
    it('正常 payload (amount=plenty) → waterAmount 反映', () => {
      const state = payloadToFormState('watering', toJson({ amount: 'plenty' }), 'cm');
      expect(state.waterAmount).toBe('plenty');
    });

    it('amount=light → waterAmount 反映', () => {
      const state = payloadToFormState('watering', toJson({ amount: 'light' }), 'cm');
      expect(state.waterAmount).toBe('light');
    });

    it('amount=normal → waterAmount 反映 (default 値も明示的に確認)', () => {
      const state = payloadToFormState('watering', toJson({ amount: 'normal' }), 'cm');
      expect(state.waterAmount).toBe('normal');
    });

    it('不正 amount (invalid enum) → base default 維持', () => {
      const state = payloadToFormState('watering', toJson({ amount: 'extreme' }), 'cm');
      expect(state.waterAmount).toBe('normal');
    });

    it('round-trip (buildWorkLogPayload → payloadToFormState で同 state 復元)', () => {
      const initial = { ...defaultState('cm'), waterAmount: 'plenty' as const };
      const payload = buildWorkLogPayload('watering', initial);
      const restored = payloadToFormState('watering', toJson(payload), 'cm');
      expect(restored.waterAmount).toBe('plenty');
    });
  });

  // -----------------------------------------------------------------------
  // 2. pruning
  // -----------------------------------------------------------------------
  describe('pruning', () => {
    it('正常 payload (parts array + amount) → state 反映', () => {
      const state = payloadToFormState(
        'pruning',
        toJson({ parts: ['eda', 'ha'], amount: 'lot' }),
        'cm',
      );
      expect(state.pruneParts).toEqual(['eda', 'ha']);
      expect(state.pruneAmount).toBe('lot');
    });

    it('旧 field body_part (string) → 単要素 array に変換', () => {
      const state = payloadToFormState(
        'pruning',
        toJson({ body_part: 'shinme', amount: 'few' }),
        'cm',
      );
      expect(state.pruneParts).toEqual(['shinme']);
      expect(state.pruneAmount).toBe('few');
    });

    it('parts array に invalid value 混在 → valid のみ抽出', () => {
      const state = payloadToFormState(
        'pruning',
        toJson({ parts: ['eda', 'invalid', 'ne'], amount: 'some' }),
        'cm',
      );
      expect(state.pruneParts).toEqual(['eda', 'ne']);
    });

    it('parts 空 array → base default ([eda]) 維持', () => {
      const state = payloadToFormState('pruning', toJson({ parts: [], amount: 'some' }), 'cm');
      expect(state.pruneParts).toEqual(['eda']);
    });

    it('round-trip', () => {
      const initial = {
        ...defaultState('cm'),
        pruneParts: ['ha', 'ne'] as const,
        pruneAmount: 'lot' as const,
      };
      const payload = buildWorkLogPayload('pruning', initial);
      const restored = payloadToFormState('pruning', toJson(payload), 'cm');
      expect(restored.pruneParts).toEqual(['ha', 'ne']);
      expect(restored.pruneAmount).toBe('lot');
    });
  });

  // -----------------------------------------------------------------------
  // 3. wiring
  // -----------------------------------------------------------------------
  describe('wiring', () => {
    it('正常 payload (wire_size_mm + body_part + scheduled_unwire_at) → state 反映', () => {
      const state = payloadToFormState(
        'wiring',
        toJson({
          wire_size_mm: 1.5,
          body_part: 'miki',
          scheduled_unwire_at: '2026-06-15T00:00:00.000Z',
        }),
        'cm',
      );
      expect(state.wireGauge).toBe('1.5mm');
      expect(state.wireParts).toBe('miki');
      expect(state.wireUnwireDate).toBe('2026-06-15');
    });

    it('wire_size_mm = 整数 (1) → "1mm" 文字列', () => {
      const state = payloadToFormState('wiring', toJson({ wire_size_mm: 1 }), 'cm');
      expect(state.wireGauge).toBe('1mm');
    });

    it('preset 外 wire_size_mm (4.5) → "4.5mm" (自由入力扱い)', () => {
      const state = payloadToFormState('wiring', toJson({ wire_size_mm: 4.5 }), 'cm');
      expect(state.wireGauge).toBe('4.5mm');
    });

    it('scheduled_unwire_at なし → wireUnwireDate 空文字 (base default)', () => {
      const state = payloadToFormState('wiring', toJson({ wire_size_mm: 2 }), 'cm');
      expect(state.wireUnwireDate).toBe('');
    });

    it('round-trip (segment 値 2mm + parts + date)', () => {
      const initial: WorkLogTypeFormState = {
        ...defaultState('cm'),
        wireGauge: '2mm',
        wireParts: 'eda',
        wireUnwireDate: '2026-07-01',
      };
      const payload = buildWorkLogPayload('wiring', initial);
      const restored = payloadToFormState('wiring', toJson(payload), 'cm');
      expect(restored.wireGauge).toBe('2mm');
      expect(restored.wireParts).toBe('eda');
      expect(restored.wireUnwireDate).toBe('2026-07-01');
    });
  });

  // -----------------------------------------------------------------------
  // 4. unwiring
  // -----------------------------------------------------------------------
  describe('unwiring', () => {
    it('正常 payload (body_part=miki) → unwireParts 反映', () => {
      const state = payloadToFormState('unwiring', toJson({ body_part: 'miki' }), 'cm');
      expect(state.unwireParts).toBe('miki');
    });

    it('不正 body_part → base default (all) 維持', () => {
      const state = payloadToFormState('unwiring', toJson({ body_part: 'invalid' }), 'cm');
      expect(state.unwireParts).toBe('all');
    });

    it('round-trip', () => {
      const initial = { ...defaultState('cm'), unwireParts: 'eda' as const };
      const payload = buildWorkLogPayload('unwiring', initial);
      const restored = payloadToFormState('unwiring', toJson(payload), 'cm');
      expect(restored.unwireParts).toBe('eda');
    });
  });

  // -----------------------------------------------------------------------
  // 5. repotting (単位逆変換 cm canonical → user 設定単位)
  // -----------------------------------------------------------------------
  describe('repotting', () => {
    it('cm 単位 (18cm 保存) → state.repotPotSize "18.0"、 unit cm', () => {
      const state = payloadToFormState(
        'repotting',
        toJson({ pot_size_cm: 18, soil_mix: '赤玉土', root_pruning: 'third' }),
        'cm',
      );
      expect(state.repotPotSize).toBe('18.0');
      expect(state.repotPotSizeUnit).toBe('cm');
      expect(state.repotSoilMix).toBe('赤玉土');
      expect(state.repotRootAmount).toBe('third');
    });

    it('settingsPotUnit=mm (180mm 表示) → state.repotPotSize "180"', () => {
      const state = payloadToFormState(
        'repotting',
        toJson({ pot_size_cm: 18, root_pruning: 'light' }),
        'mm',
      );
      expect(state.repotPotSize).toBe('180');
      expect(state.repotPotSizeUnit).toBe('mm');
    });

    it('settingsPotUnit=inch (7.09inch 表示) → state.repotPotSize "7.09"', () => {
      const state = payloadToFormState(
        'repotting',
        toJson({ pot_size_cm: 18, root_pruning: 'none' }),
        'inch',
      );
      expect(state.repotPotSize).toBe('7.09');
      expect(state.repotPotSizeUnit).toBe('inch');
    });

    it('pot_size_cm 不在 → repotPotSize 空文字 (base default 維持) + unit は settingsPotUnit', () => {
      const state = payloadToFormState('repotting', toJson({ root_pruning: 'half' }), 'inch');
      expect(state.repotPotSize).toBe('');
      expect(state.repotPotSizeUnit).toBe('inch');
      expect(state.repotRootAmount).toBe('half');
    });

    it('round-trip (cm 入力 → cm 復元)', () => {
      const initial: WorkLogTypeFormState = {
        ...defaultState('cm'),
        repotPotSize: '18',
        repotPotSizeUnit: 'cm',
        repotSoilMix: '赤玉 7 / 桐生 3',
        repotRootAmount: 'half',
      };
      const payload = buildWorkLogPayload('repotting', initial);
      const restored = payloadToFormState('repotting', toJson(payload), 'cm');
      expect(restored.repotPotSize).toBe('18.0'); // lengthFromCanonical で toFixed(1)
      expect(restored.repotPotSizeUnit).toBe('cm');
      expect(restored.repotSoilMix).toBe('赤玉 7 / 桐生 3');
      expect(restored.repotRootAmount).toBe('half');
    });
  });

  // -----------------------------------------------------------------------
  // 6. fertilizing
  // -----------------------------------------------------------------------
  describe('fertilizing', () => {
    it('正常 payload (kind + amount) → state 反映', () => {
      const state = payloadToFormState(
        'fertilizing',
        toJson({ kind: 'liquid', amount: 'ハイポネックス 1000 倍' }),
        'cm',
      );
      expect(state.fertKind).toBe('liquid');
      expect(state.fertProduct).toBe('ハイポネックス 1000 倍');
    });

    it('amount 空 → fertProduct 空文字 (base default 維持)', () => {
      const state = payloadToFormState('fertilizing', toJson({ kind: 'solid' }), 'cm');
      expect(state.fertKind).toBe('solid');
      expect(state.fertProduct).toBe('');
    });

    it('round-trip', () => {
      const initial = {
        ...defaultState('cm'),
        fertKind: 'slow_release' as const,
        fertProduct: 'マグァンプ',
      };
      const payload = buildWorkLogPayload('fertilizing', initial);
      const restored = payloadToFormState('fertilizing', toJson(payload), 'cm');
      expect(restored.fertKind).toBe('slow_release');
      expect(restored.fertProduct).toBe('マグァンプ');
    });
  });

  // -----------------------------------------------------------------------
  // 7. pest_control
  // -----------------------------------------------------------------------
  describe('pest_control', () => {
    it('正常 payload (target + agent + dilution_ratio number)', () => {
      const state = payloadToFormState(
        'pest_control',
        toJson({ target: 'treatment', agent: 'スミチオン', dilution_ratio: 1000 }),
        'cm',
      );
      expect(state.pestPurpose).toBe('treatment');
      expect(state.pestAgent).toBe('スミチオン');
      expect(state.pestDilution).toBe('1000');
    });

    it('dilution_ratio 0 (number) → "0" 文字列', () => {
      const state = payloadToFormState('pest_control', toJson({ dilution_ratio: 0 }), 'cm');
      expect(state.pestDilution).toBe('0');
    });

    it('dilution_ratio 不在 → pestDilution 空文字 (base default 維持)', () => {
      const state = payloadToFormState('pest_control', toJson({ target: 'prevention' }), 'cm');
      expect(state.pestDilution).toBe('');
    });

    it('round-trip', () => {
      const initial: WorkLogTypeFormState = {
        ...defaultState('cm'),
        pestPurpose: 'both',
        pestAgent: 'ベニカ',
        pestDilution: '500',
      };
      const payload = buildWorkLogPayload('pest_control', initial);
      const restored = payloadToFormState('pest_control', toJson(payload), 'cm');
      expect(restored.pestPurpose).toBe('both');
      expect(restored.pestAgent).toBe('ベニカ');
      expect(restored.pestDilution).toBe('500');
    });
  });

  // -----------------------------------------------------------------------
  // 8-10. leaf_trimming / defoliation / deshoot (共通 body_part → trimRange)
  // -----------------------------------------------------------------------
  describe('leaf_trimming / defoliation / deshoot (共通)', () => {
    it.each(['leaf_trimming', 'defoliation', 'deshoot'] as const)(
      '%s: body_part=heavy → trimRange 反映',
      (type) => {
        const state = payloadToFormState(type, toJson({ body_part: 'heavy' }), 'cm');
        expect(state.trimRange).toBe('heavy');
      },
    );

    it('leaf_trimming round-trip', () => {
      const initial = { ...defaultState('cm'), trimRange: 'tips_only' as const };
      const payload = buildWorkLogPayload('leaf_trimming', initial);
      const restored = payloadToFormState('leaf_trimming', toJson(payload), 'cm');
      expect(restored.trimRange).toBe('tips_only');
    });
  });

  // -----------------------------------------------------------------------
  // 11. candle_cut
  // -----------------------------------------------------------------------
  describe('candle_cut', () => {
    it('正常 payload (body_part + count number)', () => {
      const state = payloadToFormState(
        'candle_cut',
        toJson({ body_part: 'moderate', count: 12 }),
        'cm',
      );
      expect(state.trimRange).toBe('moderate');
      expect(state.candleCount).toBe('12');
    });

    it('count 不在 → candleCount 空文字', () => {
      const state = payloadToFormState('candle_cut', toJson({ body_part: 'heavy' }), 'cm');
      expect(state.candleCount).toBe('');
    });

    it('round-trip (count 整数)', () => {
      const initial: WorkLogTypeFormState = {
        ...defaultState('cm'),
        trimRange: 'heavy',
        candleCount: '7',
      };
      const payload = buildWorkLogPayload('candle_cut', initial);
      const restored = payloadToFormState('candle_cut', toJson(payload), 'cm');
      expect(restored.trimRange).toBe('heavy');
      expect(restored.candleCount).toBe('7');
    });
  });

  // -----------------------------------------------------------------------
  // 12. moss_care
  // -----------------------------------------------------------------------
  describe('moss_care', () => {
    it('正常 payload (action=remove) → mossAction 反映', () => {
      const state = payloadToFormState('moss_care', toJson({ action: 'remove' }), 'cm');
      expect(state.mossAction).toBe('remove');
    });

    it('round-trip', () => {
      const initial = { ...defaultState('cm'), mossAction: 'moisten' as const };
      const payload = buildWorkLogPayload('moss_care', initial);
      const restored = payloadToFormState('moss_care', toJson(payload), 'cm');
      expect(restored.mossAction).toBe('moisten');
    });
  });

  // -----------------------------------------------------------------------
  // 13. position_change
  // -----------------------------------------------------------------------
  describe('position_change', () => {
    it('正常 payload (to=半日陰) → positionTo 反映', () => {
      const state = payloadToFormState('position_change', toJson({ to: '半日陰' }), 'cm');
      expect(state.positionTo).toBe('半日陰');
    });

    it('to 不在 → positionTo 空文字 (base default 維持)', () => {
      const state = payloadToFormState('position_change', toJson({}), 'cm');
      expect(state.positionTo).toBe('');
    });

    it('round-trip', () => {
      const initial = { ...defaultState('cm'), positionTo: '室内 明るい窓辺' };
      const payload = buildWorkLogPayload('position_change', initial);
      const restored = payloadToFormState('position_change', toJson(payload), 'cm');
      expect(restored.positionTo).toBe('室内 明るい窓辺');
    });
  });

  // -----------------------------------------------------------------------
  // 14. leaf_first_aid
  // -----------------------------------------------------------------------
  describe('leaf_first_aid', () => {
    it('正常 payload (symptom + treatment)', () => {
      const state = payloadToFormState(
        'leaf_first_aid',
        toJson({ symptom: 'burn', treatment: '日陰移動 + 葉水' }),
        'cm',
      );
      expect(state.leafAidSymptom).toBe('burn');
      expect(state.leafAidTreatment).toBe('日陰移動 + 葉水');
    });

    it('treatment 不在 → leafAidTreatment 空文字 (base default 維持)', () => {
      const state = payloadToFormState('leaf_first_aid', toJson({ symptom: 'wither' }), 'cm');
      expect(state.leafAidSymptom).toBe('wither');
      expect(state.leafAidTreatment).toBe('');
    });

    it('round-trip', () => {
      const initial = {
        ...defaultState('cm'),
        leafAidSymptom: 'pest' as const,
        leafAidTreatment: 'スミチオン散布 1000 倍',
      };
      const payload = buildWorkLogPayload('leaf_first_aid', initial);
      const restored = payloadToFormState('leaf_first_aid', toJson(payload), 'cm');
      expect(restored.leafAidSymptom).toBe('pest');
      expect(restored.leafAidTreatment).toBe('スミチオン散布 1000 倍');
    });
  });
});
