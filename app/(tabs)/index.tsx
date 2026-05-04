/**
 * Home 画面 (ADR-0019)。
 *
 * 役割:
 * - 盆栽 0 本: Empty State (タイトル + 説明 + 「+ 盆栽を登録」CTA → 盆栽タブ新規登録へ遷移)
 * - 盆栽 1 本以上: 起動時に盆栽タブへ自動遷移 (Home はスタブ状態)
 *
 * 既存維持:
 * - F-13 Pro バッジ (右上)
 * - F-15 屋外モードトグル (右上、Pro バッジ衝突回避)
 * - F-14 AdBanner (Free のみ、下部)
 *
 * Related: Issue #29 / ADR-0019 / ADR-0011 (記録のみ哲学、推奨機能ゼロ)
 */
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import { getAllActiveBonsai } from '@/src/db/bonsaiRepository';
import { AdBanner } from '@/src/features/ads/AdBanner';
import { OutdoorToggleButton } from '@/src/features/theme/OutdoorToggleButton';
import { useProStore } from '@/src/stores/proStore';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isPro = useProStore((s) => s.isPro);
  const [bonsaiCount, setBonsaiCount] = useState<number | null>(null);

  // ADR-0019 Decision §3: 盆栽 1 本以上時は起動時に盆栽タブへ自動遷移、
  // 0 本時のみ Empty State を表示。
  // 初回画面 focus 時のみリダイレクトし、ユーザーが Home タブを再度タップした場合は
  // Empty State or 何もせずタブ滞在を許容する (UX: 強制遷移は避ける)。
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void getAllActiveBonsai().then((list) => {
        if (cancelled) return;
        setBonsaiCount(list.length);
        if (list.length > 0 && bonsaiCount === null) {
          // 初回 focus かつ盆栽 1 本以上 → 盆栽タブへ
          router.replace('/(tabs)/bonsai' as Href);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [router, bonsaiCount]),
  );

  return (
    <ThemedView style={styles.container} testID="e2e_home_screen">
      <OutdoorToggleButton style={styles.outdoorPosition} testIdSuffix="home_outdoor_toggle" />

      {isPro && (
        <View
          style={styles.proBadge}
          accessibilityLabel={t('settingsAccountProActive')}
          testID="e2e_home_pro_badge"
        >
          <ThemedText style={styles.proBadgeText}>{t('proBadgeShort')}</ThemedText>
        </View>
      )}

      <View style={styles.content}>
        {bonsaiCount === 0 && (
          <View style={styles.empty} testID="e2e_home_empty_state">
            <ThemedText type="title" style={styles.emptyTitle}>
              {t('homeEmptyTitle')}
            </ThemedText>
            <ThemedText style={styles.emptyBody}>{t('homeEmptyBody')}</ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('homeEmptyCta')}
              style={styles.emptyCta}
              onPress={() => router.push('/(tabs)/bonsai/new' as Href)}
              testID="e2e_home_empty_cta"
            >
              <ThemedText style={styles.emptyCtaText}>+ {t('homeEmptyCta')}</ThemedText>
            </Pressable>
          </View>
        )}
      </View>

      <AdBanner />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  empty: {
    alignItems: 'center',
    gap: 16,
    maxWidth: 320,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 24,
  },
  emptyCta: {
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: 56,
    minWidth: 240,
    borderRadius: 12,
    backgroundColor: '#1F3A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaText: {
    color: '#F7F3E8',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  // ADR-0009 AC3-5: 小さな「Pro」バッジ
  proBadge: {
    position: 'absolute',
    top: 12,
    right: 16,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#2E7D32',
    zIndex: 10,
  },
  proBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  outdoorPosition: { right: 56 },
});
