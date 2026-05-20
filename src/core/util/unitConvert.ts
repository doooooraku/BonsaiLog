/**
 * unitConvert — 単位変換 generic utility (Sess17 PR-E2、 ADR-0029 D3 整合)。
 *
 * 既存 potUnitConvert.ts (Sess14 PR-L、 鉢サイズ専用) を generic 化、
 * 将来の domain (太さ系 / 量系 etc.) 拡張に備える。
 *
 * 現在の対応 domain:
 * - 長さ系 (LengthUnit): 'cm' | 'mm' | 'inch'
 *   canonical = 'cm' (DB 保存は cm)
 *
 * 設計方針:
 * - DB 保存は canonical 単位で統一 (現状すべて 'cm')
 * - 入力時: user 入力単位 → canonical へ正規化 (toCanonical)
 * - 表示時: canonical → user 表示単位へ変換 (fromCanonical)
 *
 * 注意:
 * - 浮動小数 round-trip 誤差: fromCanonical(toCanonical(5, 'inch'), 'inch') ≈ 5.0 (丸めで担保)
 * - 負数 / NaN は null 返却 (UI 側で空欄表示)
 *
 * 関連: docs/reference/design_system.md §14 数値+単位 field 規約
 *       src/core/util/potUnitConvert.ts (backward-compat wrapper)
 */

// =========================================================================
// LengthUnit (長さ系: 鉢サイズ等)
// =========================================================================

export const LENGTH_UNITS = ['cm', 'mm', 'inch'] as const;
export type LengthUnit = (typeof LENGTH_UNITS)[number];

const INCH_PER_CM = 0.3937007874015748;
const CM_PER_INCH = 2.54;
const MM_PER_CM = 10;

/** 表示時の小数桁数 (単位ごと、 慣習に合わせる)。 */
const LENGTH_DECIMAL_DIGITS: Record<LengthUnit, number> = {
  cm: 1,
  mm: 0,
  inch: 2,
};

/**
 * cm → 指定単位へ変換し toFixed 丸めた文字列を返す。
 * null/NaN/負数 入力は null 返却。
 *
 * @example
 *   lengthFromCanonical(18, 'cm')   // '18.0'
 *   lengthFromCanonical(18, 'mm')   // '180'
 *   lengthFromCanonical(18, 'inch') // '7.09'
 */
export function lengthFromCanonical(
  cmValue: number | null | undefined,
  unit: LengthUnit,
): string | null {
  if (cmValue == null || !Number.isFinite(cmValue) || cmValue < 0) return null;
  let converted: number;
  switch (unit) {
    case 'cm':
      converted = cmValue;
      break;
    case 'mm':
      converted = cmValue * MM_PER_CM;
      break;
    case 'inch':
      converted = cmValue * INCH_PER_CM;
      break;
  }
  return converted.toFixed(LENGTH_DECIMAL_DIGITS[unit]);
}

/**
 * 指定単位の入力文字列 → cm へ変換。
 * 不正値は null 返却。
 *
 * @example
 *   lengthToCanonical('18',  'cm')   // 18
 *   lengthToCanonical('180', 'mm')   // 18
 *   lengthToCanonical('7.09','inch') // 18.0086... (誤差吸収のため fromCanonical で丸め推奨)
 */
export function lengthToCanonical(inputText: string, unit: LengthUnit): number | null {
  const trimmed = inputText.trim();
  if (trimmed.length === 0) return null;
  const parsed = parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  switch (unit) {
    case 'cm':
      return parsed;
    case 'mm':
      return parsed / MM_PER_CM;
    case 'inch':
      return parsed * CM_PER_INCH;
  }
}

/**
 * 単位の表示 label (将来 i18n 対応する場合は別途 mapper 用意)。
 */
export function lengthUnitLabel(unit: LengthUnit): string {
  return unit;
}
