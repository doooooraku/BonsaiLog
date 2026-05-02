/**
 * Drizzle Kit configuration for BonsaiLog.
 *
 * Related:
 * - ADR-0008 (F-02 events STI + Drizzle ORM + ULID)
 * - Issue #14 F-01 foundation (bonsai + species + species_names)
 * - PR-A: 依存追加 + Drizzle 設定 (本ファイル)
 * - PR-B: schema 実装 + migration v2 + 50 種樹種マスタ
 *
 * Usage:
 * - `pnpm drizzle-kit generate` → `drizzle/` に SQL migration ファイル生成
 * - `pnpm drizzle-kit studio` → ローカル DB GUI (Phase 2 後半で使用)
 *
 * Note:
 * - dialect は SQLite (expo-sqlite ベース)
 * - schema は src/db/schema.ts を参照
 * - out (生成先) は drizzle/ ディレクトリ
 * - migration runner 自体は src/db/db.ts (raw SQL でも動作維持)
 */
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  // expo-sqlite は標準で sqlite3 driver を内包、drizzle-kit の verbose は不要
  verbose: true,
  strict: true,
} satisfies Config;
