/**
 * F-10 csvExport.ts 純関数テスト (Phase A、Issue #33 / ADR-0016)。
 */
import {
  CSV_BOM,
  escapeCsvField,
  eventsToCsvRows,
  eventsToCsvString,
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
