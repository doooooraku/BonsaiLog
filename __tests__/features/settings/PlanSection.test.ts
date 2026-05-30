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

  test('5. Pro メリット bullet 6 項目 (ADR-0049 Sess59 PR2 Pro 機能 6 項目フラット表示)', () => {
    // ① 基本情報写真 / ② タグ / ③ 作業記録写真 / ④ CSV-PDF / ⑤ 広告非表示 / ⑥ カスタム樹種樹形
    expect(SRC).toContain("'settingsBenefitPhoto'");
    expect(SRC).toContain("'settingsBenefitTag'");
    expect(SRC).toContain("'settingsBenefitWorkLogPhoto'");
    expect(SRC).toContain("'paywallFeatureCsv'");
    // Sess57 検証発覚: 「広告表示」 が意味曖昧なので「広告非表示」 専用 key を維持
    expect(SRC).toContain("'settingsBenefitNoAds'");
    expect(SRC).not.toContain("'paywallFeatureNoAds'");
    expect(SRC).toContain("'settingsBenefitCustomSpecies'");
    // Sess58: paywallFeatureYearlyTimeline (年次タイムライン画像) は実装ゼロ
    // のため撤廃済 (景品表示法/Apple Review 2.3.1 リスク回避)。
    expect(SRC).not.toContain("'paywallFeatureYearlyTimeline'");
    // Sess58 「全 Free」 確定の paywallFeatureBackup は bullet から削除
    // (Sess59 PR2 で 6 項目フラット = ADR-0049 Pro 機能境界整合)
    expect(SRC).not.toContain("'paywallFeatureBackup'");
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
