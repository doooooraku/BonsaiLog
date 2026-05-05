/**
 * 探すタブ index (ADR-0020 Phase 6、本 PR は既存 app/search.tsx へ redirect)。
 *
 * Phase 6 で本実装、既存 app/search.tsx を廃止統合する予定。
 * 本 PR (Phase 1) では useFocusEffect で /search に router.replace。
 */
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import { useColors } from '@/src/core/theme/useColors';

export default function FindScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      router.replace('/search' as Href);
    }, [router]),
  );

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_find_screen"
    >
      <ThemedText style={styles.body}>{t('loading')}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  body: { textAlign: 'center', opacity: 0.5 },
});
