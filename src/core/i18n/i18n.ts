import { useMemo } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import baseEn, { type TranslationKey } from './locales/en';
import ja from './locales/ja';
import fr from './locales/fr';
import es from './locales/es';
import de from './locales/de';
import it from './locales/it';
import pt from './locales/pt';
import ru from './locales/ru';
import zhHans from './locales/zhHans';
import zhHant from './locales/zhHant';
import ko from './locales/ko';
import hi from './locales/hi';
import id from './locales/id';
import th from './locales/th';
import vi from './locales/vi';
import tr from './locales/tr';
import nl from './locales/nl';
import pl from './locales/pl';
import sv from './locales/sv';

import { type Lang, normalizeLangCode } from './langCode';
import { pseudoWrap } from './pseudoLoc';

const dictionaries = {
  en: baseEn,
  ja,
  fr,
  es,
  de,
  it,
  pt,
  ru,
  zhHans,
  zhHant,
  ko,
  hi,
  id,
  th,
  vi,
  tr,
  nl,
  pl,
  sv,
} satisfies Record<string, Partial<Record<TranslationKey, string>>>;

const detectInitialLang = (): Lang => {
  try {
    const locales = Localization.getLocales();
    const primary = locales?.[0];
    return normalizeLangCode(
      primary?.languageCode,
      primary?.languageTag,
      primary?.languageScriptCode,
      primary?.regionCode,
    );
  } catch {
    return 'en';
  }
};

type I18nState = {
  lang: Lang;
  pseudoMode: boolean;
  setLang: (lang: Lang) => void;
  setPseudoMode: (enabled: boolean) => void;
};

const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      lang: detectInitialLang(),
      pseudoMode: false,
      setLang: (lang) => set({ lang: normalizeLangCode(lang) }),
      setPseudoMode: (enabled) => set({ pseudoMode: __DEV__ ? enabled : false }),
    }),
    {
      name: 'app-i18n-lang',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const normalized = normalizeLangCode(state.lang);
        if (state.lang !== normalized) {
          state.setLang(normalized);
        }
        if (!__DEV__ && state.pseudoMode) {
          state.setPseudoMode(false);
        }
      },
    },
  ),
);

export function useTranslation() {
  const lang = useI18nStore((s) => s.lang);
  const setLang = useI18nStore((s) => s.setLang);
  const pseudoMode = useI18nStore((s) => s.pseudoMode);
  const dict = useMemo(() => ({ ...baseEn, ...dictionaries[lang] }), [lang]);
  const t = useMemo(
    () => (key: TranslationKey) => {
      const value = dict[key] ?? key;
      return __DEV__ && pseudoMode ? pseudoWrap(value) : value;
    },
    [dict, pseudoMode],
  );
  return { t, lang, setLang };
}

export function setLang(lang: Lang) {
  useI18nStore.getState().setLang(lang);
}

export function getLang(): Lang {
  return useI18nStore.getState().lang;
}

export function setPseudoMode(enabled: boolean) {
  useI18nStore.getState().setPseudoMode(enabled);
}

export function getPseudoMode(): boolean {
  return useI18nStore.getState().pseudoMode;
}

export function tAll() {
  const lang = useI18nStore.getState().lang;
  return { ...baseEn, ...dictionaries[lang] };
}

export function t(key: TranslationKey) {
  const lang = useI18nStore.getState().lang;
  const pseudoMode = useI18nStore.getState().pseudoMode;
  const value = dictionaries[lang][key] ?? baseEn[key] ?? key;
  return __DEV__ && pseudoMode ? pseudoWrap(value) : value;
}

export { type Lang, TranslationKey };
