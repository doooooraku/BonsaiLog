/**
 * purgeBonsaiCompletely 静的解析 test (Sess44 PR-3、完全削除の孤児データ防止)。
 *
 * 完全削除は CASCADE で消えない 2 つ (写真の実ファイル / events_fts 手動同期索引) を
 * 明示削除する必要があり、順序が重要。回帰防止のため src の構造を静的検証する。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(__dirname, '../../src/db/bonsaiRepository.ts'), 'utf8');

const FN = SRC.match(/export\s+async\s+function\s+purgeBonsaiCompletely[\s\S]*?\n\}/);

describe('purgeBonsaiCompletely (Sess44 PR-3、完全削除)', () => {
  test('1. export signature: purgeBonsaiCompletely(id: string): Promise<void>', () => {
    expect(SRC).toMatch(
      /export\s+async\s+function\s+purgeBonsaiCompletely\(\s*id:\s*string\s*\):\s*Promise<void>/,
    );
  });

  test('2. 削除前に写真を収集 (getPhotosByBonsai) してファイルを削除 (deletePhotoFile)', () => {
    expect(FN).not.toBeNull();
    if (FN) {
      expect(FN[0]).toMatch(/getPhotosByBonsai\(id\)/);
      expect(FN[0]).toMatch(/deletePhotoFile\(/);
    }
  });

  test('3. events_fts を bonsai_id 指定で手動削除 (FTS5 はトリガ無し、CASCADE 非対応)', () => {
    expect(FN).not.toBeNull();
    if (FN) {
      expect(FN[0]).toMatch(/DELETE FROM events_fts WHERE bonsai_id = \?/);
    }
  });

  test('4. CASCADE 非依存: 全子テーブル (events/photos/bonsai_tags) を明示削除', () => {
    expect(FN).not.toBeNull();
    if (FN) {
      expect(FN[0]).toMatch(/DELETE FROM events WHERE bonsai_id = \?/);
      expect(FN[0]).toMatch(/DELETE FROM photos WHERE bonsai_id = \?/);
      expect(FN[0]).toMatch(/DELETE FROM bonsai_tags WHERE bonsai_id = \?/);
    }
  });

  test('5. bonsai 行削除を withTransactionAsync で atomic に', () => {
    expect(FN).not.toBeNull();
    if (FN) {
      expect(FN[0]).toMatch(/db\.withTransactionAsync\(/);
      expect(FN[0]).toMatch(/DELETE FROM bonsai WHERE id = \?/);
    }
  });

  test('6. 順序: 写真ファイル削除 → events_fts 削除 → bonsai 行削除', () => {
    expect(FN).not.toBeNull();
    if (FN) {
      const idxPhotoFile = FN[0].indexOf('deletePhotoFile');
      const idxFts = FN[0].indexOf('DELETE FROM events_fts');
      const idxBonsai = FN[0].indexOf('DELETE FROM bonsai WHERE id');
      expect(idxPhotoFile).toBeGreaterThanOrEqual(0);
      expect(idxFts).toBeGreaterThan(idxPhotoFile);
      expect(idxBonsai).toBeGreaterThan(idxFts);
    }
  });
});
