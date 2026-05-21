/**
 * bulkSoftDeleteEvents 静的解析 test (Sess25 ADR-0036 D5/D8 / R-43 / R-44 整合)。
 *
 * Sess23 PR-ζ-1-② で確立した 静的解析 test pattern を踏襲
 * (fs.readFileSync + regex matching、 expo-sqlite / RN 環境不要)。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(__dirname, '../../src/db/eventRepository.ts'), 'utf8');

describe('bulkSoftDeleteEvents (ADR-0036 D5/D8、 R-43)', () => {
  test('1. export signature: bulkSoftDeleteEvents(eventIds: readonly string[]): Promise<number>', () => {
    expect(SRC).toMatch(
      /export\s+async\s+function\s+bulkSoftDeleteEvents\(\s*eventIds:\s*readonly\s+string\[\]\s*\):\s*Promise<number>/,
    );
  });

  test('2. R-43 atomic: db.withTransactionAsync で wrap (部分削除防止)', () => {
    const fn = SRC.match(/export\s+async\s+function\s+bulkSoftDeleteEvents[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    if (fn) {
      expect(fn[0]).toMatch(/db\.withTransactionAsync\(/);
    }
  });

  test('3. UPDATE getChanges === 0 で throw + rollback (ID 不在 / 既削除 検出)', () => {
    const fn = SRC.match(/export\s+async\s+function\s+bulkSoftDeleteEvents[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    if (fn) {
      expect(fn[0]).toMatch(/result\.changes\s*===\s*0/);
      expect(fn[0]).toMatch(/throw\s+new\s+Error/);
      expect(fn[0]).toMatch(/transaction rolled back/);
    }
  });

  test('4. FTS5 同期削除 (DELETE FROM events_fts、 既存 softDeleteEvent と同 logic)', () => {
    const fn = SRC.match(/export\s+async\s+function\s+bulkSoftDeleteEvents[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    if (fn) {
      expect(fn[0]).toMatch(/DELETE FROM events_fts WHERE event_id = \?/);
    }
  });

  test('5. eventIds.length === 0 early return (空配列 no-op)', () => {
    const fn = SRC.match(/export\s+async\s+function\s+bulkSoftDeleteEvents[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    if (fn) {
      expect(fn[0]).toMatch(/if\s*\(eventIds\.length\s*===\s*0\)\s*return\s+0/);
    }
  });
});
