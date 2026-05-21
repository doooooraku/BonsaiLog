/**
 * Sess24 PR-ζ-1-② — convertPlannedToRecorded 3 helper 静的解析 + 純関数 test (ADR-0035 D7、 R-43)。
 *
 * 既存 pattern (`__tests__/db/eventRepository.test.ts`) と整合: 実 DB 接続テストは Maestro E2E + 実機 SS retro でカバー、
 * 本 file は signature / 構造的整合性 (R-43 atomic transaction + sequential await + FTS5 同期) を静的解析で検証。
 *
 * 13 case (plan agent 推奨):
 * - convertPlannedToRecorded: 6 case (signature / atomic / rollback / FTS5 / payload / Sess23 注釈)
 * - bulkConvertPlannedToRecorded: 4 case (signature / sequential / 個別 atomic / 失敗 track)
 * - findPlannedEventByCondition: 3 case (signature / status filter / dateKey 一致)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const source = fs.readFileSync(path.resolve(__dirname, '../../src/db/eventRepository.ts'), 'utf-8');

describe('convertPlannedToRecorded (Sess24 PR-ζ-1-② / ADR-0035 D7、 R-43 atomic transaction)', () => {
  // case 1: export 確認
  test('case 1: export async function convertPlannedToRecorded', () => {
    expect(source).toMatch(/export\s+async\s+function\s+convertPlannedToRecorded/);
  });

  // case 2: atomic transaction (R-43 必須)
  test('case 2: 単一 db.withTransactionAsync で atomic 実行 (R-43 整合)', () => {
    // convertPlannedToRecorded 関数内に withTransactionAsync が存在
    const fnMatch = source.match(/export\s+async\s+function\s+convertPlannedToRecorded[\s\S]*?^}/m);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch![0]).toMatch(/db\.withTransactionAsync/);
  });

  // case 3: rollback (UPDATE 0 行で throw)
  test('case 3: UPDATE changes === 0 で throw + rollback (中途状態防止)', () => {
    const fnMatch = source.match(/export\s+async\s+function\s+convertPlannedToRecorded[\s\S]*?^}/m);
    expect(fnMatch![0]).toMatch(/updateResult\.changes\s*===\s*0/);
    expect(fnMatch![0]).toMatch(/throw\s+new\s+Error/);
  });

  // case 4: FTS5 同期 (4 操作 atomic)
  test('case 4: UPDATE + DELETE events_fts + INSERT events + INSERT events_fts の 4 操作', () => {
    const fnMatch = source.match(/export\s+async\s+function\s+convertPlannedToRecorded[\s\S]*?^}/m);
    const block = fnMatch![0];
    expect(block).toMatch(/UPDATE\s+events\s+SET\s+deleted_at/);
    expect(block).toMatch(/DELETE\s+FROM\s+events_fts/);
    expect(block).toMatch(/INSERT\s+INTO\s+events\b/);
    expect(block).toMatch(/INSERT\s+INTO\s+events_fts/);
  });

  // case 5: payload validation (validateEventPayload + serializeEventPayload)
  test('case 5: validateEventPayload + serializeEventPayload を呼出 (型安全)', () => {
    const fnMatch = source.match(/export\s+async\s+function\s+convertPlannedToRecorded[\s\S]*?^}/m);
    expect(fnMatch![0]).toMatch(/validateEventPayload/);
    expect(fnMatch![0]).toMatch(/serializeEventPayload/);
  });

  // case 6: Sess23 ADR-0035 D7 注釈整合
  test('case 6: JSDoc に「ADR-0035 D7」 + 「R-43」 整合明記', () => {
    expect(source).toMatch(/ADR-0035\s+D7/);
    expect(source).toMatch(/R-43/);
  });
});

describe('bulkConvertPlannedToRecorded (Sess24 PR-ζ-1-② / ADR-0035 D7)', () => {
  // case 7: export 確認
  test('case 7: export async function bulkConvertPlannedToRecorded', () => {
    expect(source).toMatch(/export\s+async\s+function\s+bulkConvertPlannedToRecorded/);
  });

  // case 8: sequential 必須 (Promise.all 不可)
  test('case 8: sequential await 必須 (SQLite ロック競合回避、 Promise.all NG)', () => {
    const fnMatch = source.match(
      /export\s+async\s+function\s+bulkConvertPlannedToRecorded[\s\S]*?^}/m,
    );
    expect(fnMatch).not.toBeNull();
    // for...of + await pattern (sequential)
    expect(fnMatch![0]).toMatch(/for\s*\(\s*const\s+\w+\s+of\s+inputs\s*\)/);
    expect(fnMatch![0]).toMatch(/await\s+convertPlannedToRecorded/);
    // Promise.all は使わない
    expect(fnMatch![0]).not.toMatch(/Promise\.all/);
  });

  // case 9: 個別 atomic + 失敗 track
  test('case 9: 各 input 個別 try/catch で failed[] に track (部分失敗対応)', () => {
    const fnMatch = source.match(
      /export\s+async\s+function\s+bulkConvertPlannedToRecorded[\s\S]*?^}/m,
    );
    const block = fnMatch![0];
    expect(block).toMatch(/try\s*\{/);
    expect(block).toMatch(/catch\s*\(\s*error\s*\)/);
    expect(block).toMatch(/failed\.push/);
    expect(block).toMatch(/converted\.push/);
  });

  // case 10: BulkConvertResult signature
  test('case 10: BulkConvertResult 型 export (converted: Event[] + failed: {plannedEventId, error}[])', () => {
    expect(source).toMatch(/export\s+type\s+BulkConvertResult/);
    expect(source).toMatch(/converted:\s*Event\[\]/);
    expect(source).toMatch(/failed:\s*\{[\s\S]*?plannedEventId:\s*string[\s\S]*?error:\s*unknown/);
  });
});

describe('findPlannedEventByCondition (Sess24 PR-ζ-1-② / ADR-0035 D8 場面 B)', () => {
  // case 11: export 確認
  test('case 11: export async function findPlannedEventByCondition', () => {
    expect(source).toMatch(/export\s+async\s+function\s+findPlannedEventByCondition/);
  });

  // case 12: status='planned' + deleted_at IS NULL filter
  test('case 12: SELECT WHERE status = planned AND deleted_at IS NULL (filter 整合)', () => {
    const fnMatch = source.match(
      /export\s+async\s+function\s+findPlannedEventByCondition[\s\S]*?^}/m,
    );
    expect(fnMatch).not.toBeNull();
    const block = fnMatch![0];
    expect(block).toMatch(/status\s*=\s*\?/);
    expect(block).toMatch(/deleted_at\s+IS\s+NULL/);
    // 'planned' literal を bind value で渡す
    expect(block).toMatch(/['"]planned['"]/);
  });

  // case 13: dateKey 一致確認 (TZ 補正後 UTC date 部 slice)
  test('case 13: occurredAtUtc.slice(0, 10) で UTC date 部一致確認', () => {
    const fnMatch = source.match(
      /export\s+async\s+function\s+findPlannedEventByCondition[\s\S]*?^}/m,
    );
    expect(fnMatch![0]).toMatch(/ev\.occurredAtUtc\.slice\(0,\s*10\)/);
    expect(fnMatch![0]).toMatch(/evDateKey\s*===\s*dateKey/);
  });
});
