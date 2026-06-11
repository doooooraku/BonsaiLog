/**
 * RecurrenceListScreen 静的解析 test (Sess81 PR-7.5、 ADR-0056 + ADR-0035 D9 部分 revert)。
 *
 * recurrenceRuleRepository.test.ts と同 pattern: fs.readFileSync + regex matching、 RN 描画不要。
 * 実 DB CRUD + UI rendering の動作確認は実機 SH-M25 で 行う (= PR-10 Maestro 範囲)。
 *
 * 確認項目:
 * 1. listActiveRecurrenceRules() を 取得元として 使用 (useRecurrenceRules hook 経由)
 * 2. softDeleteRecurrenceRule() を 削除動線で 使用 (ConfirmDialog から)
 * 3. FREE_RECURRENCE_RULE_LIMIT を 件数超過 badge 判定に 使用 (ADR-0049 ⑦)
 * 4. ConfirmDialog (R-44 破壊的操作 pattern) を 削除確認で 使用
 * 5. 6 preset RRULE → 人間可読 i18n key 逆引き (recurringPreset* + recurringRruleHumanCustom)
 * 6. testID 命名規約 (= e2e_recurrence_*)
 *
 * 参照: src/features/recurrence/RecurrenceListScreen.tsx
 *        src/features/recurrence/useRecurrenceRules.ts
 *        src/db/recurrenceRuleRepository.ts (listActiveRecurrenceRules / softDeleteRecurrenceRule)
 *        ADR-0056 D R-67 (events + recurrence_rules 2 重 matrix)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SCREEN_SRC = readFileSync(
  resolve(__dirname, '../../../src/features/recurrence/RecurrenceListScreen.tsx'),
  'utf8',
);
const HOOK_SRC = readFileSync(
  resolve(__dirname, '../../../src/features/recurrence/useRecurrenceRules.ts'),
  'utf8',
);
const REPO_SRC = readFileSync(
  resolve(__dirname, '../../../src/db/recurrenceRuleRepository.ts'),
  'utf8',
);

describe('RecurrenceListScreen (Sess81 PR-7.5、 ADR-0056 + ADR-0035 D9 部分 revert)', () => {
  test('1. useRecurrenceRules hook を 使用 (listActiveRecurrenceRules + bonsaiMap 提供)', () => {
    expect(SCREEN_SRC).toMatch(/useRecurrenceRules\(\)/);
    expect(HOOK_SRC).toContain('listActiveRecurrenceRules');
    expect(HOOK_SRC).toContain('getAllActiveBonsai');
    expect(REPO_SRC).toContain('export async function listActiveRecurrenceRules');
  });

  test('2. softDeleteRecurrenceRule で 削除動線実装 (R-44 ConfirmDialog 経由)', () => {
    expect(SCREEN_SRC).toContain('softDeleteRecurrenceRule');
    expect(SCREEN_SRC).toContain('ConfirmDialog');
    expect(SCREEN_SRC).toContain('destructive');
    // 削除 confirm dialog の i18n keys (R-67 events 12 cell / D 削除動線)
    expect(SCREEN_SRC).toContain("t('recurringListDeleteConfirmTitle')");
    expect(SCREEN_SRC).toContain("t('recurringListDeleteConfirmDesc')");
  });

  test('3. FREE_RECURRENCE_RULE_LIMIT を 件数超過 badge 判定に使用 (ADR-0049 ⑦ Grandfathered)', () => {
    expect(SCREEN_SRC).toContain('FREE_RECURRENCE_RULE_LIMIT');
    expect(SCREEN_SRC).toContain('isOverFreeLimit');
    expect(SCREEN_SRC).toContain("t('recurringListProBadgeOverLimit')");
  });

  test('4. 6 preset RRULE → 人間可読 i18n key 逆引き (rruleToHumanLabel 純関数)', () => {
    // 6 preset の逆引き mapping (ADR-0056 D4)
    expect(SCREEN_SRC).toContain("'FREQ=DAILY'");
    expect(SCREEN_SRC).toContain("'FREQ=WEEKLY;BYDAY=MO'");
    expect(SCREEN_SRC).toContain("'FREQ=WEEKLY'");
    expect(SCREEN_SRC).toContain("'FREQ=WEEKLY;INTERVAL=2'");
    expect(SCREEN_SRC).toContain("'FREQ=MONTHLY'");
    // i18n keys (recurringPicker preset 流用)
    expect(SCREEN_SRC).toContain("'recurringPresetDaily'");
    expect(SCREEN_SRC).toContain("'recurringPresetWeeklyMonday'");
    expect(SCREEN_SRC).toContain("'recurringPresetWeekly'");
    expect(SCREEN_SRC).toContain("'recurringPresetBiweekly'");
    expect(SCREEN_SRC).toContain("'recurringPresetMonthly'");
    // 未マッチ fallback
    expect(SCREEN_SRC).toContain("'recurringRruleHumanCustom'");
  });

  test('5. testID 命名規約 (= e2e_recurrence_*、 Maestro PR-10 互換)', () => {
    expect(SCREEN_SRC).toContain('e2e_recurrence_list_screen');
    // Sess99 #1122 案 G2: 1 行 = 1 グループ、 testID は代表 rule (rep) の id で採番
    expect(SCREEN_SRC).toContain('e2e_recurrence_rule_${rep.id}');
    expect(SCREEN_SRC).toContain('e2e_recurrence_rule_kebab_${rep.id}');
    expect(SCREEN_SRC).toContain('e2e_recurrence_delete_dialog');
  });

  test('5b. Sess99 #1122 案 G2: グループ表示 + グループ置換を使用', () => {
    expect(SCREEN_SRC).toContain('groups');
    expect(HOOK_SRC).toContain('groupRecurrenceRules');
    expect(REPO_SRC).toContain('ruleGroupKey');
    expect(REPO_SRC).toContain('replaceRecurrenceRuleGroup');
    expect(REPO_SRC).toContain('group_id');
  });

  test('5c. Sess101 #1158: 予定中心カード (種別·頻度 主役 / 盆栽件数のみ / 次回ローカライズ)', () => {
    // 盆栽は件数のみ (i18n key) — 盆栽名 join + ×N badge は廃止
    expect(SCREEN_SRC).toContain("t('recurringListItemBonsaiCount')");
    expect(SCREEN_SRC).not.toContain('countBadge');
    expect(SCREEN_SRC).not.toContain("t('recurringListItemDeletedBonsai')");
    // 次回 = ローカライズ日付 + 通知時刻 (フォーム RulePreviewCard と形式統一)
    expect(SCREEN_SRC).toContain('formatLocalizedShortDateWithWeekday');
    expect(SCREEN_SRC).toContain('notificationDailySummaryTime');
    // 文字サイズ (Sess101 user 決定: 16 / 14 / 13)
    expect(SCREEN_SRC).toMatch(/groupTitle:\s*\{\s*fontSize:\s*16/);
    expect(SCREEN_SRC).toMatch(/bonsaiCount:\s*\{\s*fontSize:\s*14/);
    expect(SCREEN_SRC).toMatch(/nextLabel:\s*\{\s*fontSize:\s*13/);
  });

  test('6. empty state 実装 (= 「予定タブから 🔁 で 作成できます」 案内)', () => {
    expect(SCREEN_SRC).toContain("t('recurringListEmptyTitle')");
    expect(SCREEN_SRC).toContain("t('recurringListEmptyDesc')");
    // rules.length === 0 分岐
    expect(SCREEN_SRC).toMatch(/rules\.length === 0/);
  });

  test('7. Stack.Screen で native header title 設定 (= backup pattern 整合、 ADR-0053 Sess66 PR5)', () => {
    expect(SCREEN_SRC).toContain('Stack.Screen');
    expect(SCREEN_SRC).toContain("t('recurringListScreenTitle')");
  });
});

describe('listActiveRecurrenceRules (Sess81 PR-7.5、 ADR-0056 §CRUD Coverage R-67 recurrence_rules R 動線)', () => {
  test('1. SELECT WHERE deleted_at IS NULL ORDER BY created_at DESC (active rules のみ + 新しい順)', () => {
    expect(REPO_SRC).toContain('FROM recurrence_rules');
    expect(REPO_SRC).toContain('WHERE deleted_at IS NULL');
    expect(REPO_SRC).toContain('ORDER BY created_at DESC');
  });

  test('2. snake_case → camelCase mapping (= existing rowMapper pattern)', () => {
    expect(REPO_SRC).toMatch(/bonsaiId:\s*r\.bonsai_id/);
    expect(REPO_SRC).toMatch(/eventType:\s*r\.event_type/);
    expect(REPO_SRC).toMatch(/exdates:\s*JSON\.parse\(r\.exdates\)/);
  });
});
