/**
 * F-10 csvExport.ts 純関数テスト (Phase A、Issue #33 / ADR-0016)。
 */
import {
  CSV_BOM,
  cellsToCsvString,
  escapeCsvField,
  speciesToCsvRows,
  speciesToCsvString,
  type SpeciesForCsv,
} from '@/src/features/export/csvExport';

describe('escapeCsvField', () => {
  test('null → empty string', () => {
    expect(escapeCsvField(null)).toBe('');
  });
  test('undefined → empty string', () => {
    expect(escapeCsvField(undefined)).toBe('');
  });
  test('plain text passes through', () => {
    expect(escapeCsvField('hello')).toBe('hello');
  });
  test('number → string', () => {
    expect(escapeCsvField(540)).toBe('540');
  });
  test('comma is quoted', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"');
  });
  test('newline is quoted', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });
  test('CR is quoted', () => {
    expect(escapeCsvField('line1\rline2')).toBe('"line1\rline2"');
  });
  test('double quote is escaped and quoted', () => {
    expect(escapeCsvField('he said "hi"')).toBe('"he said ""hi"""');
  });
});

describe('cellsToCsvString', () => {
  test('starts with UTF-8 BOM + CRLF + escapes cells', () => {
    const csv = cellsToCsvString([
      ['名前', 'メモ'],
      ['黒松', 'a,b'],
    ]);
    expect(csv.charAt(0)).toBe(CSV_BOM);
    const lines = csv.slice(CSV_BOM.length).split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('名前,メモ');
    expect(lines[1]).toBe('黒松,"a,b"');
  });

  test('null / number cells handled', () => {
    const csv = cellsToCsvString([['a', null, 3]]);
    expect(csv.slice(CSV_BOM.length)).toBe('a,,3');
  });
});

// bonsai_csv は bonsaiCsvRow.test.ts に移管 (人間可読再設計、Sess47)。

// ---------------------------------------------------------------------------
// Phase D-4: species_csv 8 列 (Issue #33 / ADR-0016 AC2)
// ---------------------------------------------------------------------------

function makeSpecies(overrides: Partial<SpeciesForCsv> = {}): SpeciesForCsv {
  return {
    id: 'sp1',
    scientificName: 'Pinus thunbergii',
    commonName: '黒松',
    family: 'Pinaceae',
    climateZoneMin: 5,
    climateZoneMax: 9,
    defaultTasks: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as unknown as SpeciesForCsv;
}

describe('speciesToCsvRows (Phase D-4, AC2 8 列)', () => {
  test('header の列順 = id / scientific_name / common_name / family / climate_zone_min / climate_zone_max / created_at / updated_at', () => {
    const rows = speciesToCsvRows([]);
    expect(rows[0]).toBe(
      'id,scientific_name,common_name,family,climate_zone_min,climate_zone_max,created_at,updated_at',
    );
  });

  test('空配列 → header のみ (1 行)', () => {
    const rows = speciesToCsvRows([]);
    expect(rows).toHaveLength(1);
  });

  test('1 件 → header + 1 行', () => {
    const rows = speciesToCsvRows([makeSpecies()]);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toContain('sp1,');
    expect(rows[1]).toContain('Pinus thunbergii,');
    expect(rows[1]).toContain('黒松,');
    expect(rows[1]).toContain('Pinaceae,');
    expect(rows[1]).toContain('5,9,');
  });

  test('null fields は空文字に変換', () => {
    const rows = speciesToCsvRows([
      makeSpecies({
        family: null,
        climateZoneMin: null,
        climateZoneMax: null,
        commonName: null,
      }),
    ]);
    expect(rows[1].split(',').length).toBe(8);
  });

  test('commonName が undefined → 空文字フォールバック', () => {
    const rows = speciesToCsvRows([makeSpecies({ commonName: undefined })]);
    const cols = rows[1].split(',');
    expect(cols[2]).toBe(''); // common_name 列
  });

  test('scientificName にカンマ含む場合 (理論上ありえないが) → quote escape', () => {
    const rows = speciesToCsvRows([makeSpecies({ scientificName: 'Pinus, thunbergii' })]);
    expect(rows[1]).toContain('"Pinus, thunbergii"');
  });

  test('複数件 → 件数分の行', () => {
    const rows = speciesToCsvRows([
      makeSpecies({ id: 'sp1' }),
      makeSpecies({ id: 'sp2' }),
      makeSpecies({ id: 'sp3' }),
    ]);
    expect(rows).toHaveLength(4); // header + 3
  });

  test('climate_zone は数値もそのまま文字列化', () => {
    const rows = speciesToCsvRows([makeSpecies({ climateZoneMin: 0, climateZoneMax: 13 })]);
    expect(rows[1]).toContain('0,13,');
  });
});

describe('speciesToCsvString', () => {
  test('UTF-8 BOM + CRLF 改行 + 8 列 header', () => {
    const csv = speciesToCsvString([makeSpecies()]);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    const body = csv.slice(CSV_BOM.length);
    const lines = body.split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0].split(',').length).toBe(8);
  });

  test('複数件 → 1 行ずつ CRLF 区切り', () => {
    const csv = speciesToCsvString([makeSpecies({ id: 'sp1' }), makeSpecies({ id: 'sp2' })]);
    const lines = csv.slice(CSV_BOM.length).split('\r\n');
    expect(lines).toHaveLength(3); // header + 2
  });

  test('空配列 → header のみ', () => {
    const csv = speciesToCsvString([]);
    const lines = csv.slice(CSV_BOM.length).split('\r\n');
    expect(lines).toHaveLength(1);
  });
});
