/**
 * 樹種マスタ初期データ (ADR-0026 で 50 → 5 種に物理削減、 カスタム入力主軸へ転換)。
 *
 * Related:
 * - ADR-0026 `docs/adr/ADR-0026-master-data-reduction-and-custom-first.md`
 * - Issue #14 AC2 (本 ADR で supersede、 旧 AC「50 種以上」 → 新 AC「5 種 seed」)
 * - basic_spec.md §10.1 (改訂済、 代表樹種 5 件)
 *
 * 5 種の選定根拠 (代表的人気種):
 * - 黒松 (Pinus thunbergii) — 盆栽の代表種、 松柏類
 * - モミジ (Acer palmatum) — 雑木類の代表、 紅葉が人気
 * - イチョウ (Ginkgo biloba) — 雑木類、 黄葉が人気
 * - 梅 (Prunus mume) — 花物の代表、 早春の花
 * - 真柏 (Juniperus chinensis) — 松柏類の代表、 シャリ・ジン表現
 *
 * 残り 45 種はユーザーが `bonsai_species_custom` table 経由で個別に追加。
 *
 * 出典: Bonsai Empire Tree Species Guide / 藤岡友宏『盆栽入門』近代盆栽 / Wikipedia 樹種ページ。
 */
import { ulid } from 'ulid';

export type SpeciesSeed = {
  id: string;
  scientificName: string;
  family: string | null;
  climateZoneMin: number | null;
  climateZoneMax: number | null;
  names: { ja: string; en: string };
};

/**
 * 5 種樹種マスタ (ADR-0026 採用、 代表的人気種のみ)。
 *
 * ID は固定 ULID で生成 (再 seed 時の冪等性維持のため、 ファイル内で同じ値を返す)。
 * 起動時に once seed → species テーブルに INSERT OR IGNORE で投入。
 */
function seedId(prefix: string): string {
  return `species_${prefix}`;
}

// Sess15 PR-GG: 人気順 (案 A 確定、 盆栽教本 / Bonsai Empire の出現頻度順): 黒松 → モミジ → 真柏 → 梅 → イチョウ。
export const SPECIES_SEED: SpeciesSeed[] = [
  {
    id: seedId('pinus_thunbergii'),
    scientificName: 'Pinus thunbergii',
    family: 'Pinaceae',
    climateZoneMin: 5,
    climateZoneMax: 9,
    names: { ja: '黒松', en: 'Japanese Black Pine' },
  },
  {
    id: seedId('acer_palmatum'),
    scientificName: 'Acer palmatum',
    family: 'Sapindaceae',
    climateZoneMin: 5,
    climateZoneMax: 9,
    names: { ja: 'モミジ', en: 'Japanese Maple' },
  },
  {
    id: seedId('juniperus_chinensis'),
    scientificName: 'Juniperus chinensis',
    family: 'Cupressaceae',
    climateZoneMin: 4,
    climateZoneMax: 9,
    names: { ja: '真柏', en: 'Chinese Juniper' },
  },
  {
    id: seedId('prunus_mume'),
    scientificName: 'Prunus mume',
    family: 'Rosaceae',
    climateZoneMin: 6,
    climateZoneMax: 9,
    names: { ja: '梅', en: 'Japanese Apricot' },
  },
  {
    id: seedId('ginkgo_biloba'),
    scientificName: 'Ginkgo biloba',
    family: 'Ginkgoaceae',
    climateZoneMin: 4,
    climateZoneMax: 9,
    names: { ja: 'イチョウ', en: 'Ginkgo' },
  },
];

/**
 * Seed ID のみの配列 (DB clean migration で 「seed 外 species を削除」 判定に使用)。
 */
export const SPECIES_SEED_IDS = SPECIES_SEED.map((s) => s.id);

/**
 * Seed 件数の検証 (ADR-0026: 5 種厳格固定)。
 */
export const SPECIES_SEED_COUNT = SPECIES_SEED.length;

if (SPECIES_SEED_COUNT !== 5) {
  // ビルド時静的検証 (テストでも担保)
  throw new Error(
    `SPECIES_SEED has ${SPECIES_SEED_COUNT} entries, but ADR-0026 requires exactly 5. See docs/adr/ADR-0026-master-data-reduction-and-custom-first.md`,
  );
}

// `ulid` import warning suppression (将来 dynamic ID 生成で使用予定)
void ulid;
