/**
 * BonsaiLog database schema (SCHEMA_VERSION = 2).
 *
 * Related:
 * - Issue #14 F-01 foundation (本 PR-B: bonsai + species + species_names)
 * - ADR-0008 (F-02 events STI、本 PR では未実装、PR-D 以降で events テーブル追加予定)
 * - basic_spec.md §10 (樹種マスタ 50 種以上 + 19 言語通称)
 * - constraints.md §1-2 (UUID v4 / UTC ISO 8601 / PRAGMA foreign_keys、本 PR では ULID 採用)
 *
 * Hybrid design:
 * - Drizzle ORM テーブル定義: TypeScript 型推論 + query builder で Repository 実装に使用 (PR-C)
 * - Raw SQL DDL (`schemaV2`): expo-sqlite の migration runner (db.ts) で実行
 *
 * Lessons from Repolog (PR #213):
 * 1. PRAGMA user_version は migration if-block の外で**常に**設定 (db.ts 参照)
 * 2. CREATE TABLE は IF NOT EXISTS 必須 (idempotent)
 * 3. ALTER TABLE は hasColumn() ガード必須 (本 PR では ALTER 不使用)
 *
 * SCHEMA_VERSION 履歴:
 * - v1: template items/attachments (Issue #14 で削除、本番ユーザー 0)
 * - v2: bonsai + species + species_names (F-01 foundation、PR #46)
 * - v3: photos (F-08 foundation、PR #49)
 * - v4: events + tags + event_tags + events_fts (F-02 foundation)
 * - v5: events_fts を `tokenize='trigram remove_diacritics 1' detail=column` に再構築 (Issue #31、ADR-0008 §4.3.4 整合)
 */
import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const SCHEMA_VERSION = 5;

// ---------------------------------------------------------------------------
// Drizzle ORM table definitions (TypeScript 型推論 + query builder 用)
// ---------------------------------------------------------------------------

/**
 * 樹種マスタ。学名を unique key として保持、family / 気候帯 / 標準作業情報を含む。
 * 通称は species_names テーブル (M:1) で 19 言語ローカライズ可能。
 */
export const species = sqliteTable(
  'species',
  {
    id: text('id').primaryKey().notNull(), // ULID
    scientificName: text('scientific_name').notNull().unique(),
    family: text('family'),
    climateZoneMin: integer('climate_zone_min'),
    climateZoneMax: integer('climate_zone_max'),
    defaultTasks: text('default_tasks'), // JSON 文字列 (将来拡張用、v1.0 では空)
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    scientificNameIdx: index('idx_species_scientific_name').on(table.scientificName),
  }),
);

/**
 * 樹種の通称 (locale × species_id 複合主キー)。19 言語ローカライズ対応。
 */
export const speciesNames = sqliteTable(
  'species_names',
  {
    speciesId: text('species_id')
      .notNull()
      .references(() => species.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(), // BCP 47 (例: ja, en, zh-Hans)
    commonName: text('common_name').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.speciesId, table.locale] }),
    localeIdx: index('idx_species_names_locale').on(table.locale),
  }),
);

/**
 * 写真 (photos) - F-08 foundation。
 * Repolog PR #281 教訓: relative_path で保存 (絶対パス禁止、iOS Store 更新で container UUID 変動)。
 * Free 制限: bonsai 1 件あたり 3 枚まで (Repository 層で enforce、F-13 完成後に Paywall 接続)。
 */
export const photos = sqliteTable(
  'photos',
  {
    id: text('id').primaryKey().notNull(), // ULID
    bonsaiId: text('bonsai_id')
      .notNull()
      .references(() => bonsai.id, { onDelete: 'cascade' }),
    eventId: text('event_id'), // F-02 events FK (event 削除で SET NULL)、events テーブル未作成のため FK 無効
    relativePath: text('relative_path').notNull(), // 例: bonsailog/photos/<bonsaiId>/<photoId>.jpg
    takenAt: text('taken_at'), // ISO 8601 UTC TEXT (撮影日時、EXIF or 手動)
    isCover: integer('is_cover').notNull().default(0), // 0/1、bonsai 1 件あたり 1 枚のみ ON
    width: integer('width'),
    height: integer('height'),
    orderIndex: integer('order_index').notNull().default(0),
    caption: text('caption'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    bonsaiIdIdx: index('idx_photos_bonsai_id').on(table.bonsaiId, table.orderIndex),
    isCoverIdx: index('idx_photos_is_cover').on(table.bonsaiId, table.isCover),
    takenAtIdx: index('idx_photos_taken_at').on(table.takenAt),
  }),
);

