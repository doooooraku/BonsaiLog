/**
 * 記録タブ index (ADR-0025 案 X、 Sess8 PR-3)。
 *
 * **本画面は実質表示されません** = タブ tap は `app/(tabs)/_layout.tsx` の
 * `<Tabs.Screen listeners={{ tabPress }}>` で intercept されており、
 * `e.preventDefault()` で画面遷移を阻止 → 直接 bonsai-multi-select modal を起動。
 *
 * expo-router の規約上、 `<Tabs.Screen name="record">` に対応する route file が必須のため
 * 本ファイルは keep。 lazy render (React Navigation Bottom Tabs default) で
 * 画面 mount は発生しないが、 万一 fallback で表示されるケースに備えて最小 stub を提供。
 *
 * Fallback 動作: listener 未動作 (R-30 PoC 不合格時の retreat) で本画面が表示された場合、
 * 中央に「タブ tap で記録動線が起動します」 メッセージのみ表示 (FAB 等は無し)。
 * Subject to Revision: ADR-0025 §Subject to Revision で案 B (FAB) に revert 可能。
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColors } from '@/src/core/theme/useColors';

export default function RecordTabStubScreen() {
  const c = useColors();
  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_record_stub_fallback"
    >
      <View style={styles.body}>
        <ThemedText style={[styles.text, { color: c.textSecondary }]} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1 },
  text: { fontSize: 14, textAlign: 'center' },
});
