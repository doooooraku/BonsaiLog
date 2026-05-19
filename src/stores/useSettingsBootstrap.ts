/**
 * Settings 起動時 bootstrap hook (Sess15 PR-KK)。
 *
 * 役割:
 * - useTranslation().lang から user の言語を取得
 * - lang-defaults.ts の getDefaultPotUnitForLang(lang) で言語別 default 単位を決定
 * - settingsStore.potUnit を初回起動時 / lang 変化時に lang-default で上書き
 *
 * 設計方針 (ADR-0026 案 α):
 * - 過去 user なし前提で破壊的変更 OK
 * - persist の version bump (1 → 2) で旧 potUnit (inch 等) を破棄済
 * - 起動時に必ず lang-default を適用する (user が明示的に変更するまで)
 *
 * 注意:
 * - user が settings 画面で potUnit を変更したら、 その値は次回起動時に lang-default で上書きされる
 *   現状の最小実装。 将来「user 明示変更 vs lang-default」 を区別する場合は別 flag 追加が必要。
 *
 * Related:
 * - `src/core/i18n/lang-defaults.ts` (LANG_DEFAULT_POT_UNIT)
 * - `src/stores/settingsStore.ts` (potUnit + setPotUnit)
 */
import { useEffect } from 'react';

import { getDefaultPotUnitForLang } from '@/src/core/i18n/lang-defaults';
import { useTranslation } from '@/src/core/i18n/i18n';
import { useSettingsStore } from '@/src/stores/settingsStore';

export function useSettingsBootstrap(): void {
  const { lang } = useTranslation();
  const setPotUnit = useSettingsStore((s) => s.setPotUnit);

  useEffect(() => {
    const langDefault = getDefaultPotUnitForLang(lang);
    setPotUnit(langDefault);
  }, [lang, setPotUnit]);
}
