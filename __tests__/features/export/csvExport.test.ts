/**
 * F-10 csvExport.ts 純関数テスト (Phase A、Issue #33 / ADR-0016)。
 */
import { CSV_BOM, cellsToCsvString, escapeCsvField } from '@/src/features/export/csvExport';

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

// bonsai_csv → bonsaiCsvRow.test.ts、events_csv → eventCsvRow.test.ts、
// species_csv (保有集計) → speciesSummary.test.ts に移管 (人間可読再設計、Sess47)。