/**
 * 盆栽 (BonsaiLog の中核エンティティ)。樹種への FK + 取得日 + 樹形 + 鉢情報 + アーカイブ機能。
 */
export const bonsai = sqliteTable(
  'bonsai',
  {
    id: text('id').primaryKey().notNull(), // ULID
    name: text('name').notNull(),
    speciesId: text('species_id').references(() => species.id, { onDelete: 'set null' }),
    acquiredAt: text('acquired_at'), // ISO 8601 UTC TEXT
    style: text('style'), // 樹形 (例: chokkan, moyogi, shakan, kengai, han-kengai, bunjingi)
    potInfo: text('pot_info'), // JSON 文字列 (鉢の形状/色/サイズ/メーカー等)
    archivedAt: text('archived_at'), // ISO 8601 UTC TEXT (NULL ならアクティブ)
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    speciesIdIdx: index('idx_bonsai_species_id').on(table.speciesId),
    archivedAtIdx: index('idx_bonsai_archived_at').on(table.archivedAt),
    updatedAtIdx: index('idx_bonsai_updated_at').on(table.updatedAt),
  }),
);

// ---------------------------------------------------------------------------
// Drizzle relations
// ---------------------------------------------------------------------------

export const speciesRelations = relations(species, ({ many }) => ({
  names: many(speciesNames),
  bonsai: many(bonsai),
}));

export const speciesNamesRelations = relations(speciesNames, ({ one }) => ({
  species: one(species, {
    fields: [speciesNames.speciesId],
    references: [species.id],
  }),
}));

export const bonsaiRelations = relations(bonsai, ({ one, many }) => ({
  species: one(species, {
    fields: [bonsai.speciesId],
    references: [species.id],
  }),
  photos: many(photos),
}));

export const photosRelations = relations(photos, ({ one }) => ({
  bonsai: one(bonsai, {
    fields: [photos.bonsaiId],
    references: [bonsai.id],
  }),
}));

// ---------------------------------------------------------------------------
// F-02 events (P2-03 PR-B、ADR-0008 STI 準拠)
// ---------------------------------------------------------------------------

/**
 * 作業イベント (events) - F-02 foundation。
 *
 * STI (Single Table Inheritance) 設計:
 * - 共通列: id / bonsai_id / type / status / occurred_at_utc / tz_offset_min / tz_iana / duration_min / note
 * - 種別固有: payload_json (Valibot Discriminated Union で型安全、PR-C で実装)
 * - 30 日ゴミ箱: deleted_at セット → 起動時に 30 日経過分を物理削除 (PR-C)
 *
 * 16 種別 (basic_spec.md §F-02 + ADR-0011):
 * watering / pruning / wiring / unwiring / repotting / fertilizing / pest_control /
 * leaf_trimming / defoliation / deshoot / candle_cut / moss_care / position_change
 *
 * 注: status='planned' は未来日許容、'logged' は過去日のみ (CHECK 制約)
 */
export const events = sqliteTable(
  'events',
  {
    id: text('id').primaryKey().notNull(), // ULID (時系列ソート可)
    bonsaiId: text('bonsai_id')
      .notNull()
      .references(() => bonsai.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // EVENT_TYPES enum
    status: text('status').notNull().default('logged'), // planned / logged / cancelled
    occurredAtUtc: text('occurred_at_utc').notNull(), // ISO 8601 UTC
    tzOffsetMin: integer('tz_offset_min').notNull(), // JST=+540, PST=-480
    tzIana: text('tz_iana').notNull(), // "Asia/Tokyo" 等、DST 対応
    durationMin: integer('duration_min'),
    payloadJson: text('payload_json'), // Valibot validated JSON (PR-C で型付け)
    note: text('note'), // 自由記述、最大 2000 文字 (UI で enforce)、FTS5 対象
    deletedAt: text('deleted_at'), // 30 日ゴミ箱、partial index で除外
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    activeIdx: index('idx_events_active').on(table.bonsaiId, table.occurredAtUtc),
    statusIdx: index('idx_events_status').on(table.status, table.occurredAtUtc),
    typeIdx: index('idx_events_type').on(table.type, table.bonsaiId),
  }),
);

/**
 * タグマスタ (M:N for events、F-09 検索・タグの基盤、ADR-0008 改訂)。
 * name は重複可、name_normalized で case-insensitive 一意性確保 (PR-C で UNIQUE 制約)。
 */
export const tags = sqliteTable(
  'tags',
  {
    id: text('id').primaryKey().notNull(), // ULID
    name: text('name').notNull(),
    nameNormalized: text('name_normalized').notNull().unique(), // lowercase / trim / normalize
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    normalizedIdx: index('idx_tags_normalized').on(table.nameNormalized),
  }),
);

