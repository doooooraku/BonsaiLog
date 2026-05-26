/**
 * F-10 樹種別サマリ (保有集計) 純関数テスト (Sess47 / ADR-0016 Amended)。
 */
import {
  buildSpeciesSummaryRows,
  SPECIES_CSV_HEADER_KEYS,
  type SpeciesSummaryBonsai,
  type SpeciesSummaryEvent,
} from '@/src/features/export/speciesSummary';

const t = ((k: string) => k) as Parameters<typeof buildSpeciesSummaryRows>[2];

const bonsai: SpeciesSummaryBonsai[] = [
  { id: 'b1', speciesName: '黒松' },
  { id: 'b2', speciesName: '黒松' },
  { id: 'b3', speciesName: '真柏' },
  { id: 'b4', speciesName: null }, // 樹種未設定
];

const ev = (bonsaiId: string, type: string, occurredAtUtc: string): SpeciesSummaryEvent => ({
  bonsaiId,
  type,
  occurredAtUtc,
  tzIana: 'Asia/Tokyo',
});

describe('buildSpeciesSummaryRows', () => {
  test('ヘッダ 6 列', () => {
    expect(SPECIES_CSV_HEADER_KEYS).toHaveLength(6);
  });

  test('樹種ごとに保有数を集計、保有数降順', () => {
    const rows = buildSpeciesSummaryRows(bonsai, [], t, '（未設定）');
    // 黒松(2) → 真柏(1) / 未設定(1) (同数は名前昇順)
    expect(rows[0][0]).toBe('黒松');
    expect(rows[0][1]).toBe('2');
    expect(rows.map((r) => r[0])).toContain('真柏');
    expect(rows.map((r) => r[0])).toContain('（未設定）');
  });

  test('種別別の最終作業日 (最新 occurred を採用、ローカル日付)', () => {
    const events = [
      ev('b1', 'watering', '2026-05-01T00:00:00.000Z'),
      ev('b2', 'watering', '2026-05-10T00:00:00.000Z'), // 黒松の最新水やり
      ev('b1', 'pruning', '2026-04-20T00:00:00.000Z'),
      ev('b3', 'repotting', '2026-03-15T00:00:00.000Z'),
    ];
    const rows = buildSpeciesSummaryRows(bonsai, events, t, '（未設定）');
    const kuromatsu = rows.find((r) => r[0] === '黒松')!;
    // 列: 樹種/保有数/最終水やり/最終剪定/最終植替え/最終施肥
    expect(kuromatsu[2]).toBe('2026-05-10'); // 最終水やり (b2 が最新)
    expect(kuromatsu[3]).toBe('2026-04-20'); // 最終剪定
    expect(kuromatsu[4]).toBe(''); // 最終植替え (黒松には無し)
    expect(kuromatsu[5]).toBe(''); // 最終施肥 無し
    const shinpaku = rows.find((r) => r[0] === '真柏')!;
    expect(shinpaku[4]).toBe('2026-03-15'); // 最終植替え
  });

  test('集計対象外 (map に無い bonsaiId) の event は無視', () => {
    const rows = buildSpeciesSummaryRows(
      [{ id: 'b1', speciesName: '黒松' }],
      [ev('zzz', 'watering', '2026-05-01T00:00:00.000Z')],
      t,
      '（未設定）',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0][2]).toBe(''); // 黒松に紐づく水やり無し
  });
});
