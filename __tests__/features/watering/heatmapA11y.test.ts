/**
 * F-04 Phase D-3 — accessibilityLabel 生成 純関数テスト (Issue #29 / ADR-0013 AC10)。
 */

import {
  buildHeatmapAggregateLabel,
  buildHeatmapCellLabel,
  formatDateForA11y,
  formatWeekdayForA11y,
} from '@/src/features/watering/heatmapA11y';

describe('formatDateForA11y (Intl.DateTimeFormat 経由)', () => {
  test('ja: 2026-04-15 → 2026年4月15日', () => {
    expect(formatDateForA11y('2026-04-15', 'ja')).toBe('2026年4月15日');
  });

  test('en: 2026-04-15 → April 15, 2026', () => {
    expect(formatDateForA11y('2026-04-15', 'en')).toMatch(/April 15,?\s*2026/);
  });

  test('不正な dateKey → そのまま返す (フォールバック)', () => {
    expect(formatDateForA11y('not-a-date', 'ja')).toBe('not-a-date');
    expect(formatDateForA11y('20260415', 'ja')).toBe('20260415');
  });

  test('locale が不正 → throw せず Intl の default で処理 or fallback', () => {
    // Intl.DateTimeFormat は不正 locale で throw する場合があるが catch でフォールバック
    const result = formatDateForA11y('2026-04-15', 'invalid-LOCALE-xxx');
    // 例外は出ない (catch 内で dateKey 返却 or default 解決)
    expect(typeof result).toBe('string');
  });
});

describe('formatWeekdayForA11y (Intl.DateTimeFormat 経由)', () => {
  test('ja: 2026-04-15 (水曜日)', () => {
    // 2026-04-15 は水曜日 (Date.UTC ベースの計算で確認済)
    expect(formatWeekdayForA11y('2026-04-15', 'ja')).toBe('水曜日');
  });

  test('en: Wednesday', () => {
    expect(formatWeekdayForA11y('2026-04-15', 'en')).toBe('Wednesday');
  });

  test('不正な dateKey → 空文字', () => {
    expect(formatWeekdayForA11y('not-a-date', 'ja')).toBe('');
    expect(formatWeekdayForA11y('', 'ja')).toBe('');
  });
});

describe('buildHeatmapCellLabel (AC10-2)', () => {
  test('ja テンプレート: 2026年4月15日 水曜日、水やり 2 回', () => {
    const label = buildHeatmapCellLabel({
      dateKey: '2026-04-15',
      count: 2,
      locale: 'ja',
      template: ({ dateText, weekdayText, count }) =>
        `${dateText} ${weekdayText}、水やり ${count} 回`,
    });
    expect(label).toBe('2026年4月15日 水曜日、水やり 2 回');
  });

  test('en テンプレート', () => {
    const label = buildHeatmapCellLabel({
      dateKey: '2026-04-15',
      count: 0,
      locale: 'en',
      template: ({ dateText, weekdayText, count }) =>
        `${dateText} ${weekdayText}, watered ${count} time(s)`,
    });
    expect(label).toMatch(/Wednesday/);
    expect(label).toMatch(/0/);
  });

  test('count 負値 → 0 にクランプ', () => {
    const label = buildHeatmapCellLabel({
      dateKey: '2026-04-15',
      count: -3,
      locale: 'ja',
      template: ({ count }) => `${count} 回`,
    });
    expect(label).toBe('0 回');
  });

  test('count 小数 → floor', () => {
    const label = buildHeatmapCellLabel({
      dateKey: '2026-04-15',
      count: 2.7,
      locale: 'ja',
      template: ({ count }) => `${count} 回`,
    });
    expect(label).toBe('2 回');
  });

  test('テンプレートで dateText / weekdayText を一切使わない場合 → count のみ反映', () => {
    const label = buildHeatmapCellLabel({
      dateKey: '2026-04-15',
      count: 5,
      locale: 'ja',
      template: ({ count }) => `回数: ${count}`,
    });
    expect(label).toBe('回数: 5');
  });
});

