/**
 * PaywallScreen FeatureRow 整合 test (ADR-0049 Sess59 PR2 + Sess81 PR-9 で 7 行化)。
 *
 * Sess58 + Sess81 確定 Pro 機能 7 項目との完全一致を確認:
 * - ① paywallFeaturePhoto (基本情報写真)
 * - ② paywallFeatureTag (タグ)
 * - ③ paywallFeatureWorkLogPhoto (作業記録写真)
 * - ④ paywallFeatureCsv (CSV/PDF、 既存)
 * - ⑤ paywallFeatureNoAds (広告非表示、 既存)
 * - ⑥ paywallFeatureCustomSpecies (カスタム樹種樹形)
 * - ⑦ paywallFeatureRecurringRule (定期予定、 Sess81 PR-9 で追加、 ADR-0056 D7)
 *
 * 削除確認 (Sess58 で「全 Free」 確定):
 * - paywallFeatureBonsaiCount / paywallFeatureHistory / paywallFeatureBackup / paywallFeatureTheme
 *
 * 静的解析 pattern (fs.readFileSync + regex matching、 RN 描画不要)。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(__dirname, '../../../src/features/pro/PaywallScreen.tsx'), 'utf8');

describe('PaywallScreen FeatureRow (ADR-0049 Sess59 PR2 + Sess81 PR-9 で 7 項目整合)', () => {
  test('1. FeatureRow 7 行が ADR-0049 ①〜⑦ に整合', () => {
    expect(SRC).toContain("t('paywallFeaturePhoto')"); // ①
    expect(SRC).toContain("t('paywallFeatureTag')"); // ②
    expect(SRC).toContain("t('paywallFeatureWorkLogPhoto')"); // ③
    expect(SRC).toContain("t('paywallFeatureCsv')"); // ④ (既存)
    expect(SRC).toContain("t('paywallFeatureNoAds')"); // ⑤ (既存)
    expect(SRC).toContain("t('paywallFeatureCustomSpecies')"); // ⑥
    expect(SRC).toContain("t('paywallFeatureRecurringRule')"); // ⑦ (Sess81 PR-9)
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
    // Sess81 PR-9: ⑦ 定期予定の Free/Pro 値 i18n key
    expect(SRC).toContain("t('paywallFeatureRecurringRuleFreeValue')");
    expect(SRC).toContain("t('paywallFeatureRecurringRuleProValue')");
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

// Sess105 PR1: 構造変換 (radio + sticky CTA) 検証 (ClaudeDesign monetization-screens.jsx 整合)
describe('PaywallScreen Sess105 PR1 構造 (radio + sticky CTA)', () => {
  test('1. sticky CTA testID + 新規 PlanRow 構造が組み込まれている', () => {
    expect(SRC).toContain('testID="e2e_paywall_sticky_cta"');
    // PlanRow 関数 (radio + middle + price right) が定義されている
    expect(SRC).toContain('function PlanRow(');
    expect(SRC).toContain('accessibilityRole="radio"');
  });

  test('2. 新規 14 i18n key が PlanRow / sticky CTA で参照されている', () => {
    expect(SRC).toContain("t('paywallPlanSectionLabel')");
    expect(SRC).toContain("t('paywallTaxNotice')");
    expect(SRC).toContain("t('paywallPlanRecommendedBadge')");
    expect(SRC).toContain("t('paywallPlanYearlySubCopy')");
    expect(SRC).toContain("t('paywallPlanMonthlySubCopy')");
    expect(SRC).toContain("t('paywallPlanLifetimeSubCopy')");
    expect(SRC).toContain("t('paywallPlanYearlyPerMonth')");
    expect(SRC).toContain("t('paywallPlanPeriodMonth')");
    expect(SRC).toContain("t('paywallPlanPeriodYear')");
    expect(SRC).toContain("t('paywallPlanPeriodLifetime')");
    expect(SRC).toContain("t('paywallStickyCtaLabel')");
    expect(SRC).toContain("t('paywallStickyCtaSummaryMonthly')");
    expect(SRC).toContain("t('paywallStickyCtaSummaryYearly')");
    expect(SRC).toContain("t('paywallStickyCtaSummaryLifetime')");
  });

  test('3. sticky CTA は Champion (lifetime owner) 時に完全非表示', () => {
    // showStickyCta = !isChampion で制御
    expect(SRC).toContain('const showStickyCta');
    expect(SRC).toContain('isChampion');
    // sticky footer 自体が showStickyCta && (...) で囲まれている
    expect(SRC).toMatch(/showStickyCta\s*&&\s*\(/);
  });

  test('4. sticky CTA disabled 条件 (isPro 非 lifetime + Champion 時 + action 進行中)', () => {
    expect(SRC).toContain('stickyCtaDisabled');
    // isPro && selectedPlan !== 'lifetime' (購入済プラン再購入不可)
    expect(SRC).toMatch(/isPro\s*&&\s*selectedPlan\s*!==\s*['"]lifetime['"]/);
    // Champion (lifetime owner) + selectedPlan === 'lifetime' (同 plan 再購入不可)
    expect(SRC).toMatch(/isChampion\s*&&\s*selectedPlan\s*===\s*['"]lifetime['"]/);
    // action !== null (進行中)
    expect(SRC).toMatch(/action\s*!==\s*null/);
  });

  test('5. Lifetime 購入時 ADR-0009 AC5 Apple Review 3.1.2(c) 警告 Alert 維持', () => {
    // handlePurchase('lifetime') で Alert.alert(lifetimeWarningTitle, lifetimeWarningBody)
    expect(SRC).toContain("t('lifetimeWarningTitle')");
    expect(SRC).toContain("t('lifetimeWarningBody')");
    expect(SRC).toContain("plan === 'lifetime'");
  });

  test('6. 法務安全: 取消線元値 / お得% は本 PR 不採用 (景表法 5 条リスク回避)', () => {
    // 取消線実装 (RN textDecorationLine: 'line-through' / 'strikethrough') を使っていない
    expect(SRC).not.toContain('line-through');
    expect(SRC).not.toContain('strikethrough');
    expect(SRC).not.toContain('textDecorationLine');
    // 取消線テキスト styles も無い (mockup の `orig` prop は採用していない)
    expect(SRC).not.toMatch(/<ThemedText[^>]*orig=/);
    expect(SRC).not.toMatch(/origPrice/);
    expect(SRC).not.toMatch(/originalPrice/);
  });

  test('7. radio 選択は selectedPlan state で制御、 hideSubscriptions 時は lifetime デフォルト', () => {
    expect(SRC).toContain('selectedPlan');
    expect(SRC).toContain('setSelectedPlan');
    expect(SRC).toMatch(/hideSubscriptions\s*\?\s*['"]lifetime['"]\s*:\s*['"]yearly['"]/);
  });

  test('8. 月割り表示は RC pricePerMonthString 由来 (ハードコードしない)', () => {
    expect(SRC).toContain('pricePerMonthString');
    expect(SRC).toContain('yearlyPerMonthLabel');
    expect(SRC).toContain('priceDetails');
    expect(SRC).toContain('priceString');
  });

  test('9. Apple Review 3.1.1 「購入を復元」 ボタン維持 (Paywall 内)', () => {
    expect(SRC).toContain('testID="e2e_paywall_restore"');
    expect(SRC).toContain("t('restore')");
  });
});
