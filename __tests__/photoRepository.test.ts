/**
 * photoRepository 静的解析 + 純関数テスト (P2-02 PR-B)。
 *
 * 実 DB 接続テストは PR-C の Maestro E2E でカバー。本テストは:
 * - FREE_PHOTO_LIMIT_PER_BONSAI 定数 = 3 (constraints.md §2-2)
 * - PHOTO_PATH_ANCHOR が 'bonsailog/photos/' (Repolog PR #281 lesson)
 * - Repository が必要な関数を export
 * - 値プレースホルダ (?) 使用 (SQL injection 防止)
 * - relative_path 関連の SQL は DB に絶対パスを保存しない仕組み
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import { FREE_PHOTO_LIMIT_PER_BONSAI } from '../src/db/photoRepository';

describe('FREE_PHOTO_LIMIT_PER_BONSAI', () => {
  test('constraints §2-2 で 3 枚と確定', () => {
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
    ];
    for (const name of requiredExports) {
      expect(source).toMatch(new RegExp(`export\\s+(async\\s+)?function\\s+${name}`));
    }
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
