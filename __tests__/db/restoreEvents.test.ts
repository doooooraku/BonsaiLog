/**
 * restoreEvents 静的解析 test (Sess25 ADR-0036 D5 / R-43 / R-44 整合)。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(__dirname, '../../src/db/eventRepository.ts'), 'utf8');

describe('restoreEvents (ADR-0036 D5、 R-43)', () => {
  test('1. export signature: restoreEvents(eventIds: readonly string[]): Promise<number>', () => {
    expect(SRC).toMatch(
      /export\s+async\s+function\s+restoreEvents\(\s*eventIds:\s*readonly\s+string\[\]\s*\):\s*Promise<number>/,
    );
  });

  test('2. R-43 atomic: db.withTransactionAsync で wrap', () => {
    const fn = SRC.match(/export\s+async\s+function\s+restoreEvents[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    if (fn) {
      expect(fn[0]).toMatch(/db\.withTransactionAsync\(/);
    }
  });

  test('3. UPDATE deleted_at = NULL WHERE deleted_at IS NOT NULL (既ゴミ箱外 検出)', () => {
    const fn = SRC.match(/export\s+async\s+function\s+restoreEvents[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    if (fn) {
      expect(fn[0]).toMatch(/SET deleted_at = NULL/);
      expect(fn[0]).toMatch(/WHERE id = \? AND deleted_at IS NOT NULL/);
      expect(fn[0]).toMatch(/result\.changes\s*===\s*0/);
      expect(fn[0]).toMatch(/throw\s+new\s+Error/);
    }
  });

  test('4. FTS5 再 INSERT (events_fts、 既存 restoreEvent と同 logic)', () => {
    const fn = SRC.match(/export\s+async\s+function\s+restoreEvents[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    if (fn) {
      expect(fn[0]).toMatch(
        /INSERT INTO events_fts \(event_id, bonsai_id, note, payload_text\) VALUES/,
      );
    }
  });

  test('5. cancelForEvents bulk wrapper も同 src/features/notification 配下に追加 (R-43/R-44 整合)', () => {
    const CANCEL_SRC = readFileSync(
      resolve(__dirname, '../../src/features/notification/cancelForEvent.ts'),
      'utf8',
    );
    expect(CANCEL_SRC).toMatch(
      /export\s+async\s+function\s+cancelForEvents\([\s\S]*?eventIds:\s*readonly\s+string\[\][\s\S]*?\):\s*Promise<void>/,
    );
    // 全 SUMMARY 再計算 (冪等、 1 回呼出で OK)
    expect(CANCEL_SRC).toMatch(/await\s+triggerSummaryReschedule\(t\)/);
  });
});
