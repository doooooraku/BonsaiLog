/**
 * 設定画面の [DEV] テストデータ section (Phase 4 A3 で SettingsScreen god から抽出)。
 *
 * __DEV__ または EXPO_PUBLIC_SEED_FORCE=1 (preview-local-apk) でのみ呼出側が render する
 * (本番 build では枝刈り)。seed JA/EN・全削除・onboarding reset・pseudo-loc toggle・課金状態 ON/OFF。
 *
 * 振る舞いは SettingsScreen の元実装と完全同一 (純粋な抽出)。
 */
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getPseudoMode, setPseudoMode, useTranslation } from '@/src/core/i18n/i18n';
// Sess68 PR #C: BORDER_DEFAULT は inline c.border 化。
import { useColors } from '@/src/core/theme/useColors';
import { clearAllData, seedTestData, seedTestDataEn } from '@/src/dev/seedTestData';
import { SettingsSection } from '@/src/features/settings/SettingsSection';
import { useOnboardingStore } from '@/src/stores/onboardingStore';
import { useProStore } from '@/src/stores/proStore';

export function DevSettingsSection() {
  const { t } = useTranslation();
  const c = useColors();
  const entryThemed = { borderBottomColor: c.border };
  const router = useRouter();
  const isPro = useProStore((s) => s.isPro);
  // i18n を呼ぶが DEV 文言は固定日本語 (本番枝刈りのため翻訳しない、 元実装踏襲)。
  void t;

  return (
    <SettingsSection title="[DEV] テストデータ" titleType="subtitle">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="seed test data (Japanese)"
        testID="e2e_dev_seed_button"
        style={[styles.entry, entryThemed]}
        onPress={async () => {
          try {
            const result = await seedTestData();
            if (result.skipped === 'already_seeded') {
              Alert.alert(
                'テストデータ',
                `既に ${result.bonsaiCount} 件の盆栽があります。 先に「全データ削除」 してから再投入してください。`,
              );
            } else {
              Alert.alert(
                'テストデータ投入完了',
                `盆栽 ${result.bonsaiCount} 件 (+ アーカイブ ${result.archivedCount}) / 写真 ${result.photoCount} 枚 / 記録 ${result.eventCount} 件 (+ ゴミ箱 ${result.trashedCount})`,
              );
            }
          } catch (err) {
            Alert.alert('seed エラー', String(err));
          }
        }}
      >
        <ThemedText type="defaultSemiBold">テストデータを投入 (日本語)</ThemedText>
        <ThemedText style={styles.entryDesc}>
          盆栽 11 件 (active 10 + archived 1) + 写真 9 枚 + タグ 8 件 + 全 13 種 events 約 80+ 件
        </ThemedText>
      </Pressable>
      {/* Sess10 PR-2: 英語版テストデータ (Marcus persona / Western 名前 / 英語 dialog)。
          既存 Maestro flow は JA 名前依存のため、 EN 投入は demo / SS 撮影 / 英語 UX 確認用。 */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="seed test data (English)"
        testID="e2e_dev_seed_en_button"
        style={[styles.entry, entryThemed]}
        onPress={async () => {
          try {
            const result = await seedTestDataEn();
            if (result.skipped === 'already_seeded') {
              Alert.alert(
                'Test data',
                `${result.bonsaiCount} bonsai already exist. Please clear all data first.`,
              );
            } else {
              Alert.alert(
                'Test data inserted',
                `${result.bonsaiCount} bonsai (+ ${result.archivedCount} archived) / ${result.photoCount} photos / ${result.eventCount} records (+ ${result.trashedCount} trashed)`,
              );
            }
          } catch (err) {
            Alert.alert('Seed error', String(err));
          }
        }}
      >
        <ThemedText type="defaultSemiBold">Insert test data (English)</ThemedText>
        <ThemedText style={styles.entryDesc}>
          11 bonsai (10 active + 1 archived) + 9 photos + 8 tags + ~80 records (all 13 event types)
        </ThemedText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="clear all data"
        testID="e2e_dev_clear_button"
        style={[styles.entry, entryThemed]}
        onPress={() => {
          Alert.alert(
            '全データ削除',
            '盆栽 / 写真 / タグ / 記録をすべて削除します。樹種マスタ (50 種) は残ります。',
            [
              { text: 'キャンセル', style: 'cancel' },
              {
                text: '削除',
                style: 'destructive',
                onPress: () => {
                  void (async () => {
                    try {
                      await clearAllData();
                      Alert.alert('削除完了', '全データを削除しました。');
                    } catch (err) {
                      Alert.alert('削除エラー', String(err));
                    }
                  })();
                },
              },
            ],
          );
        }}
      >
        <ThemedText type="defaultSemiBold">全データ削除</ThemedText>
        <ThemedText style={styles.entryDesc}>
          盆栽 / 写真 / タグ / 記録をリセット (確認 Alert あり)
        </ThemedText>
      </Pressable>
      {/* Phase 1.5-T5: ui-diff onboarding-welcome flow 用 reset (__DEV__ 限定、本番では枝刈り)。 */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="reset onboarding"
        testID="e2e_dev_reset_onboarding"
        style={[styles.entry, entryThemed]}
        onPress={() => {
          useOnboardingStore.getState().resetTutorial();
          useOnboardingStore.getState().setCompleted(false);
          router.replace('/onboarding/welcome' as Href);
        }}
      >
        <ThemedText type="defaultSemiBold">Onboarding をリセット</ThemedText>
        <ThemedText style={styles.entryDesc}>
          onboarding.completed=false に戻して Welcome 画面を再表示 (ui-diff flow 用)
        </ThemedText>
      </Pressable>
      {/* Sess20 PR-0.5 (ADR-0033 D4): Pseudo-localization toggle (__DEV__ only)。
          全 string を [xx-{原文}-xx] で 2 倍長化、 UI 崩れ (overflow / 文字切れ) 事前検出。 */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="toggle pseudo-localization"
        testID="e2e_dev_pseudo_toggle"
        style={[styles.entry, entryThemed]}
        onPress={() => {
          const current = getPseudoMode();
          setPseudoMode(!current);
          Alert.alert(
            'Pseudo-loc',
            current
              ? 'OFF: 通常表示に戻りました'
              : 'ON: [xx-{原文}-xx] で 2 倍長化、 全画面で UI 崩れを確認',
          );
        }}
      >
        <ThemedText type="defaultSemiBold">Pseudo-loc toggle (UI 崩れ検出)</ThemedText>
        <ThemedText style={styles.entryDesc}>
          ADR-0033 D4: 全 string を [xx-{'{'}原文{'}'}-xx] で wrap、 button truncation / overflow
          事前検出
        </ThemedText>
      </Pressable>
      {/* 課金状態 ON/OFF 切替 (__DEV__ 限定、本番では枝刈り)。 */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="set pro state"
        testID="e2e_dev_set_pro"
        style={[styles.entry, entryThemed]}
        onPress={async () => {
          await useProStore.getState().devSetPro(true);
          Alert.alert('課金状態', 'Pro 状態にしました (広告非表示 / 写真無制限 / CSV 解放)');
        }}
      >
        <ThemedText type="defaultSemiBold">Pro 状態にする</ThemedText>
        <ThemedText style={styles.entryDesc}>
          課金済み (isPro=true) として扱う。現在: {isPro ? 'Pro' : '無料'}
        </ThemedText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="clear pro state"
        testID="e2e_dev_clear_pro"
        style={[styles.entry, entryThemed]}
        onPress={async () => {
          await useProStore.getState().devSetPro(false);
          Alert.alert('課金状態', '無料状態に戻しました');
        }}
      >
        <ThemedText type="defaultSemiBold">無料に戻す</ThemedText>
        <ThemedText style={styles.entryDesc}>
          未課金 (isPro=false) として扱う。現在: {isPro ? 'Pro' : '無料'}
        </ThemedText>
      </Pressable>
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  entry: {
    padding: 16,
    borderBottomWidth: 1,
    gap: 6,
  },
  entryDesc: { fontSize: 13, opacity: 0.7, lineHeight: 18 },
});
