/**
 * photoRepository 静的解析 + 純関数テスト (P2-02 PR-B)。
 *
 * 実 DB 接続テストは PR-C の Maestro E2E でカバー。本テストは:
 * - FREE_PHOTO_LIMIT_PER_BONSAI 定数 = Infinity (写真制限撤廃、PR #470 / Issue #458 Phase 2)
 * - PHOTO_PATH_ANCHOR が 'bonsailog/photos/' (Repolog PR #281 lesson)
 * - Repository が必要な関数を export
 * - 値プレースホルダ (?) 使用 (SQL injection 防止)
 * - relative_path 関連の SQL は DB に絶対パスを保存しない仕組み
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import { FREE_PHOTO_LIMIT_PER_BONSAI } from '../src/db/photoRepository';

describe('FREE_PHOTO_LIMIT_PER_BONSAI', () => {
  test('Free 上限 3 (ADR-0049 Sess59 PR3 で復活、 Issue #458 Phase 2 Supersedes)', () => {
    expect(FREE_PHOTO_LIMIT_PER_BONSAI).toBe(3);
  });
});

describe('photoRepository file structure', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/db/photoRepository.ts'), 'utf-8');

  test('必要な関数を export', () => {
    const requiredExports = [
      'getPhotoCountByBonsai',
      'canAddPhoto',
      'insertPhoto',
      'getPhotosByBonsai',
      'getCoverPhoto',
      'getPhotosByBonsaiGroupedByYear',
      'setCoverPhoto',
      'updatePhotoCaption',
      'reorderPhotos',
      'deletePhoto',
      'deleteAllPhotosForBonsai',
      // Sess34 ADR-0041 PR-3: event 紐付け写真 query (EventRowPhotoStrip + photo-viewer modal 用)
      'getAllPhotosByEventId',
      'getRepresentativePhotoByEventId',
    ];
    for (const name of requiredExports) {
      expect(source).toMatch(new RegExp(`export\\s+(async\\s+)?function\\s+${name}`));
    }
  });

  test('Sess34 PR-3: getRepresentativePhotoByEventId は is_cover 優先 → order_index fallback', () => {
    // 関数定義内で is_cover=1 SELECT が先行、 fallback で ORDER BY order_index ASC LIMIT 1
    const fnMatch = source.match(/getRepresentativePhotoByEventId[\s\S]*?\n}/);
    expect(fnMatch).not.toBeNull();
    const body = fnMatch![0];
    // is_cover=1 query が先
    expect(body).toMatch(/event_id\s*=\s*\?\s+AND\s+is_cover\s*=\s*1[\s\S]+LIMIT\s+1/i);
    // fallback で order_index ASC
    expect(body).toMatch(/ORDER\s+BY\s+order_index\s+ASC\s+LIMIT\s+1/i);
  });

  test('Sess34 PR-3: getAllPhotosByEventId は event_id = ? + ORDER BY order_index ASC', () => {
    const fnMatch = source.match(/getAllPhotosByEventId[\s\S]*?\n}/);
    expect(fnMatch).not.toBeNull();
    const body = fnMatch![0];
    expect(body).toMatch(/event_id\s*=\s*\?/);
    expect(body).toMatch(/ORDER\s+BY\s+order_index\s+ASC/i);
  });

  test('PHOTO_PATH_ANCHOR が bonsailog/photos/ (Repolog PR #281 lesson)', () => {
    expect(source).toMatch(/PHOTO_PATH_ANCHOR\s*=\s*['"]bonsailog\/photos\/['"]/);
  });

  test('insertPhoto が toRelativePath を呼び出す (絶対パス禁止)', () => {
    expect(source).toMatch(/toRelativePath\(input\.absoluteUri/);
  });

  test('SELECT/INSERT/UPDATE/DELETE は値プレースホルダ (?) を使用', () => {
    const queries = source.match(/(SELECT|INSERT|UPDATE|DELETE)[^;`]+(\?|VALUES)/gi);
    expect(queries).not.toBeNull();
    expect(queries!.length).toBeGreaterThan(5);
  });

  test('ULID を使用 (主キー生成)', () => {
    expect(source).toMatch(/import\s+\{\s*ulid\s*\}\s+from\s+['"]ulid['"]/);
    expect(source).toMatch(/ulid\(\)/);
  });

  test('setCoverPhoto はトランザクション (withTransactionAsync) を使用', () => {
    expect(source).toMatch(/setCoverPhoto[\s\S]*withTransactionAsync/);
  });

  test('deletePhoto は cascade 後カバー昇格を実装 (is_cover = 1 を残す)', () => {
    expect(source).toMatch(/deletePhoto[\s\S]*is_cover\s*=\s*1/);
  });
});
