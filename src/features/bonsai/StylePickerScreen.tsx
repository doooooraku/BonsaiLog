/**
 * 樹形 (BonsaiStyle) ピッカー画面 (Phase G1、ADR-0024 Provisionally Accepted)。
 *
 * 旧 `StylePickerSheet.tsx` (`@gorhom/bottom-sheet` snap 60%) を画面化、
 * `(modals)/style-picker` route で `presentation: 'modal'` 配下に配置。
 *
 * Sess13 PR-F (2026-05-19): chip grid → 縦並び list 化 (mockup style-picker-01.png 整合)。
 * - 「一」 None option 削除 (mockup にない、 Q-9 a で user 確認済)
 * - 英語ルビ + 説明文は不要 (Q-2 a、 mockup にあるが user 不要判断)
 * - 「+ カスタム入力」 footer は PR-G で追加 (本 PR は UI 形式変更のみ)
 *
 * BONSAI_STYLES (10 種) を縦並び list 表示、選択時に `usePickerStore.setStylePickerResult` +
 * `router.back()` で caller に返却。
 */
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import { BORDER_DEFAULT, BRAND_GREEN, BRAND_GREEN_BG } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { BONSAI_STYLES, type BonsaiStyle } from '@/src/db/schema';
import { usePickerStore } from '@/src/stores/pickerStore';

export default function StylePickerScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const params = useLocalSearchParams<{ initial?: string }>();
  const initial = params.initial as BonsaiStyle | undefined;
  const [current, setCurrent] = useState<BonsaiStyle | null>(initial ?? null);

  const handleSelect = (s: BonsaiStyle) => {
    setCurrent(s);
    usePickerStore.getState().setStylePickerResult(s);
    router.back();
  };

  return (
    <View
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_style_picker_screen"
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {BONSAI_STYLES.map((s) => {
          const selected = s === current;
          const labelKey = `bonsaiStyle_${s}` as TranslationKey;
          return (
            <Pressable
              key={s}
              testID={`e2e_style_option_${s}`}
              accessibilityRole="button"
              accessibilityLabel={t(labelKey)}
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => handleSelect(s)}
            >
              <ThemedText style={selected ? styles.rowTextSelected : styles.rowText}>
                {t(labelKey)}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 32 },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_DEFAULT,
    minHeight: 56,
    justifyContent: 'center',
  },
  rowSelected: { backgroundColor: BRAND_GREEN_BG, borderBottomColor: BRAND_GREEN },
  rowText: { fontSize: 16 },
  rowTextSelected: { fontSize: 16, fontWeight: '600' },
});
