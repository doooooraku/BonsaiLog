/**
 * F-09 Phase B タグ Repository (Issue #31 / ADR-0008 改訂)。
 *
 * 役割:
 * - tags / event_tags M:N の CRUD (純関数 + DB アクセス)
 * - normalizeTagName で case-insensitive 一意性 (ADR-0008 §SQLite §4.3.4)
 * - getRecentTags で最近 N 件のユニークタグ取得 (検索画面の候補チップ用)
 *
 * Phase C スコープ (本 PR では未実装):
 * - event 入力フォームでタグ追加 UI
 * - tag-based 検索フィルタ (events.id IN event_tags WHERE tag_id IN ...)
 * - tag rename / merge 機能
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

/**
 * event に tag を関連付ける (event_tags M:N、PRIMARY KEY 衝突は INSERT OR IGNORE で無音)。
 */
export async function attachTagToEvent(eventId: string, tagId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR IGNORE INTO event_tags (event_id, tag_id) VALUES (?, ?)', [
    eventId,
    tagId,
  ]);
}

/**
 * event から tag の関連付けを外す。
 */
export async function detachTagFromEvent(eventId: string, tagId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM event_tags WHERE event_id = ? AND tag_id = ?', [eventId, tagId]);
}

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
 * event に紐づく tag 一覧を返す。
 */
export async function getTagsByEvent(eventId: string): Promise<TagRecord[]> {
  const db = await getDb();
  return db.getAllAsync<TagRecord>(
    `SELECT t.id, t.name, t.name_normalized as nameNormalized, t.created_at as createdAt
     FROM tags t
     INNER JOIN event_tags et ON et.tag_id = t.id
     WHERE et.event_id = ?
     ORDER BY t.name COLLATE NOCASE`,
    [eventId],
  );
}
