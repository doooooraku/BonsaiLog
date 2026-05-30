/**
 * useProGuard 静的解析 test (ADR-0049 Sess59 PR2)。
 *
 * Pro 機能 6 項目の共通ガード hook が以下を満たすことを確認:
 * - FREE_LIMIT_PER_FEATURE = 3 (Sess58 確定)
 * - canAdd = isPro || currentCount < FREE_LIMIT_PER_FEATURE
 * - remainingSlots: Pro = Infinity / Free = max(0, 3 - currentCount)
 * - openPaywall: /pro?source={feature} に router.push
 * - ProGuardFeature = 5 種類 (photo_basic / photo_worklog / tag / custom_species / settings)
 *
 * 静的解析 pattern (fs.readFileSync + regex matching、 RN 描画不要)。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(__dirname, '../../../src/features/pro/useProGuard.ts'), 'utf8');

describe('useProGuard (ADR-0049 Sess59 PR2)', () => {
  test('1. FREE_LIMIT_PER_FEATURE = 3 (Sess58 確定)', () => {
    expect(SRC).toMatch(/FREE_LIMIT_PER_FEATURE\s*=\s*3\s+as\s+const/);
  });

  test('2. ProGuardFeature 5 種 (photo_basic / photo_worklog / tag / custom_species / settings)', () => {
    expect(SRC).toMatch(/'photo_basic'/);
    expect(SRC).toMatch(/'photo_worklog'/);
    expect(SRC).toMatch(/'tag'/);
    expect(SRC).toMatch(/'custom_species'/);
    expect(SRC).toMatch(/'settings'/);
  });

  test('3. canAdd ロジック = isPro || currentCount < FREE_LIMIT_PER_FEATURE', () => {
    expect(SRC).toMatch(/canAdd\s*=\s*isPro\s*\|\|\s*currentCount\s*<\s*FREE_LIMIT_PER_FEATURE/);
  });

  test('4. remainingSlots: Pro = Infinity / Free = max(0, FREE_LIMIT_PER_FEATURE - currentCount)', () => {
    expect(SRC).toContain('Number.POSITIVE_INFINITY');
    expect(SRC).toMatch(/Math\.max\(0,\s*FREE_LIMIT_PER_FEATURE\s*-\s*currentCount\)/);
  });

  test('5. openPaywall: router.push(/pro?source={feature})', () => {
    expect(SRC).toMatch(/router\.push\(`\/pro\?source=\$\{feature\}`/);
  });

  test('6. useProStore.isPro を購読', () => {
    expect(SRC).toMatch(/useProStore\(\(s\)\s*=>\s*s\.isPro\)/);
  });
});
