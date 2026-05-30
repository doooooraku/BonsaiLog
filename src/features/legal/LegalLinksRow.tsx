/**
 * LegalLinksRow (Sess57): 利用規約 / プライバシーポリシー 2 リンクを共通レンダ。
 *
 * 設定画面の「その他」section と Paywall の Fine Print 近傍で使用。
 * lang === 'ja' のときは GitHub Pages /ja/ 版へ、他言語は英版へ Linking で遷移。
 * Linking 失敗時は Alert で告知 (Apple Review 3.1.1 / Google Play Data Safety 整合)。
 *
 * 既存 testID (e2e_open_legal_terms / e2e_open_legal_privacy) を維持し、
 * 設定画面の Alert.alert ベース実装を本 component で置換える。
 */
import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import { BORDER_DEFAULT } from '@/src/core/theme/colors';
import { getLegalLinks, openExternalLink } from '@/src/services/legalService';

export function LegalLinksRow() {
  const { t, lang } = useTranslation();

  const handleOpen = React.useCallback(
    async (url: string) => {
      const ok = await openExternalLink(url);
      if (!ok) Alert.alert(t('error'));
    },
    [t],
  );

  const links = React.useMemo(() => getLegalLinks(lang), [lang]);

  return (
    <View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={t('settingsLegalTerms')}
        testID="e2e_open_legal_terms"
        style={styles.entry}
        onPress={() => {
          void handleOpen(links.termsUrl);
        }}
      >
        <View style={styles.rowInner}>
          <ThemedText type="defaultSemiBold">{t('settingsLegalTerms')}</ThemedText>
          <ThemedText style={styles.chevron}>›</ThemedText>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={t('settingsLegalPrivacy')}
        testID="e2e_open_legal_privacy"
        style={styles.entry}
        onPress={() => {
          void handleOpen(links.privacyUrl);
        }}
      >
        <View style={styles.rowInner}>
          <ThemedText type="defaultSemiBold">{t('settingsLegalPrivacy')}</ThemedText>
          <ThemedText style={styles.chevron}>›</ThemedText>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  entry: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
    gap: 6,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  chevron: { fontSize: 18, opacity: 0.5, lineHeight: 18 },
});
