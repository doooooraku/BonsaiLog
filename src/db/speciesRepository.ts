/**
 * 樹種 (species) Repository - 検索 + 通称取得 + マスタ参照。
 *
 * Related:
 * - Issue #14 F-01 foundation (PR-C)
 * - schema.ts: species + species_names テーブル
 * - seedSpecies.ts: 50 種マスタ初期データ (ja + en)
 *
 * 設計方針:
 * - read-only (CRUD の Create/Update/Delete はマスタ管理ツール経由、本 Repository では未実装)
 * - locale フォールバック: 指定 locale → en → 学名
 * - Drizzle 型推論で型安全 + raw SQL で expo-sqlite と直結
 */
import { getDb } from './db';
import { snakeToCamelRow, snakeToCamelRows } from './rowMapper';
import type { Species, SpeciesName } from './schema';
import { SPECIES_SEED_IDS } from './seedSpecies';

// ---------------------------------------------------------------------------
// 型定義 (UI 用、species + 通称をフラットに合成)
// ---------------------------------------------------------------------------

export type SpeciesWithName = Species & {
  /** 指定 locale の通称、なければ en、それもなければ学名 */
  commonName: string;
  /** 指定 locale の通称が存在したかどうか (UI で「未翻訳」表示用) */
  hasNameInLocale: boolean;
};

// ---------------------------------------------------------------------------
// 取得系
// ---------------------------------------------------------------------------

/**
 * 樹種を ID で取得 + locale 通称合成。
 */
export async function getSpeciesById(id: string, locale: string): Promise<SpeciesWithName | null> {
  const db = await getDb();
  const raw = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM species WHERE id = ?;',
    [id],
  );
  const species = snakeToCamelRow<Species>(raw);
  if (!species) return null;
  return resolveCommonName(db, species, locale);
}

/**
 * 樹種を学名で取得 + locale 通称合成。
 */
export async function getSpeciesByScientificName(
  scientificName: string,
  locale: string,
): Promise<SpeciesWithName | null> {
  const db = await getDb();
  const raw = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM species WHERE scientific_name = ?;',
    [scientificName],
  );
  const species = snakeToCamelRow<Species>(raw);
  if (!species) return null;
  return resolveCommonName(db, species, locale);
}

/**
 * 全樹種一覧を locale 通称付きで取得 (アイウエオ順 / アルファベット順)。
 */
export async function getAllSpecies(locale: string): Promise<SpeciesWithName[]> {
  const db = await getDb();
  const rawRows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM species ORDER BY scientific_name ASC;',
  );
  const species = snakeToCamelRows<Species>(rawRows);

  const results: SpeciesWithName[] = [];
  for (const s of species) {
    results.push(await resolveCommonName(db, s, locale));
  }

  // locale 通称優先で再ソート (シニア向け、native 名でアイウエオ順)
  // resolveCommonName が指定 locale の翻訳を見つけられない場合 commonName が undefined になり得る
  // → 空文字フォールバックで TypeError: Cannot read property 'localeCompare' of undefined を防ぐ
  return results.sort((a, b) =>
    (a.commonName ?? '').localeCompare(b.commonName ?? '', locale === 'ja' ? 'ja' : locale),
  );
}

/**
 * ADR-0026 / Sess15 PR-GG: SPECIES_SEED 5 種以外を DB から削除 (起動時 clean migration)。
 *
 * 過去 user なし前提 (案 α 採用) でも、 dev 環境では旧 50 種 seed の残骸が DB に残るため、
 * 起動時に 5 種以外を物理削除する。
 *
 * - bonsai.species_id が削除対象を参照していた場合は NULL に reset (FK ON DELETE SET NULL)。
 * - INSERT OR IGNORE の冪等性は SPECIES_SEED 側で保証されているので、 削除後の再 seed は不要。
 */
export async function cleanupObsoleteSpecies(): Promise<{ deleted: number }> {
  const db = await getDb();
  const placeholders = SPECIES_SEED_IDS.map(() => '?').join(',');
  const result = await db.runAsync(
    `DELETE FROM species WHERE id NOT IN (${placeholders});`,
    SPECIES_SEED_IDS,
  );
  return { deleted: result.changes ?? 0 };
}

// ---------------------------------------------------------------------------
// 内部ヘルパー
// ---------------------------------------------------------------------------

async function resolveCommonName(
  db: Awaited<ReturnType<typeof getDb>>,
  species: Species,
  locale: string,
): Promise<SpeciesWithName> {
  const rawLocale = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM species_names WHERE species_id = ? AND locale = ?;',
    [species.id, locale],
  );
  const localeName = snakeToCamelRow<SpeciesName>(rawLocale);

  if (localeName) {
    return { ...species, commonName: localeName.commonName, hasNameInLocale: true };
  }

  // フォールバック: en
  if (locale !== 'en') {
    const rawEn = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM species_names WHERE species_id = ? AND locale = ?;',
      [species.id, 'en'],
    );
    const enName = snakeToCamelRow<SpeciesName>(rawEn);
    if (enName) {
      return { ...species, commonName: enName.commonName, hasNameInLocale: false };
    }
  }

  // 最終フォールバック: 学名
  return { ...species, commonName: species.scientificName, hasNameInLocale: false };
}
