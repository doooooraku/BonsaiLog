/**
 * 使い方トピック定義 unit test (#1179 → #1203 再設計)。
 *
 * #1203: 詳細ページ廃止 → トピック tap = 実画面遷移 + pull ガイド。
 * 確認項目:
 * 1. 6 トピック + id 一意
 * 2. 各 topic の guideId が GUIDE_IDS に存在 (typo / 消し忘れの機械検出)
 * 3. jumpHref / testID が非空
 * 4. titleKey が en 辞書に実在
 */
import en from '@/src/core/i18n/locales/en';
import { HOWTO_TOPICS } from '@/src/features/howto/topics';
import { GUIDE_IDS } from '@/src/stores/guidesStore';

describe('HOWTO_TOPICS 定義 (#1203)', () => {
  test('6 トピック + id 一意', () => {
    expect(HOWTO_TOPICS).toHaveLength(6);
    expect(new Set(HOWTO_TOPICS.map((tp) => tp.id)).size).toBe(6);
  });

  test.each(HOWTO_TOPICS.map((tp) => [tp.id, tp] as const))(
    '%s: guideId が GUIDE_IDS に存在 + href/testID 非空',
    (_id, topic) => {
      expect(GUIDE_IDS).toContain(topic.guideId);
      expect(String(topic.jumpHref).length).toBeGreaterThan(0);
      expect(topic.testID.startsWith('e2e_howto_topic_')).toBe(true);
    },
  );

  test('titleKey が en 辞書に実在', () => {
    const dict = en as Record<string, string>;
    for (const tp of HOWTO_TOPICS) {
      expect(dict[tp.titleKey]).toBeTruthy();
    }
  });

  test('guideId の重複なし (1 ガイド = 1 トピック)', () => {
    expect(new Set(HOWTO_TOPICS.map((tp) => tp.guideId)).size).toBe(6);
  });
});
