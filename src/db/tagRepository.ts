/**
 * F-09 タグ Repository (Issue #31 / ADR-0008 + §Notes Amended 2026-05-18)。
 *
 * 役割:
 * - tags / bonsai_tags M:N の CRUD (純関数 + DB アクセス)
 * - normalizeTagName で case-insensitive 一意性 (ADR-0008 §SQLite §4.3.4)
 * - getRecentTags で最近 N 件のユニークタグ取得 (検索画面の候補チップ用)
 *
 * Sess9 PR-1 で event_tags 完全廃止 (dead code、 bonsai_tags 一本化)。
 * event 単位タグ filter は eventRepository.searchEventsByBonsaiTags() を使用。
 */
import { ulid } from 'ulid';

import { nowUtc } from '@/src/core/datetime';

import { getDb } from './db';

/**
 * タグ名の正規化純関数 (case-insensitive 比較用)。
 *
 * - lowercase + trim + 連続空白を 1 つに圧縮
 * - 例: ' Spring  Pruning ' → 'spring pruning'
 *
 * ADR-0008 §SQLite §4.3.4 で UNIQUE 制約に使用。
 */
export function normalizeTagName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

export type TagRecord = {
  id: string;
  name: string;
  nameNormalized: string;
  createdAt: string;
};

/**
 * 入力された tag name を正規化し、既存タグがあれば返す、なければ作成して返す。
 *
 * 戻り値: { id, name, nameNormalized, createdAt }
 */
export async function createOrFindTag(rawName: string): Promise<TagRecord> {
  const normalized = normalizeTagName(rawName);
  if (normalized.length === 0) {
    throw new Error('Tag name cannot be empty after normalization');
  }
  const db = await getDb();
  const existing = await db.getFirstAsync<TagRecord>(
    'SELECT id, name, name_normalized as nameNormalized, created_at as createdAt FROM tags WHERE name_normalized = ?',
    [normalized],
  );
  if (existing) return existing;

  const trimmedName = rawName.trim();
  const id = ulid();
  const createdAt = nowUtc();
  await db.runAsync(
    'INSERT INTO tags (id, name, name_normalized, created_at) VALUES (?, ?, ?, ?)',
    [id, trimmedName, normalized, createdAt],
  );
  return { id, name: trimmedName, nameNormalized: normalized, createdAt };
}

/** {@link renameTag} の戻り値: 'duplicate' は同 normalized 名が別 ID で存在を意味する。 */
export type RenameTagResult = 'ok' | 'empty' | 'duplicate';

/**
 * Issue #31 AC3 Y9: タグの rename。
 *
 * - normalize 後の name が既存タグ (別 ID) と衝突 → 'duplicate' を返す
 * - normalize 結果が空文字 → 'empty'
 * - 衝突なし → UPDATE tags SET name, name_normalized → 'ok'
 */
export async function renameTag(tagId: string, newRawName: string): Promise<RenameTagResult> {
  const normalized = normalizeTagName(newRawName);
  if (normalized.length === 0) return 'empty';

  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM tags WHERE name_normalized = ? AND id != ?',
    [normalized, tagId],
  );
  if (existing) return 'duplicate';

  await db.runAsync('UPDATE tags SET name = ?, name_normalized = ? WHERE id = ?', [
    newRawName.trim(),
    normalized,
    tagId,
  ]);
  return 'ok';
}

// event 単位の M:N (attachTagToEvent / detachTagFromEvent / getTagsByEvent) は
// Sess9 PR-1 (ADR-0008 §Notes Amended 2026-05-18) で完全廃止。
// 理由: dead code (UI から呼ばれる箇所 0 件)、 bonsai_tags 一本化。
// event 単位タグ filter は eventRepository.searchEventsByBonsaiTags() を使用。

/**
 * 最近作成されたタグを N 件返す (検索画面の候補チップ用、ADR-0008 改訂)。
 *
 * - created_at DESC で並べる
 * - 既定 limit = 3 (シニア UX、ADR-0008 改訂)
 */
export async function getRecentTags(limit: number = 3): Promise<TagRecord[]> {
  const db = await getDb();
  return db.getAllAsync<TagRecord>(
    'SELECT id, name, name_normalized as nameNormalized, created_at as createdAt FROM tags ORDER BY created_at DESC LIMIT ?',
    [limit],
  );
}

/**
 * よく使われているタグを N 件返す (検索画面のフィルタチップ用)。
 *
 * - bonsai_tags の attach 件数 (usageCount) 降順 → 同数なら created_at DESC
 * - HAVING で実際に使われている (>0) タグのみ (未使用タグで絞っても結果ゼロのため除外)
 * - idx_bonsai_tags_tag_id (schema v9) で 1000 タグ規模でも 100ms 未満
 */
export async function getMostUsedTags(limit: number = 6): Promise<TagRecord[]> {
  const db = await getDb();
  return db.getAllAsync<TagRecord>(
    `SELECT t.id, t.name, t.name_normalized AS nameNormalized, t.created_at AS createdAt
     FROM tags t
     INNER JOIN bonsai_tags bt ON bt.tag_id = t.id
     GROUP BY t.id, t.name, t.name_normalized, t.created_at
     HAVING COUNT(bt.bonsai_id) > 0
     ORDER BY COUNT(bt.bonsai_id) DESC, t.created_at DESC
     LIMIT ?;`,
    [limit],
  );
}

