/**
 * F-10 盆栽一覧 CSV 行ビルダー 単体テスト (Sess47 / ADR-0016 Amended)。
 * t は identity (キー名をそのまま返す) で列構成とローカライズ呼び出しを検証。
 */
import { buildBonsaiCsvRow, BONSAI_CSV_HEADER_KEYS } from '@/src/features/export/bonsaiCsvRow';
import type { Bonsai } from '@/src/db/schema';

const t = ((k: string) => k) as Parameters<typeof buildBonsaiCsvRow>[1];

function makeBonsai(overrides: Partial<Bonsai> & { speciesCommonName?: string | null } = {}) {
  return {
    id: 'b1',
    name: '黒松',
    speciesId: null,
    speciesCommonName: '黒松',
    acquiredAt: '2010-02-28T00:00:00.000Z',
    style: 'chokkan',
    potInfo: null,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as unknown as Bonsai & { speciesCommonName?: string | null };
}

describe('buildBonsaiCsvRow', () => {
  test('ヘッダ 7 列 / 行 7 列で一致', () => {
    expect(BONSAI_CSV_HEADER_KEYS).toHaveLength(7);
    expect(buildBonsaiCsvRow(makeBonsai(), t)).toHaveLength(7);
  });

  test('名前/樹種/樹形(標準=i18n)/入手日(日付のみ)/状態(現役)/ID', () => {
    const row = buildBonsaiCsvRow(makeBonsai(), t);
    expect(row[0]).toBe('黒松'); // 名前
    expect(row[1]).toBe('黒松'); // 樹種
    expect(row[2]).toBe('bonsaiStyle_chokkan'); // 樹形 (標準 → i18n key)
    expect(row[3]).toBe('2010-02-28'); // 入手日 (UTC ISO → 日付部分)
    expect(row[5]).toBe('csvBonsaiStatusActive'); // 状態 (現役)
    expect(row[6]).toBe('b1'); // 盆栽ID
  });

  test('カスタム樹形は生文字列 (i18n しない)', () => {
    const row = buildBonsaiCsvRow(makeBonsai({ style: '吹き流し風' }), t);
    expect(row[2]).toBe('吹き流し風');
  });

  test('archivedAt あり → 状態=アーカイブ', () => {
    const row = buildBonsaiCsvRow(makeBonsai({ archivedAt: '2026-04-01T00:00:00.000Z' }), t);
    expect(row[5]).toBe('csvBonsaiStatusArchived');
  });

  test('鉢: 構造化 JSON {widthCm,depthCm,material} を整形', () => {
    const row = buildBonsaiCsvRow(
      makeBonsai({ potInfo: JSON.stringify({ widthCm: 18, depthCm: 12, material: '釉薬' }) }),
      t,
    );
    expect(row[4]).toBe('18×12cm / 釉薬');
  });

  test('鉢: 旧 {description} 自由テキストも吸収', () => {
    const row = buildBonsaiCsvRow(
      makeBonsai({ potInfo: JSON.stringify({ description: '常滑鉢' }) }),
      t,
    );
    expect(row[4]).toBe('常滑鉢');
  });

  test('鉢 null / 入手日 null は空欄', () => {
    const row = buildBonsaiCsvRow(makeBonsai({ potInfo: null, acquiredAt: null }), t);
    expect(row[4]).toBe('');
    expect(row[3]).toBe('');
  });
});
