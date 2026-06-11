/**
 * reviewPolicy 純粋関数の境界値テスト (ADR-0006 Sess98 Amendment + 追補 2)。
 *
 * RN / Expo import ゼロの純粋関数のみを対象 (expo-store-review の呼び出しは
 * Play Store 配布ビルドでしか検証できないため、 gate 判定をここで完全に押さえる)。
 */
import {
  FIRST_LAUNCH_PROTECTION_DAYS,
  REVIEW_COOLDOWN_DAYS_ANDROID,
  REVIEW_COOLDOWN_DAYS_IOS,
  REVIEW_DELTA_EVENTS,
  REVIEW_MIN_TOTAL_EVENTS,
  reviewCooldownDays,
  shouldRequestReview,
  type ReviewGateInput,
} from '@/src/features/review/reviewPolicy';

const NOW = '2026-06-11T00:00:00.000Z';

/** NOW から days 日前の UTC ISO。 */
function daysAgo(days: number): string {
  return new Date(Date.parse(NOW) - days * 24 * 60 * 60 * 1000).toISOString();
}

/** 発火可能な基準 input (累計 10 件 / 初回起動 30 日前 / 未試行 / Android)。 */
function baseInput(overrides: Partial<ReviewGateInput> = {}): ReviewGateInput {
  return {
    totalLoggedCount: REVIEW_MIN_TOTAL_EVENTS,
    countAtLastRequest: null,
    lastRequestAtUtc: null,
    firstLaunchAtUtc: daysAgo(30),
    nowUtc: NOW,
    platform: 'android',
    ...overrides,
  };
}

describe('reviewCooldownDays (platform 別)', () => {
  it('android = 30 日 (Play quota ≒ 月 1 回に張り付く)', () => {
    expect(reviewCooldownDays('android')).toBe(REVIEW_COOLDOWN_DAYS_ANDROID);
    expect(reviewCooldownDays('android')).toBe(30);
  });

  it('ios = 122 日 (年 3 回を 365÷3 で分散して使い切る)', () => {
    expect(reviewCooldownDays('ios')).toBe(REVIEW_COOLDOWN_DAYS_IOS);
    expect(reviewCooldownDays('ios')).toBe(122);
  });

  it('未知 platform は android 側 (30 日) に倒す', () => {
    expect(reviewCooldownDays('windows')).toBe(30);
  });
});

describe('shouldRequestReview — 初回試行', () => {
  it('累計 9 件 → 出さない / 10 件 → 出す (最低信頼ライン境界)', () => {
    expect(shouldRequestReview(baseInput({ totalLoggedCount: 9 }))).toBe(false);
    expect(shouldRequestReview(baseInput({ totalLoggedCount: 10 }))).toBe(true);
  });

  describe('D4: 初回起動 3 日保護', () => {
    it('firstLaunchAtUtc 未記録 (null) → 出さない', () => {
      expect(shouldRequestReview(baseInput({ firstLaunchAtUtc: null }))).toBe(false);
    });

    it('初回起動から 3 日未満 → 出さない / ちょうど 3 日 → 出す', () => {
      expect(
        shouldRequestReview(
          baseInput({ firstLaunchAtUtc: daysAgo(FIRST_LAUNCH_PROTECTION_DAYS - 0.001) }),
        ),
      ).toBe(false);
      expect(
        shouldRequestReview(baseInput({ firstLaunchAtUtc: daysAgo(FIRST_LAUNCH_PROTECTION_DAYS) })),
      ).toBe(true);
    });
  });
});

describe('shouldRequestReview — ループ条件 (2 回目以降)', () => {
  /** 前回試行 = 累計 20 件時点、 という 2 回目シナリオの input。 */
  const loop = (overrides: Partial<ReviewGateInput>) =>
    shouldRequestReview(
      baseInput({
        totalLoggedCount: 30,
        countAtLastRequest: 20,
        lastRequestAtUtc: daysAgo(30),
        ...overrides,
      }),
    );

  it('Android: 前回から 29 日 → 出さない / 30 日 → 出す', () => {
    expect(loop({ lastRequestAtUtc: daysAgo(29) })).toBe(false);
    expect(loop({ lastRequestAtUtc: daysAgo(30) })).toBe(true);
  });

  it('iOS: 前回から 121 日 → 出さない / 122 日 → 出す', () => {
    expect(loop({ platform: 'ios', lastRequestAtUtc: daysAgo(121) })).toBe(false);
    expect(loop({ platform: 'ios', lastRequestAtUtc: daysAgo(122) })).toBe(true);
  });

  it('増分: 前回から +9 件 → 出さない / +10 件 → 出す (cooldown 経過済み)', () => {
    expect(loop({ totalLoggedCount: 29 })).toBe(false); // 29 - 20 = +9
    expect(loop({ totalLoggedCount: 30 })).toBe(true); // 30 - 20 = +10
  });

  it('cooldown 経過していても増分不足なら出さない (1 年放置 → 復帰直後)', () => {
    expect(loop({ lastRequestAtUtc: daysAgo(365), totalLoggedCount: 25 })).toBe(false);
  });

  it('増分十分でも cooldown 未経過なら出さない (一括記録で急増)', () => {
    expect(loop({ lastRequestAtUtc: daysAgo(5), totalLoggedCount: 100 })).toBe(false);
  });

  it('countAtLastRequest 欠損 (null) は 0 起点で増分判定する (永久停止させない)', () => {
    expect(loop({ countAtLastRequest: null, totalLoggedCount: 30 })).toBe(true);
  });

  it('打ち止めなし: 何回試行済みでも条件を満たせば出す (生涯上限なし)', () => {
    // 累計 1000 件、 前回 990 件時点から 30 日経過 = 何周目でも true
    expect(
      loop({
        totalLoggedCount: 1000,
        countAtLastRequest: 1000 - REVIEW_DELTA_EVENTS,
        lastRequestAtUtc: daysAgo(REVIEW_COOLDOWN_DAYS_ANDROID),
      }),
    ).toBe(true);
  });
});
