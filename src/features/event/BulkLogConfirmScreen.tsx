/**
 * 一括記録 詳細 入力画面 (Phase G3a、ADR-0024 Accepted)。
 *
 * 旧 `BulkLogConfirmSheet.tsx` (`@gorhom/bottom-sheet` snap 78%) を画面化、
 * `(modals)/bulk-log-confirm` route で `presentation: 'formSheet'` 配下に配置。
 *
 * 共通 note のみ入力 (Phase 1 設計踏襲、個別除外 / 写真添付 / 種別固有 payload は別 Issue)。
 *
 * Query params:
 * - type: 作業種別 (EventType、必須)
 *
 * 選択盆栽は `usePickerStore.bulkContext.selectedBonsais` から取得。
 *
 * Sess12 PR-B+C で DB 書き込み配線 (旧 setBulkLogConfirmResult + router.back は consumer 0 件 dead code):
 * Save 時に bulkLogEvents 直接呼び出し → Toast → router.dismissAll で元タブに戻る。
 */
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useToastStore } from '@/src/components/Toast';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
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
import { bulkLogEvents } from '@/src/db/eventRepository';
import type { EventType } from '@/src/db/schema';
import { BonsaiPlaceholder, hashSeed } from '@/src/features/bonsai/BonsaiPlaceholder';
import { usePickerStore } from '@/src/stores/pickerStore';

export default function BulkLogConfirmScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const params = useLocalSearchParams<{ type?: EventType }>();
  const type = (params.type ?? null) as EventType | null;
  const selectedBonsais = usePickerStore((s) => s.bulkContext?.selectedBonsais ?? []);
  const [note, setNote] = React.useState('');

  if (type == null) return null;
  const workLabel = t(`eventType_${type}` as TranslationKey);

  const handleSave = async () => {
    if (type == null) return;
    const trimmed = note.trim();
    try {
      const result = await bulkLogEvents({
        bonsaiIds: selectedBonsais.map((b) => b.id),
        type,
        note: trimmed.length > 0 ? trimmed : null,
      });
      useToastStore
        .getState()
        .show(t('bulkLogDoneToast').replace('{count}', String(result.created.length)));
    } catch (error) {
      console.warn('[bulk-log] failed:', error);
    }
    // Sess12 PR-F revert: canDismiss loop は JS thread freeze (無限 loop 可能性) のため
    // dismissAll に戻す。 後続 PR で modal stack 構造再検討予定。
    router.dismissAll();
  };

  return (
    <View style={styles.container} testID="e2e_bulk_log_confirm_screen">
      <View style={styles.header}>
        <ThemedText style={styles.title}>
          {t('bulkLogConfirmTitle')
            .replace('{label}', workLabel)
            .replace('{count}', String(selectedBonsais.length))}
        </ThemedText>
        <ThemedText style={styles.sub}>{t('bulkLogConfirmSub')}</ThemedText>
      </View>

      <ScrollView
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
      </ScrollView>

      <ScrollView contentContainerStyle={styles.body}>
        <View>
          <ThemedText style={styles.fieldLabel}>{t('bulkLogConfirmNoteLabel')}</ThemedText>
          <TextInput
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
      </ScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_PRIMARY },
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
