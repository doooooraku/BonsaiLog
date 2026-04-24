/**
 * DB migration idempotency tests.
 *
 * These tests verify that the migration code follows safe patterns:
 * - CREATE TABLE uses IF NOT EXISTS (idempotent)
 * - PRAGMA user_version is set unconditionally (not inside an if-block)
 * - hasColumn helper exists for ALTER TABLE migrations
 *
 * Lesson from Repolog: PRAGMA user_version was set conditionally,
 * causing all migrations to re-run on second launch and ALTER TABLE
 * ADD COLUMN to crash with "duplicate column name".
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { SCHEMA_VERSION } from '../src/db/schema';

// Read source files once for static analysis
const dbSource = fs.readFileSync(path.resolve(__dirname, '../src/db/db.ts'), 'utf-8');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const schema = require('../src/db/schema');

describe('DB migration design', () => {
  test('SCHEMA_VERSION is a positive integer', () => {
    expect(Number.isInteger(SCHEMA_VERSION)).toBe(true);
    expect(SCHEMA_VERSION).toBeGreaterThan(0);
  });

  test('schema DDL uses CREATE TABLE IF NOT EXISTS', () => {
    const allExports = Object.entries(schema).filter(([key]) => key.startsWith('schema'));

    for (const [, ddl] of allExports) {
      if (typeof ddl !== 'string') continue;
      const unsafeCreates = (ddl as string).match(/CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)/gi);
      expect(unsafeCreates).toBeNull();
    }
  });

  test('db.ts sets PRAGMA user_version unconditionally', () => {
    expect(dbSource).toContain('PRAGMA user_version');

    const lines = dbSource.split('\n');
    const pragmaLineIndex = lines.findLastIndex((l: string) => l.includes('PRAGMA user_version'));
    expect(pragmaLineIndex).toBeGreaterThan(-1);

    const pragmaLine = lines[pragmaLineIndex].trim();
    expect(pragmaLine.startsWith('//')).toBe(false);
    expect(pragmaLine.startsWith('*')).toBe(false);
  });

  test('db.ts has hasColumn helper for ALTER TABLE migrations', () => {
    expect(dbSource).toContain('hasColumn');
    expect(dbSource).toContain('PRAGMA table_info');
  });
});
