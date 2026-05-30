/**
 * legalService 純関数テスト (Sess57): lang 別 URL 切替 + URL 末尾正規化。
 */
/* eslint-disable import/first */

jest.mock('react-native', () => ({
  Linking: { canOpenURL: jest.fn(), openURL: jest.fn() },
}));

jest.mock('@/src/core/appExtra', () => ({
  getAppExtra: () => ({
    LEGAL_PRIVACY_URL: 'https://example.com/privacy/',
    LEGAL_TERMS_URL: 'https://example.com/terms/',
  }),
}));

import { getLegalLinks } from '@/src/services/legalService';

describe('getLegalLinks', () => {
  it('lang 省略時は extra の URL をそのまま返す (英版)', () => {
    const links = getLegalLinks();
    expect(links.privacyUrl).toBe('https://example.com/privacy/');
    expect(links.termsUrl).toBe('https://example.com/terms/');
  });

  it('lang === "ja" の時 末尾に ja/ を付与', () => {
    const links = getLegalLinks('ja');
    expect(links.privacyUrl).toBe('https://example.com/privacy/ja/');
    expect(links.termsUrl).toBe('https://example.com/terms/ja/');
  });

  it('lang === "en" などその他言語は英版にフォールバック', () => {
    const links = getLegalLinks('en');
    expect(links.privacyUrl).toBe('https://example.com/privacy/');
    expect(links.termsUrl).toBe('https://example.com/terms/');
  });

  it('lang === "fr" は英版フォールバック', () => {
    const links = getLegalLinks('fr');
    expect(links.privacyUrl).toBe('https://example.com/privacy/');
  });

  it('URL 末尾スラッシュなしの extra に対しても ja suffix が正しく動く', () => {
    const links = getLegalLinks('ja', {
      LEGAL_PRIVACY_URL: 'https://example.com/privacy',
      LEGAL_TERMS_URL: 'https://example.com/terms',
    });
    expect(links.privacyUrl).toBe('https://example.com/privacy/ja/');
    expect(links.termsUrl).toBe('https://example.com/terms/ja/');
  });

  it('extra に不正値が入っていればフォールバック URL を使う', () => {
    const links = getLegalLinks('en', { LEGAL_PRIVACY_URL: 'not-a-url', LEGAL_TERMS_URL: 123 });
    expect(links.privacyUrl).toMatch(/^https?:\/\//);
    expect(links.termsUrl).toMatch(/^https?:\/\//);
  });
});
