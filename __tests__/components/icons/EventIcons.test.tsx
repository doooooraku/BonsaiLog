/**
 * EventIcon exhaustive 走査 unit test (Sess34 ADR-0041 Phase θ PR-8b、 新 D10)。
 *
 * 確認項目:
 * 1. EVENT_TYPES 14 種別すべてで EventIcon が **non-null React element** を返す (default 到達禁止)
 * 2. 新規 EventType 追加時、 EventIcons.tsx の switch case 追加漏れがあればここで fail (silent miss 再発防止)
 * 3. LeafAidIcon が leaf_first_aid type で render される (Phase θ で新規追加)
 *
 * 旧 bug: Sess16 PR-E で leaf_first_aid type 追加時、 EventIcon switch case が同期漏れ
 *        → default null → 「葉の手当」 group / row の iconBox 空白 (Sess34 PR-7 実機検証で発覚)
 * 構造防止: 本 test が 14 種別 × non-null assertion で次回も silent miss を build-time に検出
 *
 * 参照:
 * - src/components/icons/EventIcons.tsx (EventIcon switch)
 * - src/db/schema.ts EVENT_TYPES (14 種別 SoT)
 * - docs/adr/ADR-0041-event-row-display-mode.md §Phase θ 改訂 D10
 */
import React from 'react';

import { EventIcon, LeafAidIcon } from '@/src/components/icons';
import { EVENT_TYPES, type EventType } from '@/src/db/schema';

describe('EventIcon — 14 種別 exhaustive 走査 (ADR-0041 Phase θ D10)', () => {
  test.each(EVENT_TYPES as readonly EventType[])(
    'type=%s で non-null React element を返す',
    (type) => {
      const element = EventIcon({ type });
      expect(element).not.toBeNull();
      expect(React.isValidElement(element)).toBe(true);
    },
  );

  test('EVENT_TYPES に 14 種別すべて含まれている (schema SoT 整合)', () => {
    // Sess16 までは 13 種別、 PR-E で leaf_first_aid 追加で 14 種別に拡張
    expect(EVENT_TYPES.length).toBe(14);
    expect(EVENT_TYPES).toContain('leaf_first_aid');
  });

  test('LeafAidIcon export がある (Phase θ PR-8b 新規追加)', () => {
    expect(LeafAidIcon).toBeDefined();
    expect(typeof LeafAidIcon).toBe('function');
  });

  test('LeafAidIcon が React element を生成する', () => {
    const element = LeafAidIcon({ size: 16 });
    expect(React.isValidElement(element)).toBe(true);
  });

  test('EventIcon(leaf_first_aid) は LeafAidIcon を返す (silent bug fix 検証)', () => {
    // React element の .type を直接 check (renderer 不要、 react-native-svg mock 回避)
    const element = EventIcon({ type: 'leaf_first_aid' }) as React.ReactElement;
    expect(element.type).toBe(LeafAidIcon);
  });
});
