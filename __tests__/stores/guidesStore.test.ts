/**
 * guidesStore unit test (#1178 / ADR-0058)。
 *
 * AC: 各ガイド dismiss 後、アプリ再起動でも再表示されない (persist) — persist 設定と
 * markSeen / resetAll の状態遷移を検証する。
 */
import { GUIDE_IDS, useGuidesStore } from '@/src/stores/guidesStore';

beforeEach(() => {
  useGuidesStore.getState().resetAll();
});

describe('guidesStore (#1178)', () => {
  test('初期状態: 全ガイド未視聴', () => {
    expect(useGuidesStore.getState().seen).toEqual({});
  });

  test('markSeen で該当 ID のみ true、他は不変', () => {
    useGuidesStore.getState().markSeen('g2RecordCta');
    const { seen } = useGuidesStore.getState();
    expect(seen.g2RecordCta).toBe(true);
    expect(seen.g1RecordTabNudge).toBeUndefined();
  });

  test('resetAll で全消去 (#1179 使い方ページ「ガイドをもう一度見る」)', () => {
    for (const id of GUIDE_IDS) useGuidesStore.getState().markSeen(id);
    expect(Object.keys(useGuidesStore.getState().seen)).toHaveLength(GUIDE_IDS.length);
    useGuidesStore.getState().resetAll();
    expect(useGuidesStore.getState().seen).toEqual({});
  });

  test('persist 設定: AsyncStorage 永続 (key = bonsailog-guides)', () => {
    // persist middleware の存在確認 — options 名が変わると再起動後に seen が消え
    // 「毎回ガイドが出る」デグレになるため、key 名を契約としてテストする
    expect(useGuidesStore.persist.getOptions().name).toBe('bonsailog-guides');
  });
});
