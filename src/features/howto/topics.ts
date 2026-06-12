/**
 * 設定 >「使い方」のトピック定義 (#1179 → #1203 再設計 / ADR-0058 pull 型ガイド)。
 *
 * #1203 (Sess102 user 提案): 静的な詳細ページを廃止し、トピック tap = **実画面に遷移 +
 * 対応するスポットライトを 1 回表示** (pendingGuide 経由、seen 済みでも表示) に全面切替。
 * 説明文とガイド文言の二重管理を構造的に排除する。
 *
 * - jumpHref は **param 不要 route のみ** (route param 契約の検収は PR #1181 レビュー教訓)
 * - guideId のうち g7-g10 は pull 専用 (自動発火しない — ADR-0058 原則 5)
 */
import type { Href } from 'expo-router';

import type { TranslationKey } from '@/src/core/i18n/i18n';
import type { GuideId } from '@/src/stores/guidesStore';

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
  /** 遷移先 (param 不要 route のみ)。 */
  jumpHref: Href;
  /** 遷移先で 1 回表示するガイド (pendingGuide 経由)。 */
  guideId: GuideId;
  testID: string;
};

export const HOWTO_TOPICS: readonly HowtoTopic[] = [
  {
    id: 'registerBonsai',
    titleKey: 'howtoTopicRegisterBonsaiTitle',
    jumpHref: '/(tabs)/bonsai' as Href,
    guideId: 'g7RegisterCta',
    testID: 'e2e_howto_topic_register_bonsai',
  },
  {
    id: 'logWork',
    titleKey: 'howtoTopicLogWorkTitle',
    jumpHref: '/(tabs)/record' as Href,
    guideId: 'g2RecordCta',
    testID: 'e2e_howto_topic_log_work',
  },
  {
    id: 'planCalendar',
    titleKey: 'howtoTopicPlanCalendarTitle',
    jumpHref: '/(tabs)/plan' as Href,
    guideId: 'g3PlanCta',
    testID: 'e2e_howto_topic_plan_calendar',
  },
  {
    id: 'recurring',
    titleKey: 'howtoTopicRecurringTitle',
    jumpHref: '/recurring-rules' as Href,
    guideId: 'g8RecurringCreate',
    testID: 'e2e_howto_topic_recurring',
  },
  {
    id: 'notifications',
    titleKey: 'howtoTopicNotificationsTitle',
    jumpHref: '/settings' as Href,
    guideId: 'g9NotificationSettings',
    testID: 'e2e_howto_topic_notifications',
  },
  {
    id: 'backupExport',
    titleKey: 'howtoTopicBackupTitle',
    jumpHref: '/backup' as Href,
    guideId: 'g10BackupExport',
    testID: 'e2e_howto_topic_backup',
  },
] as const;
