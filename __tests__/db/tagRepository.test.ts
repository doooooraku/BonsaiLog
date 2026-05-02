/**
 * F-09 Phase B tagRepository 純関数テスト (Issue #31 / ADR-0008 改訂)。
 * DB アクセスは Phase C で Maestro / 実機テストでカバー (expo-sqlite は React Native 専用)。
 */
import { normalizeTagName } from '@/src/db/tagRepository';

describe('normalizeTagName', () => {
  test('lowercase + trim', () => {
    expect(normalizeTagName('  Spring  ')).toBe('spring');
  });

  test('連続空白を 1 つに圧縮', () => {
    expect(normalizeTagName('Spring   Pruning')).toBe('spring pruning');
  });

  test('混合 (lowercase + trim + 空白圧縮)', () => {
    expect(normalizeTagName(' Spring  Pruning  Tip ')).toBe('spring pruning tip');
  });

  test('既に正規化済はそのまま', () => {
    expect(normalizeTagName('spring pruning')).toBe('spring pruning');
  });

  test('空文字は空文字', () => {
    expect(normalizeTagName('')).toBe('');
    expect(normalizeTagName('   ')).toBe('');
  });

  test('CJK は影響を受けない', () => {
    expect(normalizeTagName(' 春の  剪定 ')).toBe('春の 剪定');
  });

  test('case 違いも同じ正規化結果', () => {
    expect(normalizeTagName('SPRING')).toBe(normalizeTagName('spring'));
    expect(normalizeTagName('Spring')).toBe(normalizeTagName('SPRING'));
  });
});
