/**
 * guideTriggers 発火判定 純関数 unit test (#1178 / ADR-0058)。
 *
 * AC: 既存ユーザー相当 (盆栽 2 本以上 / 記録あり) では g1 / g5 が発火しない。
 */
import {
  canShowGuide,
  shouldShowG1RecordTabNudge,
  shouldShowG5FirstRecordCelebration,
} from '@/src/features/guides/guideTriggers';
import { GUIDE_IDS } from '@/src/stores/guidesStore';

describe('canShowGuide — 生涯 1 回の共通条件', () => {
  test.each(GUIDE_IDS)('%s: 未視聴なら true / seen なら false', (id) => {
    expect(canShowGuide(id, {})).toBe(true);
    expect(canShowGuide(id, { [id]: true })).toBe(false);
  });

  test('他ガイドの seen は影響しない', () => {
    expect(canShowGuide('g2RecordCta', { g3PlanCta: true })).toBe(true);
  });
});

describe('shouldShowG1RecordTabNudge — 盆栽 1 本のときだけ', () => {
  test.each([
    [0, false], // 登録前 (empty state が担当)
    [1, true], // 1 本目登録直後だけ発火
    [2, false], // 既存ユーザー / 2 本目以降は出さない (AC)
    [10, false],
  ])('bonsaiCount=%i → %s', (count, expected) => {
    expect(shouldShowG1RecordTabNudge(count, {})).toBe(expected);
  });

  test('seen 済みなら 1 本でも出ない', () => {
    expect(shouldShowG1RecordTabNudge(1, { g1RecordTabNudge: true })).toBe(false);
  });
});

describe('shouldShowG5FirstRecordCelebration — 記録総数 0→1 のときだけ', () => {
  test.each([
    [1, true], // 最初の 1 件
    [2, false], // 2 件目以降 (既存ユーザーの追加記録を含む) は出さない (AC)
    [0, false], // 保存後 0 はあり得ないが安全側
  ])('loggedEventTotalAfterSave=%i → %s', (total, expected) => {
    expect(shouldShowG5FirstRecordCelebration(total, {})).toBe(expected);
  });

  test('seen 済みなら 1 件目相当でも出ない (reset 後の再記録対策)', () => {
    expect(shouldShowG5FirstRecordCelebration(1, { g5FirstRecordCelebrated: true })).toBe(false);
  });
});
