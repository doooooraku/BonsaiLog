import { Linking } from 'react-native';

import { getAppExtra } from '@/src/core/appExtra';

export type LegalLinks = {
  privacyUrl: string;
  termsUrl: string;
};

const isHttpUrl = (value: string) => /^https?:\/\/\S+$/i.test(value);

function resolveUrl(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed || !isHttpUrl(trimmed)) return fallback;
  return trimmed;
}

// lang 別 URL 切替 (Sess57): docs/{privacy,terms}/ja/ に日本語版が存在するため、
// lang === 'ja' のときのみ末尾に 'ja/' を付与。他言語は英版にフォールバック。
// URL 末尾スラッシュを正規化してから suffix を付ける (重複/欠落 両対応)。
function applyLangSuffix(url: string, lang?: string): string {
  if (lang !== 'ja') return url;
  const normalized = url.endsWith('/') ? url : `${url}/`;
  return `${normalized}ja/`;
}

export function getLegalLinks(lang?: string, extra?: Record<string, unknown>): LegalLinks {
  const resolved = extra ?? getAppExtra();
  const privacy = resolveUrl(resolved['LEGAL_PRIVACY_URL'], 'https://example.com/privacy');
  const terms = resolveUrl(resolved['LEGAL_TERMS_URL'], 'https://example.com/terms');
  return {
    privacyUrl: applyLangSuffix(privacy, lang),
    termsUrl: applyLangSuffix(terms, lang),
  };
}

export async function openExternalLink(url: string): Promise<boolean> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
