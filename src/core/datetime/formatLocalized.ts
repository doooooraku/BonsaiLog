/**
 * 多言語日付フォーマッター (Sess94 PR-B、 ADR-0030 Sess94 Notes Amended 候補)。
 *
 * 目的:
 *   - 「2026年6月10日(火)」 のような 文化整合 日付 + 曜日 表示を 19 言語で 自動切替
 *   - 既存 `format.ts` の `formatLocal` (= TZ 対応 ISO → local time) と 役割分担
 *
 * 仕様:
 *   - date-fns/locale 19 言語 named import で tree-shaking 最適化
 *   - date-fns format pattern 「PP (EEE)」 = localized long date + abbreviated weekday
 *     - ja: 「2026年6月10日 (火)」
 *     - en: 「Jun 10, 2026 (Tue)」
 *     - de: 「10. Juni 2026 (Di)」
 *     - fr: 「10 juin 2026 (mar.)」
 *     - 他 15 言語: date-fns/locale default で 各言語の文化整合
 *
 * 連携: src/core/i18n/i18n.ts `useTranslation().lang`
 *       src/components/form/InlineDateRow.tsx (= Sess94 PR-B 新規 caller)
 *       src/components/form/RecurrencePicker.tsx (= InlineDateRow 経由)
 *
 * 注意:
 *   - dateKey は 「YYYY-MM-DD」 形式の文字列。 `parseISO` で local Date 化。
 *   - dateKey 空文字 / parse 失敗時は 空文字 fallback (= caller の placeholder 制御)。
 */
import { format as dateFnsFormat, parseISO } from 'date-fns';
import {
  de,
  enUS,
  es,
  fr,
  hi,
  id,
  it,
  ja,
  ko,
  nl,
  pl,
  pt,
  ru,
  sv,
  th,
  tr,
  vi,
  zhCN,
  zhTW,
} from 'date-fns/locale';
import type { Locale } from 'date-fns/locale';

import type { Lang } from '@/src/core/i18n/langCode';

/** Lang (= app i18n 19 言語) → date-fns Locale mapping (Sess94 PR-B)。 */
const LANG_TO_LOCALE: Record<Lang, Locale> = {
  en: enUS,
  ja,
  fr,
  es,
  de,
  it,
  pt,
  ru,
  zhHans: zhCN,
  zhHant: zhTW,
  ko,
  hi,
  id,
  th,
  vi,
  tr,
  nl,
  pl,
  sv,
};

/**
 * dateKey (YYYY-MM-DD) を 言語ごとの「日付 + 曜日」 形式に整形 (= 年あり、 InlineDateRow 用)。
 *
 * @param dateKey - YYYY-MM-DD 形式の文字列。 空 / parse 失敗 = 空文字 fallback。
 * @param lang - app i18n lang (= 19 言語)。
 * @returns 言語別 format 文字列。 例: ja「2026年6月10日（火）」 / en「Jun 10, 2026 (Tue)」
 *
 * ja 特例 (Sess94 PR-B モック仕上げ): 全角括弧「（）」 で囲む (= ClaudeDesign モック整合、 日本語慣習)。
 * 他 18 言語は半角括弧。
 */
export function formatLocalizedDateWithWeekday(dateKey: string, lang: Lang): string {
  if (!dateKey) return '';
  try {
    const date = parseISO(dateKey);
    if (Number.isNaN(date.getTime())) return dateKey;
    const locale = LANG_TO_LOCALE[lang] ?? enUS;
    const datePart = dateFnsFormat(date, 'PP', { locale });
    const weekdayPart = dateFnsFormat(date, 'EEE', { locale });
    if (lang === 'ja') {
      return `${datePart}（${weekdayPart}）`;
    }
    return `${datePart} (${weekdayPart})`;
  } catch {
    return dateKey;
  }
}

/**
 * dateKey (YYYY-MM-DD) を 言語ごとの「短日付 + 曜日」 形式に整形 (= 年なし、 RulePreviewCard 次回行用)。
 *
 * @param dateKey - YYYY-MM-DD 形式の文字列。 空 / parse 失敗 = 空文字 fallback。
 * @param lang - app i18n lang (= 19 言語)。
 * @returns 言語別 short format 文字列。 例: ja「6月10日（火）」 / en「Jun 10 (Tue)」 / de「10. Juni (Di)」
 *
 * 設計判断 (Sess94 PR-B モック仕上げ):
 *   - 次回 = 開始日 ≈ 数ヶ月以内 で 年表記は冗長 (= 認知負荷↑)
 *   - 業界整合: Apple Calendar 通知 / Google Calendar list の「次予定」 表記は 年なし
 *   - ja 特例: 全角括弧 + 「M月d日」 (= 日本語慣習、 ClaudeDesign モック整合)
 *   - 他 18 言語: date-fns/locale で 各言語の文化整合 (= MMM d 系)
 */
export function formatLocalizedShortDateWithWeekday(dateKey: string, lang: Lang): string {
  if (!dateKey) return '';
  try {
    const date = parseISO(dateKey);
    if (Number.isNaN(date.getTime())) return dateKey;
    const locale = LANG_TO_LOCALE[lang] ?? enUS;
    const weekdayPart = dateFnsFormat(date, 'EEE', { locale });
    if (lang === 'ja') {
      const datePart = dateFnsFormat(date, 'M月d日', { locale });
      return `${datePart}（${weekdayPart}）`;
    }
    const datePart = dateFnsFormat(date, 'MMM d', { locale });
    return `${datePart} (${weekdayPart})`;
  } catch {
    return dateKey;
  }
}
