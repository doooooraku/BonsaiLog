/**
 * F-10 樹種別サマリ CSV (保有樹種の集計) の純関数 (Issue #33 / ADR-0016 Amended)。
 *
 * 旧実装は「樹種マスタ辞書 (学名/科/耐寒ゾーン)」ダンプだったが、ユーザーにとっては
 * 「自分の保有樹種ごとの集計」が有用 (mockup 本来の意図)。樹種ごとに 保有数 +
 * 種別別の最終作業日 (水やり/剪定/植替え/施肥) を集計する。
 *
 * 列: 樹種 / 保有数 / 最終水やり / 最終剪定 / 最終植替え / 最終施肥
 */
import { formatLocal } from '@/src/core/datetime/format';
import type { IsoUtc, TzIana } from '@/src/core/datetime/types';
import type { TranslationKey } from '@/src/core/i18n/i18n';

type Tfn = (key: TranslationKey) => string;

/** 樹種別サマリ CSV のヘッダ用 i18n キー (列順 = buildSpeciesSummaryRows と一致)。 */
export const SPECIES_CSV_HEADER_KEYS: readonly TranslationKey[] = [
  'csvColSpeciesName',
  'csvColSpeciesCount',
  'csvColSpeciesLastWatering',
  'csvColSpeciesLastPruning',
  'csvColSpeciesLastRepotting',
  'csvColSpeciesLastFertilizing',
];

/** 最終作業日を集計する作業種別 (列順)。 */
const TRACKED_TYPES = ['watering', 'pruning', 'repotting', 'fertilizing'] as const;
type TrackedType = (typeof TRACKED_TYPES)[number];

export type SpeciesSummaryBonsai = { id: string; speciesName: string | null };
export type SpeciesSummaryEvent = {
  bonsaiId: string;
  type: string;
  occurredAtUtc: string;
  tzIana: string;
};

function formatDate(occurredAtUtc: string, tzIana: string): string {
  try {
    return formatLocal(occurredAtUtc as IsoUtc, tzIana as TzIana, 'yyyy-MM-dd');
  } catch {
    return occurredAtUtc.slice(0, 10);
  }
}

/**
 * 保有樹種ごとに 保有数 + 種別別最終作業日 を集計し CSV セル行配列 (header 含まず) を返す。
 * @param unsetLabel 樹種未設定の盆栽をまとめる表示名 (例: 「（未設定）」)
 */
export function buildSpeciesSummaryRows(
  bonsai: readonly SpeciesSummaryBonsai[],
  events: readonly SpeciesSummaryEvent[],
  t: Tfn,
  unsetLabel: string,
): string[][] {
  // bonsaiId → 樹種名 (未設定は unsetLabel)
  const speciesOf = new Map<string, string>();
  const counts = new Map<string, number>();
  for (const b of bonsai) {
    const name = b.speciesName && b.speciesName.length > 0 ? b.speciesName : unsetLabel;
    speciesOf.set(b.id, name);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  // 樹種 × 種別 → 最新 event (occurredAtUtc 文字列比較は ISO なので辞書順 = 時系列)
  const latest = new Map<string, Map<TrackedType, SpeciesSummaryEvent>>();
  for (const e of events) {
    if (!(TRACKED_TYPES as readonly string[]).includes(e.type)) continue;
    const species = speciesOf.get(e.bonsaiId);
    if (species == null) continue; // 集計対象外 (アーカイブ等) の盆栽
    const byType = latest.get(species) ?? new Map<TrackedType, SpeciesSummaryEvent>();
    const cur = byType.get(e.type as TrackedType);
    if (!cur || e.occurredAtUtc > cur.occurredAtUtc) {
      byType.set(e.type as TrackedType, e);
    }
    latest.set(species, byType);
  }

  // 保有数降順 → 樹種名昇順で安定ソート
  const speciesNames = [...counts.keys()].sort((a, b) => {
    const d = (counts.get(b) ?? 0) - (counts.get(a) ?? 0);
    return d !== 0 ? d : a.localeCompare(b);
  });

  return speciesNames.map((name) => {
    const byType = latest.get(name);
    const lastCell = (type: TrackedType): string => {
      const ev = byType?.get(type);
      return ev ? formatDate(ev.occurredAtUtc, ev.tzIana) : '';
    };
    return [
      name,
      String(counts.get(name) ?? 0),
      lastCell('watering'),
      lastCell('pruning'),
      lastCell('repotting'),
      lastCell('fertilizing'),
    ];
  });
}
