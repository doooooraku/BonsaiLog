/**
 * 設定 >「使い方」詳細 (#1179 / ADR-0058 pull 型ガイド)。
 *
 * 構成 = 説明 + 番号付き手順 (bodyKey 1 キー、\n 区切り) + 「この画面を開く」CTA
 * (読んで終わらせず実画面に着地させる)。本文の {placeholder} には実 UI ラベルを注入
 * (resolveHowtoBody、引用 drift 防止)。不正 topic param は一覧へ戻す。
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import { useColors } from '@/src/core/theme/useColors';
import { getHowtoTopic, resolveHowtoBody } from '@/src/features/howto/topics';

export default function HowtoTopicScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const params = useLocalSearchParams<{ topic?: string }>();
  const topic = getHowtoTopic(params.topic);

  // 不正 param は一覧へ戻す (render 中の navigation は不可のため effect で)
  useEffect(() => {
    if (topic === null) router.back();
  }, [topic, router]);

  if (topic === null) return null;

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.background }]}>
      <Stack.Screen options={{ title: t(topic.titleKey) }} />
      <ScrollView contentContainerStyle={styles.scroll} testID="e2e_howto_topic_screen">
        <ThemedText style={styles.body}>
          {resolveHowtoBody(t(topic.bodyKey), topic.bodyParams, t)}
        </ThemedText>

        {/* 読んで終わらせない: 実画面への着地 CTA */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('howtoOpenScreenCta')}
          style={[styles.jumpCta, { backgroundColor: c.tint }]}
          onPress={() => router.push(topic.jumpHref)}
          testID="e2e_howto_jump_cta"
        >
          <ThemedText style={[styles.jumpCtaLabel, { color: c.onTint }]}>
            {t('howtoOpenScreenCta')}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 24 },
  body: { fontSize: 15, lineHeight: 24 },
  jumpCta: {
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jumpCtaLabel: { fontSize: 16, fontWeight: '500' },
});
