/**
 * F-10 作業履歴 CSV 行ビルダー 単体テスト (Sess47 / ADR-0016 Amended)。
 * t は identity (キー名をそのまま返す) で、ローカライズ呼び出しと列構成を検証する。
 */
import { buildEventCsvRow, EVENT_CSV_HEADER_KEYS } from '@/src/features/export/eventCsvRow';
import type { Event } from '@/src/db/schema';

// identity t: 翻訳キーをそのまま返し、ローカライズ呼び出しを検証可能にする
const t = ((k: string) => k) as Parameters<typeof buildEventCsvRow>[2];

function makeEvent(overrides: Partial<Event>): Event {
  return {
    id: 'e1',
    bonsaiId: 'b1',
    type: 'watering',
    status: 'logged',
    occurredAtUtc: '2026-05-01T03:00:00.000Z',
    tzOffsetMin: 540,
    tzIana: 'Asia/Tokyo',
    durationMin: null,
    payloadJson: null,
    note: null,
    deletedAt: null,
    createdAt: '2026-05-01T03:00:00.000Z',
    updatedAt: '2026-05-01T03:00:00.000Z',
    ...overrides,
  } as unknown as Event;
}

describe('buildEventCsvRow', () => {
  test('ヘッダは 9 列、行も 9 列で一致', () => {
    expect(EVENT_CSV_HEADER_KEYS).toHaveLength(9);
    expect(buildEventCsvRow(makeEvent({}), '黒松', t)).toHaveLength(9);
  });

  test('盆栽名/作業/状態/日時(ローカル)/メモ/ID 列', () => {
    const row = buildEventCsvRow(makeEvent({ note: 'メモA' }), '黒松', t);
    expect(row[0]).toBe('黒松'); // 盆栽名
    expect(row[1]).toBe('eventType_watering'); // 作業 (localized key)
    expect(row[2]).toBe('eventStatus_logged'); // 状態 (localized key)
    expect(row[3]).toBe('2026-05-01 12:00'); // 日時: UTC 03:00 + Asia/Tokyo(+9)
    expect(row[6]).toBe('メモA'); // メモ
    expect(row[7]).toBe('b1'); // 盆栽ID
    expect(row[8]).toBe('e1'); // 作業ID
  });

  test('剪定: 部位列(parts)と詳細列(量)に振り分け', () => {
    const e = makeEvent({
      type: 'pruning',
      payloadJson: JSON.stringify({ parts: ['eda', 'ha'], amount: 'some' }),
    });
    const row = buildEventCsvRow(e, '黒松', t);
    // 部位列 (index 4): parts ラベルが入る (非空)
    expect(row[4]!.length).toBeGreaterThan(0);
    // 詳細列 (index 5): 量の field ラベル workLogPruneAmount を含む
    expect(row[5]).toContain('workLogPruneAmount');
    // 部位列に量(workLogPruneAmount)は混ざらない
    expect(row[4]).not.toContain('workLogPruneAmount');
  });

  test('payload 無し (観察系/null) は部位・詳細が空欄', () => {
    const row = buildEventCsvRow(makeEvent({ payloadJson: null }), '黒松', t);
    expect(row[4]).toBe(''); // 部位
    // watering の amount 無しなら詳細も空
    expect(row[5]).toBe('');
  });

  test('tz 異常時は日付部分 fallback (例外を投げない)', () => {
    const row = buildEventCsvRow(makeEvent({ tzIana: 'Invalid/Zone' }), '黒松', t);
    expect(row[3]).toBe('2026-05-01 03:00');
  });
});