/**
 * events ⇄ tags 中間テーブル (M:N)。
 */
export const eventTags = sqliteTable(
  'event_tags',
  {
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.eventId, table.tagId] }),
    tagIdIdx: index('idx_event_tags_tag_id').on(table.tagId),
  }),
);

// ---------------------------------------------------------------------------
// events relations
// ---------------------------------------------------------------------------

export const eventsRelations = relations(events, ({ one, many }) => ({
  bonsai: one(bonsai, {
    fields: [events.bonsaiId],
    references: [bonsai.id],
  }),
  tags: many(eventTags),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  events: many(eventTags),
}));

export const eventTagsRelations = relations(eventTags, ({ one }) => ({
  event: one(events, {
    fields: [eventTags.eventId],
    references: [events.id],
  }),
  tag: one(tags, {
    fields: [eventTags.tagId],
    references: [tags.id],
  }),
}));

// ---------------------------------------------------------------------------
// Raw SQL DDL (db.ts migration runner で使用)
// ---------------------------------------------------------------------------

/**
 * Migration v2: bonsai + species + species_names テーブル新規作成。
 *
 * 注意: SCHEMA_VERSION = 2 への移行で v1 (template items/attachments) は削除される。
 * 本番ユーザー 0 のため影響なし (Issue #14 リスク欄)。
 */
export const schemaV2 = `
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- 樹種マスタ (species)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS species (
  id TEXT PRIMARY KEY NOT NULL,
  scientific_name TEXT NOT NULL UNIQUE,
  family TEXT,
  climate_zone_min INTEGER,
  climate_zone_max INTEGER,
  default_tasks TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_species_scientific_name ON species(scientific_name);

-- ---------------------------------------------------------------------------
-- 樹種通称 (species_names) - 19 言語ローカライズ用
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS species_names (
  species_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  common_name TEXT NOT NULL,
  PRIMARY KEY (species_id, locale),
  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_species_names_locale ON species_names(locale);

-- ---------------------------------------------------------------------------
-- 盆栽 (bonsai) - BonsaiLog の中核エンティティ
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bonsai (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  species_id TEXT,
  acquired_at TEXT,
  style TEXT,
  pot_info TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_bonsai_species_id ON bonsai(species_id);
CREATE INDEX IF NOT EXISTS idx_bonsai_archived_at ON bonsai(archived_at);
CREATE INDEX IF NOT EXISTS idx_bonsai_updated_at ON bonsai(updated_at);
`;

/**
 * Migration v3: photos テーブル新規作成 (F-08 foundation)。
 *
 * - bonsai_id FK + ON DELETE CASCADE (盆栽削除時に写真も削除)
 * - relative_path のみ保存 (絶対パス禁止、Repolog PR #281 lesson)
 * - is_cover フラグでカバー写真管理 (Repository 層で 1 件のみに制約)
 * - event_id は F-02 events 完成後に FK 化 (現状 nullable TEXT)
 */
