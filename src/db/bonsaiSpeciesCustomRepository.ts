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

export async function getAllCustomSpecies(): Promise<BonsaiSpeciesCustom[]> {
  const db = await getDb();
  const raw = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM bonsai_species_custom ORDER BY created_at ASC;',
  );
  return snakeToCamelRows<BonsaiSpeciesCustom>(raw);
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
