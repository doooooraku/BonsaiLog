/**
 * Sess14 PR-L 単位変換 utility unit tests。
 *
 * 検証観点:
 * - cm/mm/inch 各方向の変換正確性
 * - round-trip (unitToCm → cmToUnit) で値が保持される
 * - 不正入力 (negative, NaN, empty) で null 返却
 */
import { cmToUnit, unitToCm } from '@/src/core/util/potUnitConvert';

describe('potUnitConvert', () => {
  describe('cmToUnit', () => {
    test('cm: identity', () => {
      expect(cmToUnit(12, 'cm')).toBe('12.0');
      expect(cmToUnit(12.5, 'cm')).toBe('12.5');
      expect(cmToUnit(0, 'cm')).toBe('0.0');
    });

    test('mm: cm × 10', () => {
      expect(cmToUnit(12, 'mm')).toBe('120');
      expect(cmToUnit(12.5, 'mm')).toBe('125');
      expect(cmToUnit(0, 'mm')).toBe('0');
    });

    test('inch: cm × 0.3937 (2 decimals)', () => {
      expect(cmToUnit(2.54, 'inch')).toBe('1.00');
      expect(cmToUnit(12, 'inch')).toBe('4.72');
      expect(cmToUnit(0, 'inch')).toBe('0.00');
    });

    test('null/negative/NaN → null', () => {
      expect(cmToUnit(null, 'cm')).toBeNull();
      expect(cmToUnit(undefined, 'cm')).toBeNull();
      expect(cmToUnit(-5, 'cm')).toBeNull();
      expect(cmToUnit(NaN, 'cm')).toBeNull();
    });
  });

  describe('unitToCm', () => {
    test('cm: identity', () => {
      expect(unitToCm('12', 'cm')).toBe(12);
      expect(unitToCm('12.5', 'cm')).toBe(12.5);
    });

    test('mm: ÷ 10', () => {
      expect(unitToCm('120', 'mm')).toBe(12);
      expect(unitToCm('125', 'mm')).toBe(12.5);
    });

    test('inch: × 2.54', () => {
      expect(unitToCm('1', 'inch')).toBe(2.54);
      expect(unitToCm('5', 'inch')).toBe(12.7);
    });

    test('empty/negative/non-numeric → null', () => {
      expect(unitToCm('', 'cm')).toBeNull();
      expect(unitToCm('   ', 'cm')).toBeNull();
      expect(unitToCm('-5', 'cm')).toBeNull();
      expect(unitToCm('abc', 'cm')).toBeNull();
    });
  });

  describe('round-trip', () => {
    test('cm: 12 → 12 (lossless)', () => {
      const cm = unitToCm('12', 'cm');
      expect(cm).not.toBeNull();
      expect(cmToUnit(cm, 'cm')).toBe('12.0');
    });

    test('mm: 120 → 120 (lossless)', () => {
      const cm = unitToCm('120', 'mm');
      expect(cm).not.toBeNull();
      expect(cmToUnit(cm, 'mm')).toBe('120');
    });

    test('inch: 5.00 → 5.00 (rounded)', () => {
      const cm = unitToCm('5', 'inch');
      expect(cm).not.toBeNull();
      expect(cmToUnit(cm, 'inch')).toBe('5.00');
    });

    test('cross-unit: cm → inch → cm (within tolerance)', () => {
      const original = 12.7; // cm
      const inchStr = cmToUnit(original, 'inch'); // '5.00'
      const backCm = unitToCm(inchStr!, 'inch'); // 12.7
      expect(backCm).toBeCloseTo(original, 4);
    });
  });
});
