/**
 * 言語選択 UI 共有モジュール (Phase 1.6-T6 / Issue #330 A3)。
 *
 * - onboarding 言語選択画面 (`app/onboarding/language.tsx`)
 * - 設定タブの言語切替画面 (`app/settings/language.tsx`)
 *
 * の両方で `LANGUAGE_OPTIONS` 配列 + `LanguageOption` 型を共有する。
 * 19 言語の追加 / 削除時に 1 箇所のみ修正で済むようにする。
 */
import type { Lang } from './langCode';

export type LanguageOption = {
  code: Lang;
  /** 母語表記 (各言語自身)。 */
  native: string;
  /** Latin 併記 (英字、シニアが OS UI 表記で区別できるよう)。 */
  latin: string;
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', native: 'English', latin: 'English' },
  { code: 'ja', native: '日本語', latin: 'Japanese' },
  { code: 'fr', native: 'Français', latin: 'French' },
  { code: 'es', native: 'Español', latin: 'Spanish' },
  { code: 'de', native: 'Deutsch', latin: 'German' },
  { code: 'it', native: 'Italiano', latin: 'Italian' },
  { code: 'pt', native: 'Português', latin: 'Portuguese' },
  { code: 'ru', native: 'Русский', latin: 'Russian' },
  { code: 'zhHans', native: '简体中文', latin: 'Chinese (Simplified)' },
  { code: 'zhHant', native: '繁體中文', latin: 'Chinese (Traditional)' },
  { code: 'ko', native: '한국어', latin: 'Korean' },
  { code: 'hi', native: 'हिन्दी', latin: 'Hindi' },
  { code: 'id', native: 'Bahasa Indonesia', latin: 'Indonesian' },
  { code: 'th', native: 'ไทย', latin: 'Thai' },
  { code: 'vi', native: 'Tiếng Việt', latin: 'Vietnamese' },
  { code: 'tr', native: 'Türkçe', latin: 'Turkish' },
  { code: 'nl', native: 'Nederlands', latin: 'Dutch' },
  { code: 'pl', native: 'Polski', latin: 'Polish' },
  { code: 'sv', native: 'Svenska', latin: 'Swedish' },
];

export function findLanguageOption(code: Lang): LanguageOption | undefined {
  return LANGUAGE_OPTIONS.find((o) => o.code === code);
}
