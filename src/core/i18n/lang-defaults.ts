/**
 * 言語別 default 値の集約 (ADR-0026 で確定、 user 指示「言語別に決めておきましょう」 反映)。
 *
 * Related:
 * - ADR-0026 `docs/adr/ADR-0026-master-data-reduction-and-custom-first.md`
 * - constraints.md §3-1 (19 言語対応)
 * - 単位慣習 一次情報: メートル条約批准国一覧 https://www.bipm.org/en/cgpm-membership
 *
 * 設計方針:
 * - 19 言語すべての default を明示マッピング (将来 region-specific で en-US=inch 等に分岐余地を残す)
 * - 現時点では全 19 言語 = 'cm' (世界の盆栽人口の大多数がメートル法圏、 米 user は settings で inch に変更可能)
 * - `useSettingsStore.potUnit` の default は本 map から決定 (起動時 init)
 */
import type { PotUnit } from '@/src/types/units';

/**
 * 言語別 default 鉢情報単位。
 *
 * 全 19 言語 = 'cm':
 * - 日本 / 中国 / 韓国 / 東南アジア / ヨーロッパ / 中南米 / インド / トルコ / ロシア:
 *   メートル条約批准国、 cm 慣習
 * - 英語 (en): 米国はインペリアル (inch) だが、 英国 / 豪 / NZ / カナダ / シンガポール 等の英語圏も含むため、
 *   グローバル整合性を優先して 'cm' を default、 米国 user は settings で 'inch' に変更可能
 *   (Sess15 議論 Q9 確定、 region 分離は v1.x で再検討)
 */
export const LANG_DEFAULT_POT_UNIT: Record<string, PotUnit> = {
  ja: 'cm',
  en: 'cm', // Sess15 Q9: グローバル整合性で cm default、 米 user は settings で inch 変更
  fr: 'cm',
  es: 'cm',
  de: 'cm',
  it: 'cm',
  pt: 'cm',
  ru: 'cm',
  'zh-Hans': 'cm',
  'zh-Hant': 'cm',
  ko: 'cm',
  hi: 'cm',
  id: 'cm',
  th: 'cm',
  vi: 'cm',
  tr: 'cm',
  nl: 'cm',
  pl: 'cm',
  sv: 'cm',
};

/**
 * lang から default 単位を取得 (該当 lang が無い場合 'cm' fallback)。
 */
export function getDefaultPotUnitForLang(lang: string): PotUnit {
  return LANG_DEFAULT_POT_UNIT[lang] ?? 'cm';
}
