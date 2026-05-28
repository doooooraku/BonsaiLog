/**
 * DB characterization test helper — fresh in-memory DB per test.
 *
 * WHY: src/db/db.ts は dbPromise を module singleton で抱えるため、テスト間で DB が
 * 共有され汚染する。各テストで `jest.resetModules()` → expo-sqlite を node:sqlite mock に
 * doMock → db.ts を fresh 再 require して migrate を走らせることで分離する。
 *
 * 使い方:
 *   import { setupFreshDb } from '../helpers/testDb';
 *   beforeEach(async () => { await setupFreshDb(); });
 *   test('...', async () => {
 *     // repo は beforeEach の後 (= resetModules 後) に require すること
 *     const { createEvent } = require('@/src/db/eventRepository');
 *     ...
 *   });
 *
 * 注意: repo は **beforeEach の後** に require すること (resetModules 後の fresh module を
 * 掴むため)。setupFreshDb 内で getDb() を呼び migrate 済みにして返す。
 */
import type { SQLiteDatabase } from 'expo-sqlite';

export async function setupFreshDb(): Promise<SQLiteDatabase> {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.doMock factory needs require
  jest.doMock('expo-sqlite', () => require('./expoSqliteMock'));
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- resetModules 後に fresh module を掴む
  const dbModule = require('@/src/db/db') as typeof import('@/src/db/db');
  // migrate を走らせ、以後の repo require が同じ migrated DB を共有する。
  await dbModule.getDb();
  return dbModule.getDb();
}
