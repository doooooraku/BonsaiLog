/**
 * カスタム樹形 Repository — user 定義 樹形の CRUD (Sess13 PR-G、 schema v13)。
 *
 * 設計 (β 別手帳方式、 Sess13 Q-13 確定):
 * - master BONSAI_STYLES (enum 10 種) と分離管理 (`bonsai_styles_custom` table)
 * - picker で master + custom を UNION 表示
 * - bonsai.style column には raw text 保存 (enum 値 or custom name)
 * - export/backup 対象 (Q-22 a)
 *
 * Related:
 * - schema.ts: bonsaiStylesCustom table + schemaV13 SQL
 * - StylePickerScreen: UNION 表示 + 「+ カスタム入力」 modal
 */
import { ulid } from 'ulid';

import { getDb } from './db';
import { nowUtc } from '@/src/core/datetime/clock';
import { snakeToCamelRows } from './rowMapper';
import type { BonsaiStyleCustom } from './schema';

/**
 * Free 上限カスタム樹形数 (ADR-0049 Sess58 確定 機能 ⑥、 Sess59 PR5 で実装)。
 * Pro user は無制限。 master BONSAI_STYLES (enum 10 種) は対象外、 常に全 Free 利用可。
 */
export const FREE_CUSTOM_STYLE_LIMIT = 3;

export async function getAllCustomStyles(): Promise<BonsaiStyleCustom[]> {
  const db = await getDb();
  const raw = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM bonsai_styles_custom ORDER BY created_at ASC;',
  );
  return snakeToCamelRows<BonsaiStyleCustom>(raw);
}

export async function countAllCustomStyles(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM bonsai_styles_custom;',
  );
  return row?.count ?? 0;
}

/**
 * 新規カスタム樹形作成が可能か判定 (ADR-0049 Sess59 PR5)。
 * canCreateNewCustomSpecies と同パターン。
 */
export async function canCreateNewCustomStyle(rawName: string, isPro: boolean): Promise<boolean> {
  if (isPro) return true;
  const name = rawName.trim();
  if (name.length === 0) return false;
  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM bonsai_styles_custom WHERE name = ?;',
    [name],
  );
  if (existing) return true;
  const count = await countAllCustomStyles();
  return count < FREE_CUSTOM_STYLE_LIMIT;
}

/**
 * カスタム樹形を追加 (UNIQUE 制約あり、 同名は既存 row を返す)。
 */
export async function createOrFindCustomStyle(rawName: string): Promise<BonsaiStyleCustom> {
  const name = rawName.trim();
  if (name.length === 0) {
    throw new Error('Custom style name cannot be empty');
  }
  const db = await getDb();

  // 既存 check
  const existing = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM bonsai_styles_custom WHERE name = ?;',
    [name],
  );
  if (existing) {
    return {
      id: existing.id as string,
      name: existing.name as string,
      createdAt: existing.created_at as string,
    };
  }

  // 新規 INSERT
  const id = ulid();
  const createdAt = nowUtc() as string;
  await db.runAsync('INSERT INTO bonsai_styles_custom (id, name, created_at) VALUES (?, ?, ?);', [
    id,
    name,
    createdAt,
  ]);
  return { id, name, createdAt };
}

/**
 * カスタム樹形を削除 (id 指定)。
 */
export async function deleteCustomStyle(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM bonsai_styles_custom WHERE id = ?;', [id]);
}
