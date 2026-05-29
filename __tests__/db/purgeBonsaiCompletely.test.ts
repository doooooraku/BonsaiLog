/**
 * 完全削除の孤児データ防止 静的解析 test (Sess44 PR-3 / Phase 6 F2 で 2 層に分離)。
 *
 * 完全削除は CASCADE で消えない 2 つ (写真の実ファイル / events_fts 手動同期索引) を
 * 明示削除する必要があり、順序が重要。Phase 6 F2 で写真ファイル I/O (imperative shell) を
 * photoOrchestrator へ、DB 行削除 (purgeBonsaiDbRows) を bonsaiRepository へ分離したため、
 * 順序保証を両ファイルで静的検証する:
 * - orchestrator: ファイル削除 (deletePhotoFile) → DB 行削除 (purgeBonsaiDbRows) の順
 * - repository: events_fts → 子テーブル → bonsai を 1 トランザクションで明示削除
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ORCH = readFileSync(
  resolve(__dirname, '../../src/features/photos/photoOrchestrator.ts'),
  'utf8',
);
const REPO = readFileSync(resolve(__dirname, '../../src/db/bonsaiRepository.ts'), 'utf8');

const ORCH_FN = ORCH.match(/export\s+async\s+function\s+purgeBonsaiCompletely[\s\S]*?\n\}/);
const REPO_FN = REPO.match(/export\s+async\s+function\s+purgeBonsaiDbRows[\s\S]*?\n\}/);

describe('purgeBonsaiCompletely orchestrator (Phase 6 F2、ファイル I/O 分離)', () => {
  test('1. export signature: purgeBonsaiCompletely(id: string): Promise<void>', () => {
    expect(ORCH).toMatch(
      /export\s+async\s+function\s+purgeBonsaiCompletely\(\s*id:\s*string\s*\):\s*Promise<void>/,
    );
  });

  test('2. 削除前に写真を収集 (getPhotosByBonsai) してファイルを削除 (deletePhotoFile)', () => {
    expect(ORCH_FN).not.toBeNull();
    if (ORCH_FN) {
      expect(ORCH_FN[0]).toMatch(/getPhotosByBonsai\(id\)/);
      expect(ORCH_FN[0]).toMatch(/deletePhotoFile\(/);
    }
  });

  test('3. DB 行削除は purgeBonsaiDbRows へ委譲', () => {
    expect(ORCH_FN).not.toBeNull();
    if (ORCH_FN) {
      expect(ORCH_FN[0]).toMatch(/purgeBonsaiDbRows\(id\)/);
    }
  });

  test('4. 順序: 写真ファイル削除 (deletePhotoFile) → DB 行削除 (purgeBonsaiDbRows)', () => {
    expect(ORCH_FN).not.toBeNull();
    if (ORCH_FN) {
      const idxFile = ORCH_FN[0].indexOf('deletePhotoFile');
      const idxDb = ORCH_FN[0].indexOf('purgeBonsaiDbRows');
      expect(idxFile).toBeGreaterThanOrEqual(0);
      expect(idxDb).toBeGreaterThan(idxFile);
    }
  });
});

describe('purgeBonsaiDbRows repository (DB 行の atomic 削除)', () => {
  test('5. export signature: purgeBonsaiDbRows(id: string): Promise<void>', () => {
    expect(REPO).toMatch(
      /export\s+async\s+function\s+purgeBonsaiDbRows\(\s*id:\s*string\s*\):\s*Promise<void>/,
    );
  });

  test('6. events_fts を bonsai_id 指定で手動削除 (FTS5 はトリガ無し、CASCADE 非対応)', () => {
    expect(REPO_FN).not.toBeNull();
    if (REPO_FN) {
      expect(REPO_FN[0]).toMatch(/DELETE FROM events_fts WHERE bonsai_id = \?/);
    }
  });

  test('7. CASCADE 非依存: 全子テーブル (events/photos/bonsai_tags) を明示削除', () => {
    expect(REPO_FN).not.toBeNull();
    if (REPO_FN) {
      expect(REPO_FN[0]).toMatch(/DELETE FROM events WHERE bonsai_id = \?/);
      expect(REPO_FN[0]).toMatch(/DELETE FROM photos WHERE bonsai_id = \?/);
      expect(REPO_FN[0]).toMatch(/DELETE FROM bonsai_tags WHERE bonsai_id = \?/);
    }
  });

  test('8. bonsai 行削除を withTransactionAsync で atomic に', () => {
    expect(REPO_FN).not.toBeNull();
    if (REPO_FN) {
      expect(REPO_FN[0]).toMatch(/db\.withTransactionAsync\(/);
      expect(REPO_FN[0]).toMatch(/DELETE FROM bonsai WHERE id = \?/);
    }
  });

  test('9. 順序: events_fts 削除 → bonsai 行削除', () => {
    expect(REPO_FN).not.toBeNull();
    if (REPO_FN) {
      const idxFts = REPO_FN[0].indexOf('DELETE FROM events_fts');
      const idxBonsai = REPO_FN[0].indexOf('DELETE FROM bonsai WHERE id');
      expect(idxFts).toBeGreaterThanOrEqual(0);
      expect(idxBonsai).toBeGreaterThan(idxFts);
    }
  });
});