describe('buildHeatmapAggregateLabel (AC10-3)', () => {
  test('ja テンプレート: 365 日中 120 日記録、計 145 件', () => {
    const label = buildHeatmapAggregateLabel({
      recordedDays: 120,
      totalEvents: 145,
      windowDays: 365,
      template: ({ recordedDays, totalEvents, windowDays }) =>
        `${windowDays} 日中 ${recordedDays} 日記録、計 ${totalEvents} 件`,
    });
    expect(label).toBe('365 日中 120 日記録、計 145 件');
  });

  test('en テンプレート', () => {
    const label = buildHeatmapAggregateLabel({
      recordedDays: 50,
      totalEvents: 60,
      windowDays: 365,
      template: ({ recordedDays, totalEvents, windowDays }) =>
        `Recorded ${recordedDays} of ${windowDays} days, ${totalEvents} entries total`,
    });
    expect(label).toBe('Recorded 50 of 365 days, 60 entries total');
  });

  test('全部 0 のケース', () => {
    const label = buildHeatmapAggregateLabel({
      recordedDays: 0,
      totalEvents: 0,
      windowDays: 365,
      template: ({ recordedDays, totalEvents, windowDays }) =>
        `${windowDays} 日中 ${recordedDays} 日、計 ${totalEvents} 件`,
    });
    expect(label).toBe('365 日中 0 日、計 0 件');
  });

  test('負値 → 0 にクランプ', () => {
    const label = buildHeatmapAggregateLabel({
      recordedDays: -5,
      totalEvents: -10,
      windowDays: 365,
      template: ({ recordedDays, totalEvents }) => `${recordedDays}/${totalEvents}`,
    });
    expect(label).toBe('0/0');
  });

  test('windowDays 負値・0 → 1 にクランプ', () => {
    const label = buildHeatmapAggregateLabel({
      recordedDays: 0,
      totalEvents: 0,
      windowDays: -10,
      template: ({ windowDays }) => `${windowDays}`,
    });
    expect(label).toBe('1');
  });

  test('小数 → floor', () => {
    const label = buildHeatmapAggregateLabel({
      recordedDays: 5.9,
      totalEvents: 7.3,
      windowDays: 365.7,
      template: ({ recordedDays, totalEvents, windowDays }) =>
        `${recordedDays}/${totalEvents}/${windowDays}`,
    });
    expect(label).toBe('5/7/365');
  });
});

describe('AC10 シナリオ統合', () => {
  test('シナリオ A: 平日複数記録のセル', () => {
    const label = buildHeatmapCellLabel({
      dateKey: '2026-04-15',
      count: 3,
      locale: 'ja',
      template: ({ dateText, weekdayText, count }) =>
        `${dateText} ${weekdayText}、水やり ${count} 回`,
    });
    expect(label).toBe('2026年4月15日 水曜日、水やり 3 回');
  });

  test('シナリオ B: 記録なし日のセル (count=0)', () => {
    const label = buildHeatmapCellLabel({
      dateKey: '2026-04-16',
      count: 0,
      locale: 'ja',
      template: ({ dateText, weekdayText, count }) =>
        count === 0
          ? `${dateText} ${weekdayText}、記録なし`
          : `${dateText} ${weekdayText}、水やり ${count} 回`,
    });
    expect(label).toBe('2026年4月16日 木曜日、記録なし');
  });

  test('シナリオ C: 年間集約 (365 日)', () => {
    const label = buildHeatmapAggregateLabel({
      recordedDays: 200,
      totalEvents: 280,
      windowDays: 365,
      template: ({ recordedDays, totalEvents, windowDays }) =>
        `直近 ${windowDays} 日、${recordedDays} 日に水やり、計 ${totalEvents} 件`,
    });
    expect(label).toBe('直近 365 日、200 日に水やり、計 280 件');
  });
});
