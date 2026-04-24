/**
 * i18n key completeness test.
 *
 * Ensures every locale file has all keys defined in en.ts.
 * Missing keys will fall back to English at runtime, but this test
 * catches unintentional omissions early.
 */

import baseEn from '../src/core/i18n/locales/en';
import de from '../src/core/i18n/locales/de';
import es from '../src/core/i18n/locales/es';
import fr from '../src/core/i18n/locales/fr';
import hi from '../src/core/i18n/locales/hi';
import id from '../src/core/i18n/locales/id';
import itLocale from '../src/core/i18n/locales/it';
import ja from '../src/core/i18n/locales/ja';
import ko from '../src/core/i18n/locales/ko';
import nl from '../src/core/i18n/locales/nl';
import pl from '../src/core/i18n/locales/pl';
import pt from '../src/core/i18n/locales/pt';
import ru from '../src/core/i18n/locales/ru';
import sv from '../src/core/i18n/locales/sv';
import th from '../src/core/i18n/locales/th';
import tr from '../src/core/i18n/locales/tr';
import vi from '../src/core/i18n/locales/vi';
import zhHans from '../src/core/i18n/locales/zhHans';
import zhHant from '../src/core/i18n/locales/zhHant';

const enKeys = Object.keys(baseEn).sort();

const locales: Record<string, Record<string, string>> = {
  de: de as Record<string, string>,
  es: es as Record<string, string>,
  fr: fr as Record<string, string>,
  hi: hi as Record<string, string>,
  id: id as Record<string, string>,
  it: itLocale as Record<string, string>,
  ja: ja as Record<string, string>,
  ko: ko as Record<string, string>,
  nl: nl as Record<string, string>,
  pl: pl as Record<string, string>,
  pt: pt as Record<string, string>,
  ru: ru as Record<string, string>,
  sv: sv as Record<string, string>,
  th: th as Record<string, string>,
  tr: tr as Record<string, string>,
  vi: vi as Record<string, string>,
  zhHans: zhHans as Record<string, string>,
  zhHant: zhHant as Record<string, string>,
};

describe('i18n key completeness', () => {
  it('should have 19 locales (en + 18 translations)', () => {
    expect(Object.keys(locales).length + 1).toBe(19);
  });

  for (const [lang, dict] of Object.entries(locales)) {
    it(`${lang} should have all keys from en.ts`, () => {
      const langKeys = Object.keys(dict).sort();
      const missing = enKeys.filter((k) => !langKeys.includes(k));
      expect(missing).toEqual([]);
    });
  }
});
