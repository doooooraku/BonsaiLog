/**
 * 鉢サイズ単位変換 utility (Sess14 PR-L)。
 *
 * 設計方針:
 * - DB 保存は **常に cm 数値** (内部統一)
 * - 入力時: user 設定単位 → cm へ正規化
 * - 表示時: cm → user 設定単位へ変換 (toFixed 丸めで浮動小数誤差吸収)
 *
 * 単位定義 (src/types/units.PotUnit):
 * - 'cm':   1 cm = 1 cm
 * - 'mm':   1 cm = 10 mm
 * - 'inch': 1 cm = 0.3937007874 inch (1 inch = 2.54 cm)
 *
 * 注意:
 * - 浮動小数 round-trip 誤差: cmToUnit(unitToCm(5, 'inch'), 'inch') が 5.0 に戻る保証は丸めで担保
 * - 負数 / NaN は null 返却 (UI 側で空欄表示)
 */
import type { PotUnit } from '@/src/types/units';

const INCH_PER_CM = 0.3937007874015748;
const CM_PER_INCH = 2.54;
const MM_PER_CM = 10;

/** 表示時の小数桁数 (単位ごと、 慣習に合わせる)。 */
const DECIMAL_DIGITS: Record<PotUnit, number> = {
  cm: 1,
  mm: 0,
  inch: 2,
};

/**
 * cm → user 設定単位 へ変換し toFixed 丸めた文字列を返す。
 * null/NaN/負数 入力は null 返却。
 */
export function cmToUnit(cmValue: number | null | undefined, unit: PotUnit): string | null {
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
  return converted.toFixed(DECIMAL_DIGITS[unit]);
}

/**
 * user 設定単位 → cm へ変換 (input 文字列 parseFloat)。
 * 不正値は null 返却。
 */
export function unitToCm(inputText: string, unit: PotUnit): number | null {
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
 * 表示用 placeholder 文字列。 i18n key の {unit} 置換用に使う。
 */
export function unitLabel(unit: PotUnit): string {
  return unit;
}
