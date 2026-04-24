const SUPPORTED_LANGS = [
  'en',
  'ja',
  'fr',
  'es',
  'de',
  'it',
  'pt',
  'ru',
  'zhHans',
  'zhHant',
  'ko',
  'hi',
  'id',
  'th',
  'vi',
  'tr',
  'nl',
  'pl',
  'sv',
] as const;

export type Lang = (typeof SUPPORTED_LANGS)[number];

export function isSupportedLang(code?: string): code is Lang {
  if (!code) return false;
  return (SUPPORTED_LANGS as readonly string[]).includes(code);
}

export function normalizeLangCode(
  rawCode?: string | null,
  tag?: string | null,
  script?: string | null,
  region?: string | null,
): Lang {
  if (rawCode && isSupportedLang(rawCode)) return rawCode;

  const code = rawCode?.toLowerCase();
  const tagLower = tag?.toLowerCase();
  const regionUpper = region?.toUpperCase();

  if (code === 'zh' || tagLower?.startsWith('zh')) {
    const isHant =
      tagLower?.includes('hant') ||
      script === 'Hant' ||
      (regionUpper != null && ['TW', 'HK', 'MO'].includes(regionUpper));
    return isHant ? 'zhHant' : 'zhHans';
  }

  if (code && isSupportedLang(code)) return code;

  return 'en';
}