export const schemaV3 = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY NOT NULL,
  bonsai_id TEXT NOT NULL,
  event_id TEXT,
  relative_path TEXT NOT NULL,
  taken_at TEXT,
  is_cover INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  caption TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (bonsai_id) REFERENCES bonsai(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_photos_bonsai_id ON photos(bonsai_id, order_index);
CREATE INDEX IF NOT EXISTS idx_photos_is_cover ON photos(bonsai_id, is_cover);
CREATE INDEX IF NOT EXISTS idx_photos_taken_at ON photos(taken_at);
`;

/**
 * Migration v4: events + tags + event_tags + events_fts (F-02 foundation、ADR-0008 STI)。
 *
 * - events: STI 16 種別、status (planned/logged/cancelled)、30 日ゴミ箱 (deleted_at)
 * - tags: M:N、name_normalized で case-insensitive 一意性
 * - event_tags: 中間テーブル (M:N)
 * - events_fts: FTS5 trigram、note + payload 検索 (PR-C で trigger 配線、本 PR では table のみ)
 *
 * CHECK 制約:
 * - status は (planned, logged, cancelled) のいずれか
 * - planned 以外は occurred_at_utc が現在以下 (DB レベルで強制、テストは PR-C)
 *
 * partial index:
 * - WHERE deleted_at IS NULL でゴミ箱以外を高速化
 */
export const schemaV4 = `
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- events (作業履歴、STI)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY NOT NULL,
  bonsai_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'logged',
  occurred_at_utc TEXT NOT NULL,
  tz_offset_min INTEGER NOT NULL,
  tz_iana TEXT NOT NULL,
  duration_min INTEGER,
  payload_json TEXT,
  note TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (status IN ('planned', 'logged', 'cancelled')),
  FOREIGN KEY (bonsai_id) REFERENCES bonsai(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_events_active ON events(bonsai_id, occurred_at_utc) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status, occurred_at_utc) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type, bonsai_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON events(deleted_at) WHERE deleted_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- tags (M:N、F-09 検索・タグ基盤)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tags_normalized ON tags(name_normalized);

-- ---------------------------------------------------------------------------
-- event_tags (events ⇄ tags の中間)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_tags (
  event_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (event_id, tag_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_event_tags_tag_id ON event_tags(tag_id);

-- ---------------------------------------------------------------------------
-- events_fts (FTS5 trigram、note + payload を検索対象)
-- ---------------------------------------------------------------------------
-- note: external content table、PR-C で INSERT/UPDATE/DELETE trigger を配線
-- v5 (Issue #31、ADR-0008 §4.3.4) で tokenize に remove_diacritics 1 を追加 +
-- detail=column で「3 文字超 token MATCH 不可」の罠を回避。
CREATE VIRTUAL TABLE IF NOT EXISTS events_fts USING fts5(
  event_id UNINDEXED,
  bonsai_id UNINDEXED,
  note,
  payload_text,
  tokenize = "trigram remove_diacritics 1",
  detail = "column"
);
`;

/**
 * Migration v5: events_fts を ADR-0008 §4.3.4 整合の tokenize / detail 設定で
 * 再構築する (Issue #31)。
 *
 * - 旧 v4 の events_fts は `tokenize="trigram"` のみで `remove_diacritics 1`
 *   と `detail=column` を欠落していた。
 * - virtual table は ALTER 不可なので DROP → CREATE → INSERT で再インデックス。
 * - events 本体テーブルは変更しない。
 * - deleted_at IS NULL の events のみ再インデックス対象。
 */
export const schemaV5 = `
DROP TABLE IF EXISTS events_fts;

CREATE VIRTUAL TABLE events_fts USING fts5(
  event_id UNINDEXED,
  bonsai_id UNINDEXED,
  note,
  payload_text,
  tokenize = "trigram remove_diacritics 1",
  detail = "column"
);

INSERT INTO events_fts (event_id, bonsai_id, note, payload_text)
SELECT id, bonsai_id, COALESCE(note, ''), COALESCE(payload_json, '')
FROM events
WHERE deleted_at IS NULL;
`;

// ---------------------------------------------------------------------------
// TypeScript types (Drizzle inferSelect / inferInsert は PR-C Repository で使用)
// ---------------------------------------------------------------------------

export type Species = typeof species.$inferSelect;
export type SpeciesInsert = typeof species.$inferInsert;
export type SpeciesName = typeof speciesNames.$inferSelect;
export type SpeciesNameInsert = typeof speciesNames.$inferInsert;
export type Bonsai = typeof bonsai.$inferSelect;
export type BonsaiInsert = typeof bonsai.$inferInsert;
export type Photo = typeof photos.$inferSelect;
export type PhotoInsert = typeof photos.$inferInsert;
export type Event = typeof events.$inferSelect;
export type EventInsert = typeof events.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type TagInsert = typeof tags.$inferInsert;
export type EventTag = typeof eventTags.$inferSelect;

/**
 * 16 種別の作業イベント (constraints.md §8 + basic_spec.md §F-02、ADR-0011 で F-03 削除済)
 */
export const EVENT_TYPES = [
  'watering', // 水やり
  'pruning', // 剪定
  'wiring', // 針金がけ
  'unwiring', // 針金外し
  'repotting', // 植替え
  'fertilizing', // 施肥
  'pest_control', // 防除・消毒
  'leaf_trimming', // 葉刈り
  'defoliation', // 葉抜き
  'deshoot', // 芽摘み
  'candle_cut', // 芽切り (松類)
  'moss_care', // 苔の手入れ
  'position_change', // 配置変更
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

/**
 * イベントステータス (ADR-0008、Things 3 / Apple Reminders ライク)
 */
export const EVENT_STATUSES = ['planned', 'logged', 'cancelled'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

/**
 * 樹形スタイル (Issue #14 で予定、UI 側で enum 化)
 */
export const BONSAI_STYLES = [
  'chokkan', // 直幹
  'moyogi', // 模様木
  'shakan', // 斜幹
  'kengai', // 懸崖
  'han_kengai', // 半懸崖
  'bunjingi', // 文人木
  'fukinagashi', // 吹き流し
  'sokan', // 双幹
  'kabudachi', // 株立ち
  'ishitsuki', // 石付き
] as const;

export type BonsaiStyle = (typeof BONSAI_STYLES)[number];
