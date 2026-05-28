/**
 * expo-sqlite jest mock — backed by Node 22 built-in `node:sqlite`.
 *
 * WHY: src/db/* は expo-sqlite (React Native 専用) を使うため従来 jest で実行できず、
 * DB テストは静的解析のみだった (coverage ~0%)。Phase 3 安全網のため、expo-sqlite の
 * async API を node:sqlite (DatabaseSync) で忠実にエミュレートし、実 DB characterization
 * を可能にする。`jest.doMock('expo-sqlite', () => require('./expoSqliteMock'))` で適用。
 *
 * 前提: Node 22+ (node:sqlite)。node 20 で DB テストを走らせると loadNodeSqlite() が
 * 明示エラーを投げる (`nvm use 22 && pnpm test`)。
 *
 * 忠実性メモ:
 * - node:sqlite run() は `{ lastInsertRowid, changes }` を返す → expo-sqlite の
 *   `{ lastInsertRowId, changes }` (大文字 I) にマッピング。
 * - node:sqlite は undefined / boolean の bind を throw する → expo-sqlite 互換のため
 *   undefined→null / boolean→0/1 に coerce。
 * - `PRAGMA foreign_keys = ON` を接続直後 (トランザクション外) に有効化。constraints.md §1-2
 *   の「FK 必ず ON」意図に合わせ、CASCADE を決定論的にする。
 */

function loadNodeSqlite(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- node:sqlite has no typed/ESM import
    return require('node:sqlite');
  } catch {
    throw new Error(
      'DB characterization tests require Node 22+ (node:sqlite). Run `nvm use 22 && pnpm test`.',
    );
  }
}

function coerce(v: unknown): unknown {
  if (v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v;
}

/**
 * expo-sqlite は runAsync(sql, [a,b]) と runAsync(sql, a, b) の両形を許容する。
 * node:sqlite は positional 引数の spread を要求するため正規化する。
 */
function normalizeParams(rest: unknown[]): unknown[] {
  let params: unknown[];
  if (rest.length === 1 && Array.isArray(rest[0])) {
    params = rest[0] as unknown[];
  } else {
    params = rest;
  }
  return params.map(coerce);
}

function toNumber(v: number | bigint): number {
  return typeof v === 'bigint' ? Number(v) : v;
}

class MockSQLiteDatabase {
  private db: any;

  constructor(public databaseName: string) {
    const { DatabaseSync } = loadNodeSqlite();
    this.db = new DatabaseSync(':memory:');
    // constraints.md §1-2: FK は接続毎に ON (トランザクション外で設定すること)。
    this.db.exec('PRAGMA foreign_keys = ON;');
  }

  async execAsync(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async runAsync(
    sql: string,
    ...rest: unknown[]
  ): Promise<{ lastInsertRowId: number; changes: number }> {
    const stmt = this.db.prepare(sql);
    const r = stmt.run(...normalizeParams(rest));
    return {
      lastInsertRowId: toNumber(r.lastInsertRowid),
      changes: toNumber(r.changes),
    };
  }

  async getAllAsync<T = any>(sql: string, ...rest: unknown[]): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    return stmt.all(...normalizeParams(rest)) as T[];
  }

  async getFirstAsync<T = any>(sql: string, ...rest: unknown[]): Promise<T | null> {
    const stmt = this.db.prepare(sql);
    const row = stmt.get(...normalizeParams(rest));
    return (row ?? null) as T | null;
  }

  async withTransactionAsync(fn: () => Promise<void>): Promise<void> {
    this.db.exec('BEGIN;');
    try {
      await fn();
      this.db.exec('COMMIT;');
    } catch (e) {
      try {
        this.db.exec('ROLLBACK;');
      } catch {
        // already rolled back / no active txn
      }
      throw e;
    }
  }

  async closeAsync(): Promise<void> {
    this.db.close();
  }
}

export async function openDatabaseAsync(databaseName = ':memory:'): Promise<MockSQLiteDatabase> {
  return new MockSQLiteDatabase(databaseName);
}

export function openDatabaseSync(databaseName = ':memory:'): MockSQLiteDatabase {
  return new MockSQLiteDatabase(databaseName);
}

export type SQLiteDatabase = MockSQLiteDatabase;
