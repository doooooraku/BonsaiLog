/**
 * 記録タブ index (ADR-0025、 Sess7 PR-1 で新設 stub)。
 *
 * Phase 1b (本 PR、 Sess7 PR-1): TabBar 構造変更のみ、 タブ画面は stub (Empty State)
 * Phase 2 (Sess7 PR-2): タブ tap → 盆栽選択モード自動入り → SelectionToolbar 「一括記録」 → BulkWorkPickerSheet 起動経路
 *
 * 現状の動線:
 * - タブ tap で本画面 (stub) 表示
 * - 「Phase 2 で実装予定」 を明示
 * - 既存記録機能は 盆栽詳細 → FAB → WorkPicker から到達可
 */
import React from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import { useColors } from '@/src/core/theme/useColors';

export default function RecordTabScreen() {
  const { t } = useTranslation();
  const c = useColors();
  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_record_screen"
    >
      <ThemedText style={[styles.title, { color: c.text }]}>{t('tabRecord')}</ThemedText>
      <ThemedText style={[styles.desc, { color: c.textSecondary }]}>
        {t('recordTabStubDesc')}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 24,
    lineHeight: 32,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  desc: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
});
