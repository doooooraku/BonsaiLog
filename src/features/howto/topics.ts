/**
 * 設定 >「使い方」のトピック定義 (#1179 / ADR-0058 pull 型ガイド)。
 *
 * - 本文 ({bodyKey}) は番号付き手順を \n 区切りで持つ 1 キー (キー数 ×19 言語の抑制)
 * - bodyParams: 本文中の {placeholder} に実 UI ラベルキーの値を注入する
 *   (ボタン/タブ名の引用 drift を構造防止 — #1177 {cta} パターン)
 * - jumpHref は **param 不要 route のみ** (route param 契約の検収は PR #1181 レビュー教訓)
 */
import type { Href } from 'expo-router';

import type { TranslationKey } from '@/src/core/i18n/i18n';

export type HowtoTopicId =
  | 'registerBonsai'
  | 'logWork'
  | 'planCalendar'
  | 'recurring'
  | 'notifications'
  | 'backupExport';

export type HowtoTopic = {
  id: HowtoTopicId;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  /** 本文 {placeholder} → 実ラベルキー。 */
  bodyParams?: Readonly<Record<string, TranslationKey>>;
  /** 「この画面を開く」CTA の遷移先 (param 不要 route のみ)。 */
  jumpHref: Href;
  testID: string;
};

export const HOWTO_TOPICS: readonly HowtoTopic[] = [
  {
    id: 'registerBonsai',
    titleKey: 'howtoTopicRegisterBonsaiTitle',
    bodyKey: 'howtoTopicRegisterBonsaiBody',
    bodyParams: { tab: 'tabBonsai', cta: 'bonsaiCreateNew' },
    jumpHref: '/(tabs)/bonsai' as Href,
    testID: 'e2e_howto_topic_register_bonsai',
  },
  {
    id: 'logWork',
    titleKey: 'howtoTopicLogWorkTitle',
    bodyKey: 'howtoTopicLogWorkBody',
    bodyParams: { tab: 'tabRecord', cta: 'recordFabLabel' },
    jumpHref: '/(tabs)/record' as Href,
    testID: 'e2e_howto_topic_log_work',
  },
  {
    id: 'planCalendar',
    titleKey: 'howtoTopicPlanCalendarTitle',
    bodyKey: 'howtoTopicPlanCalendarBody',
    bodyParams: { tab: 'tabPlan', cta: 'planFabLabel' },
    jumpHref: '/(tabs)/plan' as Href,
    testID: 'e2e_howto_topic_plan_calendar',
  },
  {
    id: 'recurring',
    titleKey: 'howtoTopicRecurringTitle',
    bodyKey: 'howtoTopicRecurringBody',
    bodyParams: {
      tab: 'tabLookBack',
      hub: 'recurringHubCardTitle',
      add: 'recurringListCreateNewLabel',
    },
    jumpHref: '/recurring-rules' as Href,
    testID: 'e2e_howto_topic_recurring',
  },
  {
    id: 'notifications',
    titleKey: 'howtoTopicNotificationsTitle',
    bodyKey: 'howtoTopicNotificationsBody',
    jumpHref: '/settings' as Href,
    testID: 'e2e_howto_topic_notifications',
  },
  {
    id: 'backupExport',
    titleKey: 'howtoTopicBackupTitle',
    bodyKey: 'howtoTopicBackupBody',
    jumpHref: '/backup' as Href,
    testID: 'e2e_howto_topic_backup',
  },
] as const;

/** topic id → 定義 (不正 id は null)。 */
export function getHowtoTopic(id: string | undefined): HowtoTopic | null {
  return HOWTO_TOPICS.find((tp) => tp.id === id) ?? null;
}

/** 本文の {placeholder} を実ラベル値で置換する純関数。 */
export function resolveHowtoBody(
  body: string,
  bodyParams: HowtoTopic['bodyParams'],
  t: (key: TranslationKey) => string,
): string {
  if (!bodyParams) return body;
  return Object.entries(bodyParams).reduce(
    (acc, [name, key]) => acc.replaceAll(`{${name}}`, t(key)),
    body,
  );
}
