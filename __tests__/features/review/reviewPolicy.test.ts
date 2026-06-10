/**
 * reviewPolicy 純粋関数の境界値テスト (ADR-0006 Sess98 Amendment D2/D3/D4)。
 *
 * RN / Expo import ゼロの純粋関数のみを対象 (expo-store-review の呼び出しは
 * Play Store 配布ビルドでしか検証できないため、 gate 判定をここで完全に押さえる)。
 */
import {
  FIRST_LAUNCH_PROTECTION_DAYS,
  REVIEW_MILESTONES,
  resolveReviewMilestone,
  reviewCooldownDays,
  shouldRequestReview,
  type ReviewGateInput,
} from '@/src/features/review/reviewPolicy';

const NOW = '2026-06-11T00:00:00.000Z';

/** NOW から days 日前の UTC ISO。 */
function daysAgo(days: number): string {
  return new Date(Date.parse(NOW) - days * 24 * 60 * 60 * 1000).toISOString();
}

/** 発火可能な基準 input (累計 10 件 / 初回起動 30 日前 / 未試行)。 */
function baseInput(overrides: Partial<ReviewGateInput> = {}): ReviewGateInput {
  return {
    totalLoggedCount: 10,
    requestCount: 0,
    lastRequestAtUtc: null,
    firstLaunchAtUtc: daysAgo(30),
    lastMilestone: 0,
    nowUtc: NOW,
    ...overrides,
  };
}

describe('resolveReviewMilestone (D2)', () => {
  it.each([
    [0, null],
    [9, null],
    [10, 10],
    [29, 10],
    [30, 30],
    [74, 30],
    [75, 75],
    [149, 75],
    [150, 150],
    [299, 150],
    [300, 300],
    [10000, 300],
  ])('累計 %i 件 → マイルストーン %p', (count, expected) => {
    expect(resolveReviewMilestone(count)).toBe(expected);
  });

  it('マイルストーン定義は昇順 (判定 loop の前提)', () => {
    const sorted = [...REVIEW_MILESTONES].sort((a, b) => a - b);
    expect([...REVIEW_MILESTONES]).toEqual(sorted);
  });
});

describe('reviewCooldownDays (D3 逓増)', () => {
  it.each([
    [0, 30],
    [1, 30],
    [2, 60],
    [3, 90],
    [10, 90],
  ])('試行 %i 回後 → %i 日', (requestCount, expected) => {
    expect(reviewCooldownDays(requestCount)).toBe(expected);
  });
});

describe('shouldRequestReview', () => {
  it('マイルストーン未達 (9 件) → 出さない', () => {
    expect(shouldRequestReview(baseInput({ totalLoggedCount: 9 }))).toEqual({
      request: false,
      milestone: null,
    });
  });

  it('10 件到達 + 保護期間経過 + 未試行 → 出す (milestone 10)', () => {
    expect(shouldRequestReview(baseInput())).toEqual({ request: true, milestone: 10 });
  });

  it('同一マイルストーン試行済み (lastMilestone=10, 29 件) → 出さない', () => {
    const result = shouldRequestReview(
      baseInput({
        totalLoggedCount: 29,
        lastMilestone: 10,
        requestCount: 1,
        lastRequestAtUtc: daysAgo(100),
      }),
    );
    expect(result.request).toBe(false);
  });

  it('次マイルストーン到達 (30 件) + cooldown 経過 → 出す (milestone 30)', () => {
    const result = shouldRequestReview(
      baseInput({
        totalLoggedCount: 30,
        lastMilestone: 10,
        requestCount: 1,
        lastRequestAtUtc: daysAgo(30),
      }),
    );
    expect(result).toEqual({ request: true, milestone: 30 });
  });

  describe('D4: 初回起動 3 日保護', () => {
    it('firstLaunchAtUtc 未記録 (null) → 出さない', () => {
      expect(shouldRequestReview(baseInput({ firstLaunchAtUtc: null })).request).toBe(false);
    });

    it('初回起動から 3 日未満 → 出さない', () => {
      expect(
        shouldRequestReview(
          baseInput({ firstLaunchAtUtc: daysAgo(FIRST_LAUNCH_PROTECTION_DAYS - 0.001) }),
        ).request,
      ).toBe(false);
    });

    it('初回起動からちょうど 3 日 → 出す (境界は経過扱い)', () => {
      expect(
        shouldRequestReview(baseInput({ firstLaunchAtUtc: daysAgo(FIRST_LAUNCH_PROTECTION_DAYS) }))
          .request,
      ).toBe(true);
    });
  });

  describe('D3: 逓増 cooldown 境界', () => {
    const at30 = (lastRequestDaysAgo: number, requestCount: number) =>
      shouldRequestReview(
        baseInput({
          totalLoggedCount: 30,
          lastMilestone: 10,
          requestCount,
          lastRequestAtUtc: daysAgo(lastRequestDaysAgo),
        }),
      ).request;

    it('1 回試行済み: 29 日経過 → 出さない / 30 日経過 → 出す', () => {
      expect(at30(29, 1)).toBe(false);
      expect(at30(30, 1)).toBe(true);
    });

    it('2 回試行済み: 59 日経過 → 出さない / 60 日経過 → 出す', () => {
      expect(at30(59, 2)).toBe(false);
      expect(at30(60, 2)).toBe(true);
    });

    it('3 回以上試行済み: 89 日経過 → 出さない / 90 日経過 → 出す', () => {
      expect(at30(89, 3)).toBe(false);
      expect(at30(90, 3)).toBe(true);
      expect(at30(89, 5)).toBe(false);
      expect(at30(90, 5)).toBe(true);
    });
  });

  it('マイルストーン跳び越え (一括記録で 9 → 35 件) → 最大到達の 30 を 1 回だけ試行', () => {
    const result = shouldRequestReview(baseInput({ totalLoggedCount: 35 }));
    expect(result).toEqual({ request: true, milestone: 30 });
  });

  it('lastMilestone が最大 (300) 到達済み → それ以上は出さない', () => {
    expect(
      shouldRequestReview(
        baseInput({
          totalLoggedCount: 10000,
          lastMilestone: 300,
          requestCount: 5,
          lastRequestAtUtc: daysAgo(365),
        }),
      ).request,
    ).toBe(false);
  });
});
