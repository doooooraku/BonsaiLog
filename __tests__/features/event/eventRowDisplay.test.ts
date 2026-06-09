/**
 * eventRowDisplay.isRecurring 派生値 unit test (Sess81 PR-7、 ADR-0056 D5)。
 *
 * 確認項目:
 * 1. ev.recurrenceRuleId = null → isRecurring = false
 * 2. ev.recurrenceRuleId = 'some-id' → isRecurring = true
 * 3. ev.recurrenceRuleId = undefined → isRecurring = false (== null で fallback)
 * 4. event type 別動作 (recurrenceRuleId 非依存、 type は影響なし)
 *
 * 参照: src/features/event/eventRowDisplay.ts (getEventRowDisplay 純関数)
 *        src/db/schema.ts (events.recurrence_rule_id nullable text 列)
 *        ADR-0056 D5 (EventRow に 🔁 アイコン、 WCAG 1.4.1 整合)
 */
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import type { Event } from '@/src/db/schema';
import { getEventRowDisplay } from '@/src/features/event/eventRowDisplay';

/** Helper: 最小限の Event 模擬 (実フィールドは Drizzle InferModel 由来、 test では Partial で OK) */
function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'test-event-id',
    bonsaiId: 'test-bonsai-id',
    type: 'watering',
    status: 'logged',
    occurredAtUtc: '2026-06-09T00:00:00.000Z',
    tzOffsetMinutesAtOccurred: 540,
    tzIanaAtOccurred: 'Asia/Tokyo',
    note: null,
    payloadJson: null,
    recurrenceRuleId: null,
    deletedAt: null,
    createdAt: '2026-06-09T00:00:00.000Z',
    updatedAt: '2026-06-09T00:00:00.000Z',
    ...overrides,
  } as Event;
}

/** Helper: t (i18n) stub (テストで翻訳結果は不要、 key そのまま返す) */
const t = (key: TranslationKey): string => key;

describe('eventRowDisplay.isRecurring (Sess81 PR-7、 ADR-0056 D5)', () => {
  test('case 1: recurrenceRuleId = null → isRecurring = false', () => {
    const ev = makeEvent({ recurrenceRuleId: null });
    const result = getEventRowDisplay(ev, [], 'ja', t);
    expect(result.isRecurring).toBe(false);
  });

  test('case 2: recurrenceRuleId = "some-rule-id" → isRecurring = true', () => {
    const ev = makeEvent({ recurrenceRuleId: 'rule-01HXY' });
    const result = getEventRowDisplay(ev, [], 'ja', t);
    expect(result.isRecurring).toBe(true);
  });

  test('case 3: recurrenceRuleId = undefined (旧 schema event) → isRecurring = false (== null fallback)', () => {
    // 旧 schema event = recurrenceRuleId 列がない or undefined
    // Sess78 PR-2 schemaV16 で 追加された nullable 列、 既存 event は undefined になり得る
    const ev = makeEvent({ recurrenceRuleId: undefined as unknown as null });
    const result = getEventRowDisplay(ev, [], 'ja', t);
    expect(result.isRecurring).toBe(false);
  });

  test('case 4: event type 別動作 = type に関わらず recurrenceRuleId のみで判定', () => {
    // watering / pruning / wiring / fertilizing 等 14 種別すべて、 recurrenceRuleId 非依存
    const types = ['watering', 'pruning', 'wiring', 'fertilizing'] as const;
    for (const type of types) {
      const evNonNull = makeEvent({ type, recurrenceRuleId: 'rule-id' });
      expect(getEventRowDisplay(evNonNull, [], 'ja', t).isRecurring).toBe(true);

      const evNull = makeEvent({ type, recurrenceRuleId: null });
      expect(getEventRowDisplay(evNull, [], 'ja', t).isRecurring).toBe(false);
    }
  });
});
