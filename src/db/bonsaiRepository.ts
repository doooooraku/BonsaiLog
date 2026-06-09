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

import { nowUtc } from '@/src/core/datetime';

import { getDb } from './db';
import { snakeToCamelRow, snakeToCamelRows } from './rowMapper';
import type { Bonsai, BonsaiStyle } from './schema';
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
  /** 推定樹齢 (年単位、null 可、T2-3 / schema v6 追加)。UI で「N年（推定）」表示。 */
  estimatedAge?: number | null;
  /** メモ (free-form text、null 可、T2-7 / schema v7 追加)。 */
  memo?: string | null;
  /** 購入日 (ISO 8601 UTC TEXT、null 可、T2-4 / schema v8 追加、acquiredAt とは別)。 */
  purchaseDate?: string | null;
  /** 入手元メモ (free-form text、null 可、Issue #455 Phase 1 / schema v10 追加)。 */
  acquiredFrom?: string | null;
  /** 樹齢「不明」 明示 (0/1、 Sess13 PR-D / schema v12 追加)。 true 時は estimatedAge null 推奨。 */
  estimatedAgeUnknown?: boolean;
  /** カスタム樹種 FK (Sess13 PR-H / schema v14 追加)。 speciesId と排他、 どちらか一方 (or 両方 null)。 */
  customSpeciesId?: string | null;
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
  const now = nowUtc() as string;
  const id = ulid();

  const potInfoStr = input.potInfo ? JSON.stringify(input.potInfo) : null;

  const ageUnknown = input.estimatedAgeUnknown ? 1 : 0;

  await db.runAsync(
    `INSERT INTO bonsai
       (id, name, species_id, acquired_at, style, pot_info, estimated_age, memo, purchase_date, acquired_from, estimated_age_unknown, custom_species_id, archived_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?);`,
    [
      id,
      input.name,
      input.speciesId ?? null,
      input.acquiredAt ?? null,
      input.style ?? null,
      potInfoStr,
      input.estimatedAge ?? null,
      input.memo ?? null,
      input.purchaseDate ?? null,
      input.acquiredFrom ?? null,
      ageUnknown,
      input.customSpeciesId ?? null,
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
    estimatedAge: input.estimatedAge ?? null,
    memo: input.memo ?? null,
    purchaseDate: input.purchaseDate ?? null,
    acquiredFrom: input.acquiredFrom ?? null,
    estimatedAgeUnknown: ageUnknown,
    customSpeciesId: input.customSpeciesId ?? null,
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
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM bonsai WHERE id = ?;',
    [id],
  );
  return snakeToCamelRow<Bonsai>(row);
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
 *
 * Issue #253 (ADR-0021 PoC follow-up): tagIds オプションで M:N フィルタを実現。
 * - tagIds 未指定 / 空配列 → 既存通り全 active 盆栽
 * - tagIds 指定あり → bonsai_tags JOIN で「全 tagIds が付いている bonsai」 を AND セマンティクスで返す
 *
 * Sess9 PR-1 (ADR-0008 §Notes Amended 2026-05-18) で event_tags JOIN → bonsai_tags JOIN に修正。
 * 旧実装は event_tags 経由だったが、 タグは BonsaiBasicForm 経由で bonsai_tags にしか attach
 * されないため常に 0 件返却していた致命 BUG (ホーム filter chip tap で empty state に落ちる)。
 */
export async function getAllActiveBonsai(options?: {
  tagIds?: readonly string[];
}): Promise<Bonsai[]> {
  const db = await getDb();
  const tagIds = options?.tagIds;

  if (!tagIds || tagIds.length === 0) {
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM bonsai WHERE archived_at IS NULL ORDER BY updated_at DESC;',
    );
    return snakeToCamelRows<Bonsai>(rows);
  }

  // M:N filter: 全 tagIds が付いている bonsai のみ (bonsai_tags 直接 JOIN、 v9 schema)
  const placeholders = tagIds.map(() => '?').join(',');
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT b.* FROM bonsai b
     INNER JOIN bonsai_tags bt ON bt.bonsai_id = b.id
     WHERE b.archived_at IS NULL
           AND bt.tag_id IN (${placeholders})
     GROUP BY b.id
     HAVING COUNT(DISTINCT bt.tag_id) = ?
     ORDER BY b.updated_at DESC;`,
    [...tagIds, tagIds.length],
  );
  return snakeToCamelRows<Bonsai>(rows);
}

/**
 * アーカイブ済盆栽を取得、archived_at 降順 (新しいアーカイブから順)。
 */
export async function getAllArchivedBonsai(): Promise<Bonsai[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM bonsai WHERE archived_at IS NOT NULL ORDER BY archived_at DESC;',
  );
  return snakeToCamelRows<Bonsai>(rows);
}

/**
 * アーカイブ済盆栽の件数を取得 (Issue #457 Phase 5、設定画面 right value 表示用)。
 */
export async function countArchivedBonsai(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM bonsai WHERE archived_at IS NOT NULL;',
  );
  return row?.count ?? 0;
}

/**
 * 全盆栽を樹種付きで取得 (一覧画面用、アクティブのみ)。
 *
 * Issue #253: getAllActiveBonsai() の tagIds オプションをそのまま委譲して M:N フィルタ可能。
 */
export async function getAllActiveBonsaiWithSpecies(
  locale: string,
  options?: { tagIds?: readonly string[] },
): Promise<BonsaiWithSpecies[]> {
  const bonsai = await getAllActiveBonsai(options);
  const results: BonsaiWithSpecies[] = [];
  for (const b of bonsai) {
    const species = b.speciesId ? await getSpeciesById(b.speciesId, locale) : null;
    results.push({ ...b, species });
  }
  return results;
}

/**
 * 指定 custom species ID を使う 盆栽 を 樹種付きで取得 (Sess91 PR-3、 /custom-species inline 展開用)。
 *
 * - bonsai.custom_species_id FK 検索 (= ON DELETE SET NULL 由来、 v14 schema)
 * - active のみ (archived_at IS NULL)、 updated_at DESC
 * - master species (b.speciesId) は基本 null (= 設計上 custom と排他)、 念のため getSpeciesById 経由
 *
 * 注: tags の `getAllActiveBonsaiWithSpecies(lang, { tagIds })` Sess9 PR-10 と思想同型、
 *     管理画面 row toggle ▶/▼ → 関連盆栽 inline 表示 pattern を 3 画面共通化 (R-76 SoT)。
 */
export async function getAllActiveBonsaiByCustomSpeciesId(
  customSpeciesId: string,
  locale: string,
): Promise<BonsaiWithSpecies[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM bonsai WHERE archived_at IS NULL AND custom_species_id = ? ORDER BY updated_at DESC;',
    [customSpeciesId],
  );
  const bonsai = snakeToCamelRows<Bonsai>(rows);
  const results: BonsaiWithSpecies[] = [];
  for (const b of bonsai) {
    const species = b.speciesId ? await getSpeciesById(b.speciesId, locale) : null;
    results.push({ ...b, species });
  }
  return results;
}

/**
 * 指定 style 名 (raw text) を使う 盆栽 を 樹種付きで取得 (Sess91 PR-3、 /custom-styles inline 展開用)。
 *
 * - bonsai.style raw text 完全一致検索 (= ADR-0026 raw text 設計、 案 c atomic NULL cascade)
 * - active のみ、 updated_at DESC
 * - master style (BONSAI_STYLES enum) でも custom style 名でも 同じ raw text 一致で動作
 *
 * 注: master 樹形 5 種は本関数で取得可能だが、 /custom-styles 画面では master を一覧に含めない
 *     (= 既存設計通り)、 呼出側は custom 樹形のみ pass する。
 */
export async function getAllActiveBonsaiByStyleName(
  styleName: string,
  locale: string,
): Promise<BonsaiWithSpecies[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM bonsai WHERE archived_at IS NULL AND style = ? ORDER BY updated_at DESC;',
    [styleName],
  );
  const bonsai = snakeToCamelRows<Bonsai>(rows);
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
  const now = nowUtc() as string;
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
  if (updates.estimatedAge !== undefined) {
    fields.push('estimated_age = ?');
    values.push(updates.estimatedAge);
  }
  if (updates.memo !== undefined) {
    fields.push('memo = ?');
    values.push(updates.memo);
  }
  if (updates.purchaseDate !== undefined) {
    fields.push('purchase_date = ?');
    values.push(updates.purchaseDate);
  }
  if (updates.acquiredFrom !== undefined) {
    fields.push('acquired_from = ?');
    values.push(updates.acquiredFrom);
  }
  if (updates.estimatedAgeUnknown !== undefined) {
    fields.push('estimated_age_unknown = ?');
    values.push(updates.estimatedAgeUnknown ? 1 : 0);
  }
  if (updates.customSpeciesId !== undefined) {
    fields.push('custom_species_id = ?');
    values.push(updates.customSpeciesId);
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
  const now = nowUtc() as string;
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
  const now = nowUtc() as string;
  await db.runAsync('UPDATE bonsai SET archived_at = NULL, updated_at = ? WHERE id = ?;', [
    now,
    id,
  ]);
}

/**
 * 盆栽を物理削除 (低レベル、bonsai 行のみ DELETE)。
 * photos / events / bonsai_tags は schema の ON DELETE CASCADE で DB 行が連動削除される。
 * ただし (1) 写真の実ファイル (2) events_fts (トリガ無し手動同期) は連動しないため、
 * UI からの完全削除は必ず photoOrchestrator.purgeBonsaiCompletely を使うこと。
 */
export async function deleteBonsaiHard(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM bonsai WHERE id = ?;', [id]);
}

/**
 * 盆栽の全 DB 行を完全削除 (events_fts / events / photos / bonsai_tags / bonsai)。
 * 写真の実ファイル削除は呼び出し側 (photoOrchestrator.purgeBonsaiCompletely) が
 * DB 行削除より「先に」行う (孤児データ防止の順序保証、Sess44 / Phase 6 F2 で I/O 分離)。
 *
 * ON DELETE CASCADE には依存しない: PRAGMA foreign_keys は接続毎に設定が必要で、
 * expo-sqlite の runtime 接続では OFF になる場合があり CASCADE が発火しない (実機検証で
 * events / bonsai_tags の孤児を確認、Sess44)。そのため全子テーブルを明示削除する。
 *
 * 順序: events_fts (FTS5 トリガ無し手動同期) → events / photos / bonsai_tags → bonsai を
 * 1 トランザクションで明示削除 (atomic、孤児ゼロ)。
 */
export async function purgeBonsaiDbRows(id: string): Promise<void> {
  const db = await getDb();

  // 全子テーブル + bonsai を明示削除 (CASCADE 非依存、atomic)。
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM events_fts WHERE bonsai_id = ?;', [id]);
    await db.runAsync('DELETE FROM events WHERE bonsai_id = ?;', [id]);
    await db.runAsync('DELETE FROM photos WHERE bonsai_id = ?;', [id]);
    await db.runAsync('DELETE FROM bonsai_tags WHERE bonsai_id = ?;', [id]);
    await db.runAsync('DELETE FROM bonsai WHERE id = ?;', [id]);
  });
}

/**
 * F-09 Phase A: 盆栽名による LIKE 検索 (Issue #31、ADR-0008 改訂)。
 * archived_at IS NULL のアクティブ盆栽のみ対象。Phase B で FTS5 trigram + tags M:N に拡張予定。
 *
 * @param query 検索クエリ (前後の空白除去、空文字なら空配列)
 * @param limit 最大件数 (デフォルト 50)
 */
export async function searchBonsaiByName(query: string, limit = 50): Promise<Bonsai[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const db = await getDb();
  // LIKE のメタ文字 (% _ \) をエスケープ。日本語の case-insensitive は Phase B (name_normalized) で改善。
  const escaped = trimmed.replace(/[\\%_]/g, (c) => '\\' + c);
  const like = `%${escaped}%`;
  const rows = await db.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM bonsai WHERE name LIKE ? ESCAPE '\\' AND archived_at IS NULL ORDER BY name LIMIT ?;",
    [like, limit],
  );
  return snakeToCamelRows<Bonsai>(rows);
}

/**
 * F-09: 盆栽を「名前 / 樹種 / 樹形」横断で検索 (検索画面のテキスト検索用)。
 *
 * 対象 (OR、いずれか一致でヒット、archived_at IS NULL):
 * - name: 盆栽名 LIKE
 * - 樹種(master): species_names.common_name (全locale) / species.scientific_name LIKE
 * - 樹種(custom): bonsai_species_custom.name LIKE
 * - 樹形(custom): bonsai.style は標準は enum、カスタムは生テキスト → style LIKE で custom 名一致
 * - 樹形(master): 呼び出し側で「ラベル→enum」逆引きした styleEnums を style IN で一致
 *   (i18n ラベル解決は UI 層でしかできないため引数で受ける)
 *
 * DISTINCT で species_names の locale 複数行による重複を排除。
 */
export async function searchBonsai(
  query: string,
  styleEnums: readonly string[] = [],
  limit = 50,
): Promise<Bonsai[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const db = await getDb();
  const escaped = trimmed.replace(/[\\%_]/g, (c) => '\\' + c);
  const like = `%${escaped}%`;
  const stylePlaceholders = styleEnums.map(() => '?').join(',');
  const styleInClause = styleEnums.length ? ` OR b.style IN (${stylePlaceholders})` : '';
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT DISTINCT b.* FROM bonsai b
     LEFT JOIN species_names sn ON sn.species_id = b.species_id
     LEFT JOIN species sp ON sp.id = b.species_id
     LEFT JOIN bonsai_species_custom bsc ON bsc.id = b.custom_species_id
     WHERE b.archived_at IS NULL AND (
       b.name LIKE ? ESCAPE '\\'
       OR sn.common_name LIKE ? ESCAPE '\\'
       OR sp.scientific_name LIKE ? ESCAPE '\\'
       OR bsc.name LIKE ? ESCAPE '\\'
       OR b.style LIKE ? ESCAPE '\\'${styleInClause}
     )
     ORDER BY b.name LIMIT ?;`,
    [like, like, like, like, like, ...styleEnums, limit],
  );
  return snakeToCamelRows<Bonsai>(rows);
}

/**
 * F-09: 指定タグが付いた盆栽カードを返す (検索画面のタグチップ用)。
 *
 * ADR-0008: タグは盆栽単位 (作業 event には付かない)。タグ起点の検索は必ず「盆栽」を返す。
 * 検索画面では本関数を使い、searchEventsByBonsaiTags (作業を返す) は使わない。
 * archived_at IS NULL のアクティブ盆栽のみ、更新が新しい順。
 */
export async function getBonsaiByTag(tagId: string, limit = 50): Promise<Bonsai[]> {
  if (!tagId) return [];
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT b.* FROM bonsai b
     INNER JOIN bonsai_tags bt ON bt.bonsai_id = b.id
     WHERE bt.tag_id = ? AND b.archived_at IS NULL
     ORDER BY b.updated_at DESC
     LIMIT ?;`,
    [tagId, limit],
  );
  return snakeToCamelRows<Bonsai>(rows);
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
