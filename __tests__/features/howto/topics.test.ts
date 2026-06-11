/**
 * 使い方トピック定義 unit test (#1179)。
 *
 * 確認項目:
 * 1. 6 トピック + id 一意
 * 2. getHowtoTopic の正常 / 不正 param
 * 3. resolveHowtoBody の placeholder 置換 (複数出現含む)
 * 4. **placeholder 整合**: 本文 (en/ja 実値) 中の {x} が bodyParams のキー集合と一致
 *    (params 追加漏れ / 余剰 param の drift を機械検出)
 */
import en from '@/src/core/i18n/locales/en';
import ja from '@/src/core/i18n/locales/ja';
import { getHowtoTopic, HOWTO_TOPICS, resolveHowtoBody } from '@/src/features/howto/topics';

describe('HOWTO_TOPICS 定義 (#1179)', () => {
  test('6 トピック + id 一意', () => {
    expect(HOWTO_TOPICS).toHaveLength(6);
    expect(new Set(HOWTO_TOPICS.map((tp) => tp.id)).size).toBe(6);
  });

  test('getHowtoTopic: 正常 id → 定義 / 不正・undefined → null', () => {
    expect(getHowtoTopic('logWork')?.titleKey).toBe('howtoTopicLogWorkTitle');
    expect(getHowtoTopic('unknown')).toBeNull();
    expect(getHowtoTopic(undefined)).toBeNull();
  });

  test('resolveHowtoBody: placeholder を実ラベル値で置換 (複数出現も全置換)', () => {
    const t = (key: string) => `<${key}>`;
    const out = resolveHowtoBody(
      'open {tab} then {cta}, again {tab}',
      { tab: 'tabRecord', cta: 'recordFabLabel' },
      t as never,
    );
    expect(out).toBe('open <tabRecord> then <recordFabLabel>, again <tabRecord>');
  });

  test('resolveHowtoBody: params なしは原文のまま', () => {
    expect(resolveHowtoBody('plain', undefined, ((k: string) => k) as never)).toBe('plain');
  });

  describe.each([
    ['en', en as Record<string, string>],
    ['ja', ja as Record<string, string>],
  ])('placeholder 整合 (%s)', (_label, dict) => {
    test.each(HOWTO_TOPICS.map((tp) => [tp.id, tp] as const))('%s', (_id, topic) => {
      const body = dict[topic.bodyKey];
      expect(body).toBeTruthy();
      const placeholders = new Set(
        Array.from((body as string).matchAll(/\{(\w+)\}/g)).map((m) => m[1]),
      );
      const params = new Set(Object.keys(topic.bodyParams ?? {}));
      expect(placeholders).toEqual(params);
    });
  });
});