/**
 * 全タグの件数を返す (Sess9 PR-5、 設定画面 row right value 表示用)。
 *
 * - tags table 全行数
 * - 取得失敗 / 未初期化時の fallback は呼び出し側で 0 にすること
 */
export async function countAllTags(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM tags;');
  return row?.count ?? 0;
}

/**
 * Free 上限タグ数 (ADR-0049 Sess58 確定 機能 ②、 Sess59 PR4 で実装)。
 * Pro user は無制限。 rename は別 API (renameTag) で無制限。
 */
export const FREE_TAG_LIMIT = 3;

/**
 * 新規タグ作成が可能か判定 (ADR-0049 Sess59 PR4)。
 *
 * - 入力名が既存タグ (正規化一致) と重複 → true (createOrFindTag が既存返却 = 新規追加にならない)
 * - 重複なし + Pro → true
 * - 重複なし + Free + countAllTags() < 3 → true
 * - 上記以外 → false (Paywall 誘導)
 *
 * Grandfathered (ADR-0049 Decision §): 既存 4+ 件タグは表示 OK + rename OK +
 * 新規追加のみ Paywall (Slack 2022 churn 事件回避)。
 */
export async function canCreateNewTag(rawName: string, isPro: boolean): Promise<boolean> {
  if (isPro) return true;
  const normalized = normalizeTagName(rawName);
  if (normalized.length === 0) return false;
  const db = await getDb();
  // 既存タグ重複なら新規追加にならないので OK
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM tags WHERE name_normalized = ?',
    [normalized],
  );
  if (existing) return true;
  // 新規追加するなら Free 上限 check
  const count = await countAllTags();
  return count < FREE_TAG_LIMIT;
}

/**
 * 指定タグが attach されている盆栽の件数を返す (Sess9 PR-8、 rename/削除影響範囲警告用)。
 *
 * 業界事例: Linear Label delete confirmation pattern。
 * - 0 件 → 警告なし、 simple confirm
 * - 1+ 件 → 「このタグは N 件の盆栽で使われています」 警告 + confirm
 */
export async function countBonsaiByTag(tagId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM bonsai_tags WHERE tag_id = ?',
    [tagId],
  );
  return row?.count ?? 0;
}

/**
 * タグの使用統計付き一覧を返す (Sess9 PR-7、 タグ管理画面 row 表示用)。
 *
 * 各タグについて:
 * - usageCount: bonsai_tags 経由で attach されている盆栽件数
 * - lastUsedAt: 最新の attach 日時 (bonsai_tags.created_at の MAX)、 未使用なら null
 *
 * 業界事例: Bear Notes 同パターン (件数 + 最終使用日)、 作成日は user benefit ゼロのため非表示。
 * 性能: idx_bonsai_tags_tag_id (schema v9) で 1000 タグ規模でも 100ms 未満。
 */
export type TagWithStats = TagRecord & {
  usageCount: number;
  lastUsedAt: string | null;
};

export async function getTagsWithStats(): Promise<TagWithStats[]> {
  const db = await getDb();
  return db.getAllAsync<TagWithStats>(
    `SELECT t.id, t.name, t.name_normalized AS nameNormalized, t.created_at AS createdAt,
            COUNT(bt.bonsai_id) AS usageCount,
            MAX(bt.created_at) AS lastUsedAt
     FROM tags t
     LEFT JOIN bonsai_tags bt ON bt.tag_id = t.id
     GROUP BY t.id, t.name, t.name_normalized, t.created_at
     ORDER BY t.created_at DESC;`,
  );
}

// ---------------------------------------------------------------------------
// Bonsai-Tag M:N (T2-6、schema v9)
// ---------------------------------------------------------------------------

/**
 * bonsai に tag を関連付ける (bonsai_tags M:N、PRIMARY KEY 衝突は INSERT OR IGNORE で無音)。
 */
export async function attachTagToBonsai(bonsaiId: string, tagId: string): Promise<void> {
  const db = await getDb();
  const now = nowUtc() as string;
  await db.runAsync(
    'INSERT OR IGNORE INTO bonsai_tags (bonsai_id, tag_id, created_at) VALUES (?, ?, ?)',
    [bonsaiId, tagId, now],
  );
}

/**
 * bonsai から tag の関連付けを外す。
 */
export async function detachTagFromBonsai(bonsaiId: string, tagId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM bonsai_tags WHERE bonsai_id = ? AND tag_id = ?', [
    bonsaiId,
    tagId,
  ]);
}

/**
 * bonsai に紐づく tag 一覧を返す。
 */
export async function getTagsByBonsai(bonsaiId: string): Promise<TagRecord[]> {
  const db = await getDb();
  return db.getAllAsync<TagRecord>(
    `SELECT t.id, t.name, t.name_normalized as nameNormalized, t.created_at as createdAt
     FROM tags t
     INNER JOIN bonsai_tags bt ON bt.tag_id = t.id
     WHERE bt.bonsai_id = ?
     ORDER BY t.name COLLATE NOCASE`,
    [bonsaiId],
  );
}
