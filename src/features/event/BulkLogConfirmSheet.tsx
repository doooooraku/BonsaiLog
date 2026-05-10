/**
 * 一括記録 BottomSheet (ADR-0020、Issue #343、mockup care-screens-v2.jsx BulkLogConfirmSheet 整合 simplified 版)。
 *
 * Phase 1 (本 PR): 共通 note のみ (個別除外 UI / 写真添付 / 種別固有 payload は別 Issue で対応)
 * 構造:
 * - BottomSheet (snap '78%')
 * - drag handle
 * - タイトル「{label}を{count}件にまとめて記録」+ サブ「同じ内容で各盆栽に保存します」
 * - selected chips (横スクロール、各 chip = サムネ + 名前)
 * - メモ (任意) textarea (BottomSheetTextInput、minHeight 100、multiline)
 * - Footer CTA「N件にまとめて記録」
 *
 * onSave 経由で親 (HomeScreen) に { note } を渡す → 親が bulkLogEvents 呼び出し。
 */
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_PRIMARY,
  BG_SURFACE,
  BORDER_DEFAULT,
  ON_BRAND,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import type { EventType } from '@/src/db/schema';
import { BonsaiPlaceholder, hashSeed } from '@/src/features/bonsai/BonsaiPlaceholder';

type Props = {
  visible: boolean;
  type: EventType;
  selectedBonsais: readonly { id: string; name: string }[];
  onClose: () => void;
  onSave: (input: { note: string | null }) => void;
};

export function BulkLogConfirmSheet({ visible, type, selectedBonsais, onClose, onSave }: Props) {
  const { t } = useTranslation();
  const c = useColors();
  const ref = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['78%'], []);
  const [note, setNote] = useState('');

  useEffect(() => {
    ref.current?.snapToIndex(visible ? 0 : -1);
  }, [visible]);

  // visible になるたび state 初期化
  useEffect(() => {
    if (visible) setNote('');
  }, [visible]);

  const workLabelKey = `eventType_${type}` as Parameters<typeof t>[0];
  const workLabel = t(workLabelKey);

  const handleSave = () => {
    const trimmed = note.trim();
    onSave({ note: trimmed.length > 0 ? trimmed : null });
  };

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      keyboardBehavior="interactive"
      onClose={onClose}
      backgroundStyle={styles.sheetBg}
    >
      <BottomSheetView style={styles.content} testID="e2e_bulk_log_confirm_sheet">
        <View style={styles.header}>
          <ThemedText style={styles.title}>
            {t('bulkLogConfirmTitle')
              .replace('{label}', workLabel)
              .replace('{count}', String(selectedBonsais.length))}
          </ThemedText>
          <ThemedText style={styles.sub}>{t('bulkLogConfirmSub')}</ThemedText>
        </View>

        <BottomSheetScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {selectedBonsais.map((b) => (
            <View key={b.id} style={styles.chip}>
              <BonsaiPlaceholder size={24} seed={hashSeed(b.id)} radius={12} />
              <ThemedText style={styles.chipText} numberOfLines={1}>
                {b.name}
              </ThemedText>
            </View>
          ))}
        </BottomSheetScrollView>

        <BottomSheetScrollView contentContainerStyle={styles.body}>
          <View>
            <ThemedText style={styles.fieldLabel}>{t('bulkLogConfirmNoteLabel')}</ThemedText>
            <BottomSheetTextInput
              style={[
                styles.noteInput,
                { backgroundColor: c.background, borderColor: c.border, color: c.text },
              ]}
              multiline
              numberOfLines={4}
              placeholder={t('bulkLogConfirmNotePlaceholder')}
              placeholderTextColor={TEXT_MUTED}
              value={note}
              onChangeText={setNote}
              testID="e2e_bulk_log_confirm_note_input"
            />
          </View>
        </BottomSheetScrollView>

        <View style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.background }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('bulkLogSaveCta').replace(
              '{count}',
              String(selectedBonsais.length),
            )}
            style={[styles.cta, { backgroundColor: c.tint }]}
            onPress={handleSave}
            testID="e2e_bulk_log_save_cta"
          >
            <ThemedText style={styles.ctaText}>
              {t('bulkLogSaveCta').replace('{count}', String(selectedBonsais.length))}
            </ThemedText>
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: BG_PRIMARY },
  content: { flex: 1 },
  header: { paddingTop: 8, paddingBottom: 8, alignItems: 'center', gap: 4 },
  title: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 20,
    color: TEXT_PRIMARY,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  sub: { fontSize: 12, color: TEXT_SECONDARY },
  chipsRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 10,
    borderRadius: 18,
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    maxWidth: 140,
  },
  chipText: { fontSize: 12, fontWeight: '500', color: TEXT_PRIMARY, flexShrink: 1 },
  body: { padding: 16, gap: 12 },
  fieldLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
    marginBottom: 6,
  },
  noteInput: {
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  footer: { padding: 16, paddingBottom: 22, borderTopWidth: 1 },
  cta: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontSize: 17, fontWeight: '500', color: ON_BRAND, letterSpacing: 0.6 },
});
