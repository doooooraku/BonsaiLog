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
 * - v2: bonsai + species + species_names (本 PR で導入、F-01 foundation)
 */
import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const SCHEMA_VERSION = 2;

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

export const bonsaiRelations = relations(bonsai, ({ one }) => ({
  species: one(species, {
    fields: [bonsai.speciesId],
    references: [species.id],
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

// ---------------------------------------------------------------------------
// TypeScript types (Drizzle inferSelect / inferInsert は PR-C Repository で使用)
// ---------------------------------------------------------------------------

export type Species = typeof species.$inferSelect;
export type SpeciesInsert = typeof species.$inferInsert;
export type SpeciesName = typeof speciesNames.$inferSelect;
export type SpeciesNameInsert = typeof speciesNames.$inferInsert;
export type Bonsai = typeof bonsai.$inferSelect;
export type BonsaiInsert = typeof bonsai.$inferInsert;

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
