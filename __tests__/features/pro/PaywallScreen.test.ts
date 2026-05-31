/**
 * PaywallScreen FeatureRow 整合 test (ADR-0049 Sess59 PR2)。
 *
 * Sess58 確定 Pro 機能 6 項目との完全一致を確認:
 * - ① paywallFeaturePhoto (基本情報写真)
 * - ② paywallFeatureTag (タグ)
 * - ③ paywallFeatureWorkLogPhoto (作業記録写真)
 * - ④ paywallFeatureCsv (CSV/PDF、 既存)
 * - ⑤ paywallFeatureNoAds (広告非表示、 既存)
 * - ⑥ paywallFeatureCustomSpecies (カスタム樹種樹形)
 *
 * 削除確認 (Sess58 で「全 Free」 確定):
 * - paywallFeatureBonsaiCount / paywallFeatureHistory / paywallFeatureBackup / paywallFeatureTheme
 *
 * 静的解析 pattern (fs.readFileSync + regex matching、 RN 描画不要)。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(__dirname, '../../../src/features/pro/PaywallScreen.tsx'), 'utf8');

describe('PaywallScreen FeatureRow (ADR-0049 Sess59 PR2 6 項目整合)', () => {
  test('1. FeatureRow 6 行が ADR-0049 ①〜⑥ に整合', () => {
    expect(SRC).toContain("t('paywallFeaturePhoto')"); // ①
    expect(SRC).toContain("t('paywallFeatureTag')"); // ②
    expect(SRC).toContain("t('paywallFeatureWorkLogPhoto')"); // ③
    expect(SRC).toContain("t('paywallFeatureCsv')"); // ④ (既存)
    expect(SRC).toContain("t('paywallFeatureNoAds')"); // ⑤ (既存)
    expect(SRC).toContain("t('paywallFeatureCustomSpecies')"); // ⑥
  });

  test('2. 各 FeatureRow の Free/Pro 値 i18n key も参照されている (Sess60 PR2 で CSV も i18n 化、 literal "—" "◎" 排除)', () => {
    expect(SRC).toContain("t('paywallFeaturePhotoFreeValue')");
    expect(SRC).toContain("t('paywallFeaturePhotoProValue')");
    expect(SRC).toContain("t('paywallFeatureTagFreeValue')");
    expect(SRC).toContain("t('paywallFeatureTagProValue')");
    expect(SRC).toContain("t('paywallFeatureWorkLogPhotoFreeValue')");
    expect(SRC).toContain("t('paywallFeatureWorkLogPhotoProValue')");
    expect(SRC).toContain("t('paywallFeatureCustomSpeciesFreeValue')");
    expect(SRC).toContain("t('paywallFeatureCustomSpeciesProValue')");
    // Sess60 PR2: CSV/PDF も literal "—" "◎" 排除して i18n 化
    expect(SRC).toContain("t('paywallFeatureCsvFreeValue')");
    expect(SRC).toContain("t('paywallFeatureCsvProValue')");
    // 値表記統一: literal "—" "◎" がもう code 上にない
    expect(SRC).not.toContain('free="—"');
    expect(SRC).not.toContain('pro="◎"');
  });

  test('3. Sess58「全 Free」 確定の旧 row は削除済', () => {
    expect(SRC).not.toContain("t('paywallFeatureBonsaiCount')");
    expect(SRC).not.toContain("t('paywallFeatureHistory')");
    expect(SRC).not.toContain("t('paywallFeatureBackup')");
    expect(SRC).not.toContain("t('paywallFeatureTheme')");
  });

  test('4. paywallFeatureYearlyTimeline (Sess58 撤廃済) が再混入していない', () => {
    expect(SRC).not.toContain('paywallFeatureYearlyTimeline');
  });

  test('5. featureTable testID 維持 (E2E 互換)', () => {
    expect(SRC).toContain('testID="e2e_paywall_comparison"');
  });

  test('6. 既存 PlanCard 3 種 (monthly / yearly / lifetime) 維持', () => {
    expect(SRC).toContain('testID="e2e_plan_monthly"');
    expect(SRC).toContain('testID="e2e_plan_yearly"');
    expect(SRC).toContain('testID="e2e_plan_lifetime"');
  });
});
