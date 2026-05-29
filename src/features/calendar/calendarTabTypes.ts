/**
 * カレンダータブ画面の共通型 (Phase 4 B1)。
 *
 * CalendarTabScreen (coordinator) / useCalendarData / 各サブ部品が共有するため、
 * 循環依存を避けて専用モジュールに置く。公開 API は CalendarTabScreen.tsx が re-export。
 */

export type CalendarTabMode = 'plan' | 'record';

export type CalendarTabScreenProps = {
  /** 'plan' = 予定タブ (FAB=schedule、 明日 default、 過去日 disabled) / 'record' = 記録タブ (FAB=log、 今日 default、 過去日有効) */
  mode: CalendarTabMode;
};
