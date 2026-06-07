/**
 * 設定タブからの言語切替画面 (Phase 1.6-T6 / Issue #330 A3)。
 *
 * onboarding 言語選択画面 (`app/onboarding/language.tsx`) と同じ 19 言語リストを
 * `src/core/i18n/languageOptions.ts` から共有取得。
 * 設定経由では「タップで setLang → router.back()」のシンプルな振る舞いのみ。
 */
import { Stack, useNavigation, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { setLang, useTranslation } from '@/src/core/i18n/i18n';
import type { Lang } from '@/src/core/i18n/langCode';
import { LANGUAGE_OPTIONS } from '@/src/core/i18n/languageOptions';
// Sess74: BRAND_GREEN / BRAND_GREEN_BG を scheme-aware (c.tint / c.tintSubtle) に移行
// (Sess70 PR-C2 #957 で onboarding/language.tsx は修正済、 settings/language.tsx は漏落 →
// dark mode で選択中行が cream bg + cream 文字 contrast 1.1:1 で判読不能 = 本 PR で解消、
// ADR-0015/0052 Sess69 PR-A Amendment 整合)。
import { useColors } from '@/src/core/theme/useColors';

export default function SettingsLanguageScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const c = useColors();

  // Sess74 PR-3 (ADR-0053 Amendment / E2): 言語切替直後の Stack header transient re-render 漏れ
  // を回避するため、 useNavigation().setOptions で動的更新 (lang dependency)。
  React.useEffect(() => {
    navigation.setOptions({ title: t('settingsLanguageRowLabel') });
  }, [navigation, t, lang]);

  const handlePick = React.useCallback(
    (code: Lang) => {
      setLang(code);
      router.back();
    },
    [router],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']} testID="e2e_settings_language_screen">
      <Stack.Screen options={{ title: t('settingsLanguageRowLabel') }} />
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {LANGUAGE_OPTIONS.map((opt) => {
          const selected = lang === opt.code;
          return (
            <Pressable
              key={opt.code}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={opt.native}
              testID={`e2e_settings_lang_${opt.code}`}
              style={[
                styles.row,
                { borderColor: c.border },
                selected && [
                  styles.rowSelected,
                  { borderColor: c.tint, backgroundColor: c.tintSubtle },
                ],
              ]}
              onPress={() => handlePick(opt.code)}
            >
              <View style={styles.rowMain}>
                <ThemedText type="defaultSemiBold" style={[styles.native, { color: c.text }]}>
                  {opt.native}
                </ThemedText>
                <ThemedText style={[styles.latin, { color: c.textSecondary }]}>
                  {opt.latin}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.radio,
                  { borderColor: c.border },
                  selected && { borderColor: c.tint },
                ]}
              >
                {selected && <View style={[styles.radioDot, { backgroundColor: c.tint }]} />}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { flex: 1 },
  listContent: { gap: 6, padding: 16 },
  // Sess66 PR6a: borderColor は inline c.border (dark cascade)。
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  // Sess74: borderColor / backgroundColor は inline c.tint / c.tintSubtle (scheme-aware)
  // (onboarding/language.tsx line 202 と同 pattern)。
  rowSelected: { borderWidth: 2 },
  rowMain: { flex: 1, gap: 2 },
  native: { fontSize: 16 },
  latin: { fontSize: 12, opacity: 0.6, fontStyle: 'italic' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sess74: radioSelected は inline 化のため StyleSheet entry 削除済。
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
