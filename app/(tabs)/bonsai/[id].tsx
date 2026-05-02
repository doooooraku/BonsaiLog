import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import type { TranslationKey } from '@/src/core/i18n/locales/en';

import {
  archiveBonsai,
  getBonsaiWithSpecies,
  type BonsaiWithSpecies,
} from '@/src/db/bonsaiRepository';

/**
 * 盆栽詳細画面 (P2-01 PR-D)。
 * - 基本情報のみ (作業履歴は F-02、写真は F-08)
 * - アーカイブ操作 (Issue #14 AC4)
 */
export default function BonsaiDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useTranslation();
  const router = useRouter();
  const [item, setItem] = useState<BonsaiWithSpecies | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getBonsaiWithSpecies(id, lang);
      setItem(data);
    } finally {
      setLoading(false);
    }
  }, [id, lang]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const handleArchive = useCallback(() => {
    if (!item) return;
    Alert.alert(t('bonsaiArchiveConfirmTitle'), t('bonsaiArchiveConfirmDesc'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('bonsaiArchive'),
        style: 'destructive',
        onPress: async () => {
          await archiveBonsai(item.id);
          router.back();
        },
      },
    ]);
  }, [item, router, t]);

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{t('loading')}</ThemedText>
      </ThemedView>
    );
  }

  if (!item) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{t('errorLoadFailed')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title">{item.name}</ThemedText>

        {item.species && (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">{t('bonsaiFieldSpecies')}</ThemedText>
            <ThemedText>{item.species.commonName}</ThemedText>
            <ThemedText style={styles.sci}>{item.species.scientificName}</ThemedText>
          </View>
        )}

        {item.style && (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">{t('bonsaiFieldStyle')}</ThemedText>
            <ThemedText>{t(`bonsaiStyle_${item.style}` as TranslationKey)}</ThemedText>
          </View>
        )}

        {item.acquiredAt && (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">{t('bonsaiFieldAcquiredAt')}</ThemedText>
            <ThemedText>{formatDate(item.acquiredAt, lang)}</ThemedText>
          </View>
        )}

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">{t('bonsaiFieldUpdatedAt')}</ThemedText>
          <ThemedText>{formatDate(item.updatedAt, lang)}</ThemedText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('bonsaiArchive')}
          style={styles.archiveBtn}
          onPress={handleArchive}
        >
          <ThemedText style={styles.archiveText}>{t('bonsaiArchive')}</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

function formatDate(iso: string, locale: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(locale === 'ja' ? 'ja-JP' : locale);
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scrollContent: { padding: 16, gap: 16 },
  section: { gap: 4 },
  sci: { fontStyle: 'italic', opacity: 0.7, fontSize: 13 },
  archiveBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8B2E2E',
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  archiveText: { color: '#8B2E2E', fontSize: 15, fontWeight: '500' },
});
