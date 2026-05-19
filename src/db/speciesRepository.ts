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
 * 樹種を検索 (学名 + 通称、部分一致)。
 *
 * 検索順:
 * 1. 通称 (指定 locale) で部分一致
 * 2. 学名で部分一致
 * 3. 通称 (en) で部分一致 (フォールバック)
 *
 * 重複は除外。空クエリなら全件返却 (getAllSpecies 同等)。
 */
export async function searchSpecies(query: string, locale: string): Promise<SpeciesWithName[]> {
  const trimmed = query.trim();
  if (!trimmed) return getAllSpecies(locale);

  const db = await getDb();
  const pattern = `%${trimmed}%`;

  // 通称 (locale) で検索
  const byNameLocaleRaw = await db.getAllAsync<Record<string, unknown>>(
    `SELECT DISTINCT s.* FROM species s
     INNER JOIN species_names n ON s.id = n.species_id
     WHERE n.locale = ? AND n.common_name LIKE ?;`,
    [locale, pattern],
  );
  const byNameLocale = snakeToCamelRows<Species>(byNameLocaleRaw);

  // 学名で検索
  const byScientificRaw = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM species WHERE scientific_name LIKE ?;',
    [pattern],
  );
  const byScientific = snakeToCamelRows<Species>(byScientificRaw);

  // 通称 (en) で検索 (locale=en の場合は重複なのでスキップ)
  const byNameEn =
    locale === 'en'
      ? []
      : snakeToCamelRows<Species>(
          await db.getAllAsync<Record<string, unknown>>(
            `SELECT DISTINCT s.* FROM species s
         INNER JOIN species_names n ON s.id = n.species_id
         WHERE n.locale = 'en' AND n.common_name LIKE ?;`,
            [pattern],
          ),
        );

  // 重複除外 (id ベース、検索順序を維持)
  const seen = new Set<string>();
  const merged: Species[] = [];
  for (const list of [byNameLocale, byScientific, byNameEn]) {
    for (const s of list) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        merged.push(s);
      }
    }
  }

  // 通称合成
  const results: SpeciesWithName[] = [];
  for (const s of merged) {
    results.push(await resolveCommonName(db, s, locale));
  }
  return results;
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
