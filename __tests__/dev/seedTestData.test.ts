/**
 * SEED data payload integrity unit test (Sess38 PR-1、 Phase ι-2)。
 *
 * `src/dev/seedTestData.ts` の OTHER_EVENT_DEFS + wiring SEED の payload が
 * payloadValidator (新 schema、 Sess34 PR-Q-fix #799 拡張済) を pass することを assertion。
 *
 * 目的:
 * 1. 旧形式 (Sess16 PR-E 以前の日本語 enum / 旧 field 名) が再混入することを構造的に防止 (R-52 / R-54 連動)
 * 2. 新規 SEED event 追加時の silent bug (旧 enum で追加) を CI で検出
 *
 * @see src/features/event/payloadValidator.ts
 * @see src/dev/seedTestData.ts OTHER_EVENT_DEFS
 * @see issue #806 Phase ι-2 完遂、 Sess35 PR-5 (#807) Phase ι-1 影響範囲調査結果
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { OTHER_EVENT_DEFS } from '@/src/dev/seedTestData';
import { validateEventPayload } from '@/src/features/event/payloadValidator';

const SEED_SRC = readFileSync(resolve(__dirname, '../../src/dev/seedTestData.ts'), 'utf8');

describe('SEED data payload integrity (Sess38 PR-1、 Phase ι-2)', () => {
  describe('OTHER_EVENT_DEFS 全件 payloadValidator pass', () => {
    for (const def of OTHER_EVENT_DEFS) {
      const label = `${def.type} (bonsaiIdx=${def.bonsaiIdx}, daysAgo=${def.daysAgo})`;
      test(`${label} の payload が validator を pass`, () => {
        expect(() => {
          validateEventPayload(def.type, def.payload ?? {});
        }).not.toThrow();
      });
    }
  });

  describe('wiring SEED の payload が validator を pass (seedTestDataInternal line 641-642 整合)', () => {
    // wiring 専用ループ (line 644-661) で生成される payload を literal で再現
    // body_part は Sess38 PR-1 で日本語 → enum 化 ('幹' → 'miki' / '枝' → 'eda')
    const wiringSeeds = [
      { wire_size_mm: 2, body_part: 'miki', scheduled_unwire_at: '2026-06-06T00:00:00.000Z' },
      { wire_size_mm: 1, body_part: 'eda', scheduled_unwire_at: '2026-06-06T00:00:00.000Z' },
    ];
    for (const w of wiringSeeds) {
      test(`wiring (size=${w.wire_size_mm}mm, body=${w.body_part}) が validator を pass`, () => {
        expect(() => {
          validateEventPayload('wiring', w);
        }).not.toThrow();
      });
    }
  });

  // Sess44: clearAllData が events_fts (FTS5 手動同期索引) も掃除し孤児索引蓄積を防ぐ
  describe('clearAllData の events_fts 掃除 (Sess44 孤児索引防止)', () => {
    const FN = SEED_SRC.match(/export\s+async\s+function\s+clearAllData[\s\S]*?\n\}/);

    test('clearAllData が定義されている', () => {
      expect(FN).not.toBeNull();
    });

    test('events_fts を含む全テーブルを明示削除する', () => {
      expect(FN).not.toBeNull();
      if (FN) {
        for (const t of ['events_fts', 'events', 'bonsai_tags', 'photos', 'tags', 'bonsai']) {
          expect(FN[0]).toMatch(new RegExp(`DELETE FROM ${t}`));
        }
      }
    });
  });
});
