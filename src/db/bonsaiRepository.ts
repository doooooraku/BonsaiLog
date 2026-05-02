/**
 * 盆栽 (bonsai) Repository - CRUD + アーカイブ + 復元 + 樹種付き取得。
 *
 * Related:
 * - Issue #14 F-01 foundation (PR-C)
 * - schema.ts: bonsai テーブル + Drizzle 型推論
 * - speciesRepository.ts: 樹種マスタ参照
 *
 * 設計方針:
 * - ULID 主キー (id) + UTC ISO 8601 (created_at/updated_at/acquired_at/archived_at)
 * - アーカイブ = archived_at セット (NULL ならアクティブ)、物理削除は v1.x で deleteBonsai 別実装
 * - 樹種への FK は ON DELETE SET NULL (樹種マスタ更新で盆栽が消えないため)
 */
import { ulid } from 'ulid';

import { getDb } from './db';
import type { Bonsai, BonsaiInsert, BonsaiStyle } from './schema';
import { getSpeciesById, type SpeciesWithName } from './speciesRepository';

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

export type BonsaiWithSpecies = Bonsai & {
  species: SpeciesWithName | null;
};

export type CreateBonsaiInput = {
  name: string;
  speciesId?: string | null;
  acquiredAt?: string | null; // ISO 8601 UTC
  style?: BonsaiStyle | null;
  potInfo?: Record<string, unknown> | null; // JSON 化される
};

export type UpdateBonsaiInput = Partial<CreateBonsaiInput>;

// ---------------------------------------------------------------------------
// 作成
// ---------------------------------------------------------------------------

/**
 * 盆栽を新規登録。ULID で id を生成、created_at/updated_at は now (UTC)。
 */
export async function createBonsai(input: CreateBonsaiInput): Promise<Bonsai> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = ulid();

  const potInfoStr = input.potInfo ? JSON.stringify(input.potInfo) : null;

  await db.runAsync(
    `INSERT INTO bonsai
       (id, name, species_id, acquired_at, style, pot_info, archived_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?);`,
    [
      id,
      input.name,
      input.speciesId ?? null,
      input.acquiredAt ?? null,
      input.style ?? null,
      potInfoStr,
      now,
      now,
    ],
  );

  return {
    id,
    name: input.name,
    speciesId: input.speciesId ?? null,
    acquiredAt: input.acquiredAt ?? null,
    style: input.style ?? null,
    potInfo: potInfoStr,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// 取得
// ---------------------------------------------------------------------------

/**
 * 盆栽を ID で取得。アーカイブ済も含む (UI 側でフィルタ)。
 */
export async function getBonsaiById(id: string): Promise<Bonsai | null> {
  const db = await getDb();
  return db.getFirstAsync<Bonsai>('SELECT * FROM bonsai WHERE id = ?;', [id]);
}

/**
 * 盆栽を樹種付きで取得 (UI 詳細画面用)。
 */
export async function getBonsaiWithSpecies(
  id: string,
  locale: string,
): Promise<BonsaiWithSpecies | null> {
  const bonsai = await getBonsaiById(id);
  if (!bonsai) return null;

  const species = bonsai.speciesId ? await getSpeciesById(bonsai.speciesId, locale) : null;
  return { ...bonsai, species };
}

/**
 * 全盆栽 (アクティブのみ) を取得、updated_at 降順。
 */
export async function getAllActiveBonsai(): Promise<Bonsai[]> {
  const db = await getDb();
  return db.getAllAsync<Bonsai>(
    'SELECT * FROM bonsai WHERE archived_at IS NULL ORDER BY updated_at DESC;',
  );
}

/**
 * アーカイブ済盆栽を取得、archived_at 降順 (新しいアーカイブから順)。
 */
export async function getAllArchivedBonsai(): Promise<Bonsai[]> {
  const db = await getDb();
  return db.getAllAsync<Bonsai>(
    'SELECT * FROM bonsai WHERE archived_at IS NOT NULL ORDER BY archived_at DESC;',
  );
}

/**
 * 全盆栽を樹種付きで取得 (一覧画面用、アクティブのみ)。
 */
export async function getAllActiveBonsaiWithSpecies(locale: string): Promise<BonsaiWithSpecies[]> {
  const bonsai = await getAllActiveBonsai();
  const results: BonsaiWithSpecies[] = [];
  for (const b of bonsai) {
    const species = b.speciesId ? await getSpeciesById(b.speciesId, locale) : null;
    results.push({ ...b, species });
  }
  return results;
}

// ---------------------------------------------------------------------------
// 更新
// ---------------------------------------------------------------------------

/**
 * 盆栽情報を更新。指定フィールドのみ更新、updated_at は now。
 */
export async function updateBonsai(id: string, updates: UpdateBonsaiInput): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const fields: string[] = ['updated_at = ?'];
  const values: (string | number | null)[] = [now];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.speciesId !== undefined) {
    fields.push('species_id = ?');
    values.push(updates.speciesId);
  }
  if (updates.acquiredAt !== undefined) {
    fields.push('acquired_at = ?');
    values.push(updates.acquiredAt);
  }
  if (updates.style !== undefined) {
    fields.push('style = ?');
    values.push(updates.style);
  }
  if (updates.potInfo !== undefined) {
    fields.push('pot_info = ?');
    values.push(updates.potInfo ? JSON.stringify(updates.potInfo) : null);
  }

  values.push(id);
  await db.runAsync(`UPDATE bonsai SET ${fields.join(', ')} WHERE id = ?;`, values);
}

// ---------------------------------------------------------------------------
// アーカイブ / 復元 / 削除
// ---------------------------------------------------------------------------

/**
 * 盆栽をアーカイブ (archived_at をセット)。
 */
export async function archiveBonsai(id: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE bonsai SET archived_at = ?, updated_at = ? WHERE id = ?;', [
    now,
    now,
    id,
  ]);
}

/**
 * 盆栽を復元 (archived_at を NULL に戻す)。
 */
export async function restoreBonsai(id: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE bonsai SET archived_at = NULL, updated_at = ? WHERE id = ?;', [
    now,
    id,
  ]);
}

/**
 * 盆栽を物理削除 (UI からは通常呼ばない、テスト用)。
 * 関連 events / photos も将来 ON DELETE CASCADE で連動 (PR-D 以降)。
 */
export async function deleteBonsaiHard(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM bonsai WHERE id = ?;', [id]);
}

// ---------------------------------------------------------------------------
// JSON helper (pot_info のパース、UI で使用)
// ---------------------------------------------------------------------------

export function parsePotInfo(potInfoStr: string | null): Record<string, unknown> | null {
  if (!potInfoStr) return null;
  try {
    return JSON.parse(potInfoStr) as Record<string, unknown>;
  } catch {
    return null;
  }
}
