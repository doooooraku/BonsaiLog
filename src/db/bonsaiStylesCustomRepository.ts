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
 * Sess89 Phase 3 (案 c): カスタム樹形を物理削除 + atomic cascade で bonsai.style を NULL 書換え。
 *
 * 背景: bonsai.style は raw text 保存 (= enum 値 or custom name)、 FK ではないため
 * カスタム樹形を削除しても bonsai.style に 「幻の樹形名」 が残る (= Sess89 議論で発覚)。
 *
 * 対策 (案 c、 user 承認済): deleteCustomStyle 関数内で
 *   1. SELECT name FROM bonsai_styles_custom WHERE id = ?
 *   2. DELETE FROM bonsai_styles_custom WHERE id = ?
 *   3. UPDATE bonsai SET style = NULL WHERE style = ?  ← atomic NULL 書換え
 * を 1 transaction で実行、 orphan 参照を構造的に排除。
 *
 * Related: ADR-0026 §Notes Amended Sess89 (= 樹形 raw text 設計と atomic cascade 明文化、 Phase 4 追加予定)
 */
export async function deleteCustomStyle(id: string): Promise<void> {
  const db = await getDb();
  // Sess89 Phase 3: name を先に取得 (= cascade UPDATE 用)
  const target = await db.getFirstAsync<{ name: string }>(
    'SELECT name FROM bonsai_styles_custom WHERE id = ?;',
    [id],
  );
  if (!target) return; // 既に削除済 (= 冪等性)
  await db.runAsync('DELETE FROM bonsai_styles_custom WHERE id = ?;', [id]);
  await db.runAsync('UPDATE bonsai SET style = NULL WHERE style = ?;', [target.name]);
}

/**
 * Sess89 Phase 3 (ADR-0049 ⑥ Grandfathered 緩 削除/編集 OK の構造実装): rename custom style。
 *
 * - 入力名 trim 後 empty → 'empty'
 * - 自身以外の重複 (UNIQUE 制約衝突回避) → 'duplicate'
 * - それ以外 → name 変更 + bonsai.style raw text の cascade UPDATE → 'ok'
 *
 * ⚠️ 樹形は raw text 保存のため、 名前変更時に bonsai 側も連動 UPDATE 必須 (= 樹種と異なる点)。
 */
export type RenameCustomStyleResult = 'ok' | 'empty' | 'duplicate';

export async function renameCustomStyle(
  id: string,
  newRawName: string,
): Promise<RenameCustomStyleResult> {
  const name = newRawName.trim();
  if (name.length === 0) return 'empty';
  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM bonsai_styles_custom WHERE name = ? AND id != ?;',
    [name, id],
  );
  if (existing) return 'duplicate';
  // Sess89 Phase 3: 旧 name を取得 → cascade UPDATE 用
  const target = await db.getFirstAsync<{ name: string }>(
    'SELECT name FROM bonsai_styles_custom WHERE id = ?;',
    [id],
  );
  if (!target) return 'empty'; // 存在しない id (= defensive)
  // 同名への rename は no-op で 'ok' を返す
  if (target.name === name) return 'ok';
  await db.runAsync('UPDATE bonsai_styles_custom SET name = ? WHERE id = ?;', [name, id]);
  // ⚠️ raw text cascade: bonsai.style が旧 name の row を新 name に更新
  await db.runAsync('UPDATE bonsai SET style = ? WHERE style = ?;', [name, target.name]);
  return 'ok';
}

/**
 * Sess89 Phase 3: カスタム樹形の使用件数 (= bonsai.style raw text 完全一致 + 非アーカイブ件数)。
 *
 * - 削除前の影響範囲警告 (= Linear pattern「N 件の盆栽の樹形設定が解除されます」) 用途
 * - bonsai.style は enum 値 (= master) or custom name の raw text が入る
 * - LIKE は使わない (= 部分一致を避けるため完全一致のみ)
 */
export async function countBonsaiByCustomStyle(name: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM bonsai WHERE style = ? AND archived_at IS NULL;',
    [name],
  );
  return row?.count ?? 0;
}

/**
 * Sess89 Phase 3: カスタム樹形一覧 + 使用統計 (= 管理画面 row 表示用)。
 *
 * 各カスタム樹形について:
 * - usageCount: bonsai.style = name の件数 (archived_at IS NULL のみ)
 * - lastUsedAt: 該当 bonsai の最新 updated_at、 未使用なら null
 *
 * tagRepository.getTagsWithStats / getCustomSpeciesWithStats と同 pattern、
 * ただし bonsai.style は FK ではなく raw text 比較なので JOIN ON 条件が name 一致。
 */
export type CustomStyleWithStats = BonsaiStyleCustom & {
  usageCount: number;
  lastUsedAt: string | null;
};

export async function getCustomStylesWithStats(): Promise<CustomStyleWithStats[]> {
  const db = await getDb();
  const rawRows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT cs.id, cs.name, cs.created_at,
            COUNT(b.id) AS usageCount,
            MAX(b.updated_at) AS lastUsedAt
     FROM bonsai_styles_custom cs
     LEFT JOIN bonsai b ON b.style = cs.name AND b.archived_at IS NULL
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
