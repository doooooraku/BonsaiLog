/**
 * カスタム樹種 Repository — user 定義 樹種の CRUD (Sess13 PR-H、 schema v14)。
 *
 * 設計 (β 別手帳方式、 Sess13 Q-13 確定):
 * - master species (50 種、 species table) と分離管理 (`bonsai_species_custom` table)
 * - picker で master + custom を UNION 表示
 * - bonsai.species_id (master FK) or bonsai.custom_species_id (custom FK) どちらか一方
 * - export/backup 対象 (Q-22 a)
 */
import { ulid } from 'ulid';

import { nowUtc } from '@/src/core/datetime/clock';
import { getDb } from './db';
import { snakeToCamelRow, snakeToCamelRows } from './rowMapper';
import type { BonsaiSpeciesCustom } from './schema';

/**
 * Free 上限カスタム樹種数 (ADR-0049 Sess58 確定 機能 ⑥、 Sess59 PR5 で実装)。
 * Pro user は無制限。 master species (50 種) は対象外、 常に全 Free 利用可。
 */
export const FREE_CUSTOM_SPECIES_LIMIT = 3;

export async function getAllCustomSpecies(): Promise<BonsaiSpeciesCustom[]> {
  const db = await getDb();
  const raw = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM bonsai_species_custom ORDER BY created_at ASC;',
  );
  return snakeToCamelRows<BonsaiSpeciesCustom>(raw);
}

export async function countAllCustomSpecies(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM bonsai_species_custom;',
  );
  return row?.count ?? 0;
}

/**
 * 新規カスタム樹種作成が可能か判定 (ADR-0049 Sess59 PR5)。
 *
 * - 入力名が既存カスタム重複 → true (createOrFindCustomSpecies が既存返却)
 * - Pro → true (無制限)
 * - Free + countAllCustomSpecies() < 3 → true
 * - 上記以外 → false (Paywall 誘導)
 *
 * Grandfathered: 既存 4+ 件のカスタム樹種は表示 OK + 削除 OK + 新規追加のみ Paywall。
 */
export async function canCreateNewCustomSpecies(rawName: string, isPro: boolean): Promise<boolean> {
  if (isPro) return true;
  const name = rawName.trim();
  if (name.length === 0) return false;
  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM bonsai_species_custom WHERE name = ?;',
    [name],
  );
  if (existing) return true;
  const count = await countAllCustomSpecies();
  return count < FREE_CUSTOM_SPECIES_LIMIT;
}

export async function getCustomSpeciesById(id: string): Promise<BonsaiSpeciesCustom | null> {
  const db = await getDb();
  const raw = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM bonsai_species_custom WHERE id = ?;',
    [id],
  );
  return snakeToCamelRow<BonsaiSpeciesCustom>(raw);
}

export async function createOrFindCustomSpecies(rawName: string): Promise<BonsaiSpeciesCustom> {
  const name = rawName.trim();
  if (name.length === 0) {
    throw new Error('Custom species name cannot be empty');
  }
  const db = await getDb();

  const existing = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM bonsai_species_custom WHERE name = ?;',
    [name],
  );
  if (existing) {
    return {
      id: existing.id as string,
      name: existing.name as string,
      createdAt: existing.created_at as string,
    };
  }

  const id = ulid();
  const createdAt = nowUtc() as string;
  await db.runAsync('INSERT INTO bonsai_species_custom (id, name, created_at) VALUES (?, ?, ?);', [
    id,
    name,
    createdAt,
  ]);
  return { id, name, createdAt };
}

/**
 * Sess89 Phase 2 (ADR-0049 ⑥ Grandfathered 緩 削除 OK 構造実装): rename custom species。
 *
 * - 入力名 trim 後 empty → 'empty'
 * - 自身以外の重複 (UNIQUE 制約衝突回避) → 'duplicate'
 * - それ以外 → UPDATE 成功で 'ok'
 *
 * tagRepository.renameTag pattern 踏襲。 cascade 不要 (= bonsai.custom_species_id は FK で
 * id を参照、 name 変更で bonsai 側は自動追従)。
 */
export type RenameCustomSpeciesResult = 'ok' | 'empty' | 'duplicate';

export async function renameCustomSpecies(
  id: string,
  newRawName: string,
): Promise<RenameCustomSpeciesResult> {
  const name = newRawName.trim();
  if (name.length === 0) return 'empty';
  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM bonsai_species_custom WHERE name = ? AND id != ?;',
    [name, id],
  );
  if (existing) return 'duplicate';
  await db.runAsync('UPDATE bonsai_species_custom SET name = ? WHERE id = ?;', [name, id]);
  return 'ok';
}

/**
 * Sess89 Phase 2: カスタム樹種を物理削除。
 *
 * - schema v14 で bonsai.custom_species_id REFERENCES ... ON DELETE SET NULL 設定済のため、
 *   削除されたカスタム樹種を参照する bonsai は自動的に custom_species_id = NULL になる
 *   (= データ消失なし、 樹種を再選択する UI が機能する)。
 * - ADR-0049 ⑥ §Decision 「Grandfathered 緩 削除 OK」 の構造実装。
 */
export async function deleteCustomSpecies(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM bonsai_species_custom WHERE id = ?;', [id]);
}

/**
 * Sess89 Phase 2: カスタム樹種の使用件数 (= bonsai.custom_species_id を参照する bonsai 件数)。
 *
 * - 削除前の影響範囲警告 (= Linear pattern「N 件の盆栽から樹種が未設定になります」) 用途
 * - rename impact warning にも利用可能 (= ただし FK 連動で name 変更は影響ゼロ)
 */
export async function countBonsaiByCustomSpecies(id: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM bonsai WHERE custom_species_id = ? AND archived_at IS NULL;',
    [id],
  );
  return row?.count ?? 0;
}

/**
 * Sess89 Phase 2: カスタム樹種一覧 + 使用統計 (= 管理画面 row 表示用)。
 *
 * 各カスタム樹種について:
 * - usageCount: bonsai.custom_species_id で参照されている件数 (deleted_at IS NULL のみ)
 * - lastUsedAt: 該当 bonsai の最新 updated_at (= 樹種設定の最新変更時刻代替)、 未使用なら null
 *
 * tagRepository.getTagsWithStats pattern 踏襲、 LEFT JOIN で 1 query 完結。
 * 性能: ~100 件規模 想定 (Pro user で多くとも数百)、 idx 不要。
 */
export type CustomSpeciesWithStats = BonsaiSpeciesCustom & {
  usageCount: number;
  lastUsedAt: string | null;
};

export async function getCustomSpeciesWithStats(): Promise<CustomSpeciesWithStats[]> {
  const db = await getDb();
  const rawRows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT cs.id, cs.name, cs.created_at,
            COUNT(b.id) AS usageCount,
            MAX(b.updated_at) AS lastUsedAt
     FROM bonsai_species_custom cs
     LEFT JOIN bonsai b ON b.custom_species_id = cs.id AND b.archived_at IS NULL
     GROUP BY cs.id, cs.name, cs.created_at
     ORDER BY cs.created_at ASC;`,
  );
  return rawRows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    createdAt: row.created_at as string,
    usageCount: (row.usageCount as number) ?? 0,
    lastUsedAt: (row.lastUsedAt as string | null) ?? null,
  }));
}
