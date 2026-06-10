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
 * dateKey (YYYY-MM-DD) を 言語ごとの「日付 + 曜日」 形式に整形。
 *
 * @param dateKey - YYYY-MM-DD 形式の文字列。 空 / parse 失敗 = 空文字 fallback。
 * @param lang - app i18n lang (= 19 言語)。
 * @returns 言語別 format 文字列。 例: ja「2026年6月10日 (火)」 / en「Jun 10, 2026 (Tue)」
 */
export function formatLocalizedDateWithWeekday(dateKey: string, lang: Lang): string {
  if (!dateKey) return '';
  try {
    const date = parseISO(dateKey);
    if (Number.isNaN(date.getTime())) return dateKey;
    const locale = LANG_TO_LOCALE[lang] ?? enUS;
    const datePart = dateFnsFormat(date, 'PP', { locale });
    const weekdayPart = dateFnsFormat(date, 'EEE', { locale });
    return `${datePart} (${weekdayPart})`;
  } catch {
    return dateKey;
  }
}
