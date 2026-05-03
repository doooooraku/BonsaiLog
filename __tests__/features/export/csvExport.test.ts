/**
 * F-10 csvExport.ts 純関数テスト (Phase A、Issue #33 / ADR-0016)。
 */
import {
  CSV_BOM,
  bonsaiToCsvRows,
  bonsaiToCsvString,
  escapeCsvField,
  eventsToCsvRows,
  eventsToCsvString,
  speciesToCsvRows,
  speciesToCsvString,
  type BonsaiForCsv,
  type SpeciesForCsv,
} from '@/src/features/export/csvExport';
import type { Event } from '@/src/db/schema';

function makeEvent(overrides: Partial<Event>): Event {
  return {
    id: 'e1',
    bonsaiId: 'b1',
    type: 'watering',
    status: 'logged',
    occurredAtUtc: '2026-05-01T00:00:00.000Z',
    tzOffsetMin: 540,
    tzIana: 'Asia/Tokyo',
    durationMin: null,
    payloadJson: null,
    note: null,
    deletedAt: null,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  } as unknown as Event;
}

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

describe('eventsToCsvRows', () => {
  test('header only when no events', () => {
    const rows = eventsToCsvRows([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toBe(
      'id,bonsai_id,type,status,occurred_at_utc,tz_offset_min,tz_iana,duration_min,note,created_at,updated_at',
    );
  });

  test('single event row', () => {
    const rows = eventsToCsvRows([makeEvent({ note: 'test note' })]);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toBe(
      'e1,b1,watering,logged,2026-05-01T00:00:00.000Z,540,Asia/Tokyo,,test note,2026-05-01T00:00:00.000Z,2026-05-01T00:00:00.000Z',
    );
  });

  test('escapes commas in note', () => {
    const rows = eventsToCsvRows([makeEvent({ note: 'a,b,c' })]);
    expect(rows[1]).toContain('"a,b,c"');
  });

  test('escapes double quotes in note', () => {
    const rows = eventsToCsvRows([makeEvent({ note: '"important"' })]);
    expect(rows[1]).toContain('"""important"""');
  });
});

describe('eventsToCsvString', () => {
  test('starts with UTF-8 BOM', () => {
    const csv = eventsToCsvString([]);
    expect(csv.charAt(0)).toBe(CSV_BOM);
  });

  test('uses CRLF line endings', () => {
    const csv = eventsToCsvString([makeEvent({})]);
    expect(csv).toContain('\r\n');
  });

  test('header + 2 events with CRLF', () => {
    const csv = eventsToCsvString([makeEvent({ id: 'e1' }), makeEvent({ id: 'e2' })]);
    const lines = csv.slice(CSV_BOM.length).split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('e1,');
    expect(lines[2]).toContain('e2,');
  });
});

// ---------------------------------------------------------------------------
// Phase D-3: bonsai_csv 9 列 (Issue #33 / ADR-0016 AC2)
// ---------------------------------------------------------------------------

function makeBonsai(overrides: Partial<BonsaiForCsv> = {}): BonsaiForCsv {
  return {
    id: 'b1',
    name: '黒松',
    speciesId: null,
    speciesName: '黒松',
    acquiredAt: '2026-01-01T00:00:00.000Z',
    style: 'chokkan',
    potInfo: null,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as unknown as BonsaiForCsv;
}

describe('bonsaiToCsvRows (Phase D-3, AC2 9 列)', () => {
  test('header の列順 = id / name / species / acquired_at / style / pot_info / archived_at / created_at / updated_at', () => {
    const rows = bonsaiToCsvRows([]);
    expect(rows[0]).toBe(
      'id,name,species,acquired_at,style,pot_info,archived_at,created_at,updated_at',
    );
  });

  test('空配列 → header のみ (1 行)', () => {
    const rows = bonsaiToCsvRows([]);
    expect(rows).toHaveLength(1);
  });

  test('1 件 → header + 1 行', () => {
    const rows = bonsaiToCsvRows([makeBonsai()]);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toContain('b1,');
    expect(rows[1]).toContain('黒松,');
    expect(rows[1]).toContain('chokkan,');
  });

  test('null fields は空文字に変換', () => {
    const rows = bonsaiToCsvRows([
      makeBonsai({ acquiredAt: null, style: null, potInfo: null, archivedAt: null }),
    ]);
    // id, name, species, , , , , createdAt, updatedAt
    expect(rows[1].split(',').length).toBe(9);
  });

  test('speciesName が undefined → 空文字フォールバック', () => {
    const rows = bonsaiToCsvRows([makeBonsai({ speciesName: undefined })]);
    const cols = rows[1].split(',');
    expect(cols[2]).toBe(''); // species 列
  });

  test('カンマ含む name は quote escape', () => {
    const rows = bonsaiToCsvRows([makeBonsai({ name: '黒松, 太郎' })]);
    expect(rows[1]).toContain('"黒松, 太郎"');
  });

  test('archivedAt あり (アーカイブ済盆栽) → 値が出力される', () => {
    const rows = bonsaiToCsvRows([makeBonsai({ archivedAt: '2026-04-01T00:00:00.000Z' })]);
    expect(rows[1]).toContain('2026-04-01T00:00:00.000Z');
  });

  test('potInfo (JSON 文字列) → そのまま出力 + quote escape', () => {
    const json = '{"size":"medium","color":"brown"}';
    const rows = bonsaiToCsvRows([makeBonsai({ potInfo: json })]);
    // ダブルクォート含むので quote escape
    expect(rows[1]).toContain('"{""size"":""medium"",""color"":""brown""}"');
  });
});

describe('bonsaiToCsvString', () => {
  test('UTF-8 BOM + CRLF 改行 + 9 列 header', () => {
    const csv = bonsaiToCsvString([makeBonsai()]);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    const body = csv.slice(CSV_BOM.length);
    const lines = body.split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0].split(',').length).toBe(9);
  });

  test('複数件 → 1 行ずつ CRLF 区切り', () => {
    const csv = bonsaiToCsvString([
      makeBonsai({ id: 'b1' }),
      makeBonsai({ id: 'b2' }),
      makeBonsai({ id: 'b3' }),
    ]);
    const lines = csv.slice(CSV_BOM.length).split('\r\n');
    expect(lines).toHaveLength(4); // header + 3
  });

  test('空配列 → header のみ', () => {
    const csv = bonsaiToCsvString([]);
    const lines = csv.slice(CSV_BOM.length).split('\r\n');
    expect(lines).toHaveLength(1);
  });
});

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
