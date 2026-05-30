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
