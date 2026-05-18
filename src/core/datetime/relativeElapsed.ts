/**
 * 相対経過時間フォーマッター (Sess9 PR-7 で共有 util 化)。
 *
 * 元実装は `app/(tabs)/bonsai/index.tsx:51 formatElapsed()` の inline 関数。
 * タグ管理画面 (PR-7) で「最終使用日」 表示にも同ロジック必要となり、
 * 重複避けるため本 util に extract。
 *
 * 仕様:
 * - days = null → null (UI 側で「未使用」 等の fallback 表示)
 * - days = 0 → "今日"
 * - days < 7 → "{days} 日"
 * - days < 30 → "{weeks} 週間"
 * - days < 365 → "{months} ヶ月"
 * - days >= 365 → "{years} 年"
 *
 * i18n keys: elapsedToday / elapsedDays / elapsedWeeks / elapsedMonths / elapsedYears
 */
import type { TranslationKey } from '@/src/core/i18n/locales/en';

/**
 * t function 互換 type (i18n の TranslationKey 強型を満たす)。
 * `useTranslation().t` の実体 `(key: TranslationKey) => string` を直接受理。
 */
type TranslateFn = (key: TranslationKey) => string;

export function formatElapsedDays(days: number | null, t: TranslateFn): string | null {
  if (days == null) return null;
  if (days === 0) return t('elapsedToday');
  if (days < 7) return t('elapsedDays').replace('{days}', String(days));
  if (days < 30) return t('elapsedWeeks').replace('{weeks}', String(Math.floor(days / 7)));
  if (days < 365) return t('elapsedMonths').replace('{months}', String(Math.floor(days / 30)));
  return t('elapsedYears').replace('{years}', String(Math.floor(days / 365)));
}

/**
 * UTC ISO timestamp から「経過日数」 を返す純関数 (DST 影響なし、 UTC 同士で差分)。
 *
 * @param targetIsoUtc - 過去の UTC ISO timestamp (例: 「タグ最終使用日時」)
 * @param nowIsoUtc - 現在の UTC ISO timestamp (テスト用に注入可、 default = Date.now())
 * @returns 経過日数 (0 以上の整数)、 targetIsoUtc が未来なら 0
 */
export function elapsedDaysFromIsoUtc(targetIsoUtc: string, nowIsoUtc?: string): number {
  const targetMs = Date.parse(targetIsoUtc);
  const nowMs = nowIsoUtc ? Date.parse(nowIsoUtc) : Date.now();
  const diffMs = Math.max(0, nowMs - targetMs);
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}
