import { Linking } from 'react-native';
import Constants from 'expo-constants';

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

export function getLegalLinks(extra?: Record<string, unknown>): LegalLinks {
  const resolved = extra ?? (Constants.expoConfig ?? (Constants.manifest as any))?.extra ?? {};
  return {
    privacyUrl: resolveUrl(resolved['LEGAL_PRIVACY_URL'], 'https://example.com/privacy'),
    termsUrl: resolveUrl(resolved['LEGAL_TERMS_URL'], 'https://example.com/terms'),
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
