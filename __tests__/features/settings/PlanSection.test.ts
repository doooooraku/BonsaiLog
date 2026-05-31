/**
 * PlanSection 静的解析 test (Sess57 ADR-0009 / Repolog 風強化整合)。
 *
 * 静的解析 pattern (fs.readFileSync + regex matching、 RN 描画不要)。
 *
 * 仕様 (Plan: squishy-sparking-toast.md 参照):
 * 1. 現在のプラン row (e2e_open_paywall、 状態 badge、 Free 時 Upgrade CTA)
 * 2. (Pro 期限あり / Lifetime) 次回更新日 or 永久アクセス
 * 3. 説明文 (Free / Pro 分岐)
 * 4. (Free のみ) Pro メリット bullet 4 項目 (paywallFeature* 流用)
 * 5. (Free のみ) Primary CTA「Pro プランを見る」 (e2e_view_pro_plans)
 * 6. 「ご購入履歴を復元」 row (Apple Review 3.1.1)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(
  resolve(__dirname, '../../../src/features/settings/PlanSection.tsx'),
  'utf8',
);

describe('PlanSection (Sess57 Repolog 風強化)', () => {
  test('1. 既存 testID を全て保持 (互換性)', () => {
    expect(SRC).toContain('testID="e2e_open_paywall"');
    expect(SRC).toContain('testID="e2e_settings_plan_status_badge"');
    expect(SRC).toContain('testID="e2e_settings_plan_upgrade_cta"');
    expect(SRC).toContain('testID="e2e_settings_restore_purchase"');
  });

  test('2. 新規 testID e2e_view_pro_plans (Primary CTA)', () => {
    expect(SRC).toContain('testID="e2e_view_pro_plans"');
  });

  test('3. 状態 label 3 種 (Free / Pro / Lifetime) 分岐', () => {
    expect(SRC).toContain("t('proPlanLifetimeTitle')");
    expect(SRC).toContain("t('proBadgeShort')");
    expect(SRC).toContain("t('proPlanFreeTitle')");
  });

  test('4. 新規 i18n key 6 種を使用', () => {
    expect(SRC).toContain("t('settingsCurrentPlan')");
    expect(SRC).toContain("t('settingsRenewsOn')");
    expect(SRC).toContain("t('settingsLifetimeAccess')");
    expect(SRC).toContain("t('settingsDescFree')");
    expect(SRC).toContain("t('settingsDescPro')");
    expect(SRC).toContain("t('settingsViewProPlans')");
  });

  test('5. Pro メリット 3 列表 (Sess60 PR3 で bullet → table 化、 Pro 機能 6 項目)', () => {
    // 旧 bullet key 削除確認 (settingsBenefit* は bullet 専用、 表化で paywallFeature* に統一)
    expect(SRC).not.toContain("'settingsBenefitPhoto'");
    expect(SRC).not.toContain("'settingsBenefitTag'");
    expect(SRC).not.toContain("'settingsBenefitWorkLogPhoto'");
    expect(SRC).not.toContain("'settingsBenefitCustomSpecies'");
    // Sess58 「全 Free」 確定の paywallFeatureBackup は表から除外
    expect(SRC).not.toContain("'paywallFeatureBackup'");
    // Sess58: paywallFeatureYearlyTimeline 撤廃済
    expect(SRC).not.toContain("'paywallFeatureYearlyTimeline'");
  });

  test('5b. Sess60 PR3 で bullet → 3 列表化 (PaywallScreen FeatureRow と同設計)', () => {
    // 3 列表の testID 追加
    expect(SRC).toContain('testID="e2e_settings_plan_feature_table"');
    // FeatureRow と同 i18n key 構造 (paywallFeature*Label + FreeValue + ProValue)
    expect(SRC).toContain("'paywallFeaturePhoto'");
    expect(SRC).toContain("'paywallFeaturePhotoFreeValue'");
    expect(SRC).toContain("'paywallFeaturePhotoProValue'");
    expect(SRC).toContain("'paywallFeatureCsvFreeValue'");
    expect(SRC).toContain("'paywallFeatureCsvProValue'");
    // 機能名「広告非表示」 統一 (Sess60 PR2 で paywallFeatureNoAds が「広告非表示」 になった)
    expect(SRC).toContain("'paywallFeatureNoAds'");
  });

  test('6. Pro / Free 表示分岐 (isPro による条件レンダ)', () => {
    // bullet と CTA は Free 限定 (!isPro && ... の表現があること)
    expect(SRC).toMatch(/!isPro\s*&&/);
    // 説明文は isPro ? descPro : descFree の 3 項演算子
    expect(SRC).toMatch(/isPro\s*\?\s*t\('settingsDescPro'\)\s*:\s*t\('settingsDescFree'\)/);
  });

  test('7. Lifetime 分岐 (planType === "lifetime")', () => {
    expect(SRC).toMatch(/planType\s*===\s*['"]lifetime['"]/);
  });

  test('8. 復元 (Apple Review 3.1.1) ロジック保持', () => {
    expect(SRC).toMatch(/restorePro\(\)/);
    expect(SRC).toContain("t('restoreSuccess')");
    expect(SRC).toContain("t('restoreNotFound')");
    expect(SRC).toContain("t('restoreFailed')");
  });

  test('9. /pro 画面遷移 (Free CTA から)', () => {
    // router.push('/pro') を最低 2 回 (現在のプラン row + Primary CTA)
    const matches = SRC.match(/router\.push\(['"]\/pro['"]/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});
