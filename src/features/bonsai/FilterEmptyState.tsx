/**
 * Home filter 中で 0 件になった時の専用 empty state (Sess9 PR-1)。
 *
 * 新規ユーザー empty (HomeEmptyScreen `homeEmptyTitle`「最初の盆栽を追加しよう」) と
 * 区別するため別 component に分離。 user がフィルタ中であることを明示し、 「フィルタを解除」
 * CTA で ALL_FILTER_ID に戻す動線を提供する。
 *
 * 関連: ADR-0008 §Notes Amended 2026-05-18、 docs/mockups/v1.0/wireframes/02-Home.html
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import { ON_BRAND } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';

type Props = {
  tagName: string;
  onClearFilter: () => void;
};

export function FilterEmptyState({ tagName, onClearFilter }: Props) {
  const { t } = useTranslation();
  const c = useColors();

  return (
    <View style={styles.container} testID="e2e_bonsai_home_filter_empty">
      <View style={styles.content}>
        <ThemedText style={[styles.title, { color: c.text }]}>
          {t('homeTagFilterEmptyTitle').replace('{tag}', tagName)}
        </ThemedText>
        <ThemedText style={[styles.body, { color: c.textSecondary }]}>
          {t('homeTagFilterEmptyBody')}
        </ThemedText>
      </View>
      <View style={styles.ctaWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('searchTagFilterClear')}
          style={[styles.cta, { backgroundColor: c.tint }]}
          onPress={onClearFilter}
          testID="e2e_home_filter_empty_clear"
        >
          <ThemedText style={[styles.ctaText, { color: ON_BRAND }]}>
            {t('searchTagFilterClear')}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  title: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 20,
    lineHeight: 30,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  body: { fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 300 },
  ctaWrap: { paddingHorizontal: 16, paddingBottom: 24 },
  cta: {
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
});
