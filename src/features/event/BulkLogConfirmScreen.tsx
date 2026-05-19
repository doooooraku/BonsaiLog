/**
 * 一括記録 詳細 入力画面 (Phase G3a、 ADR-0024 / ADR-0025、 Sess12 PR-G 拡張)。
 *
 * Query params:
 * - types: カンマ区切り EventType (例: 'watering' or 'watering,fertilizing')
 *   - 旧 ?type=watering 単数 → 廃止 (BulkWorkPicker から ?types=... で push される)
 *
 * 選択盆栽は `usePickerStore.bulkContext.selectedBonsais` から取得。
 *
 * Sess12 PR-G 拡張:
 * - 単一 types (length=1): 従来通り 1 note 入力
 * - 複数 types (length>=2): タブ式 (上に作業タブ + 下に note input)、 作業ごと個別 note
 * - Save 時に bulkLogEvents loop で書き込み (各 type に対応する note を渡す)
 * - 完了: router.replace('/(tabs)/record') で記録タブに直接戻る (改善 I)
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
  BRAND_GREEN,
  ON_BRAND,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { bulkLogEvents } from '@/src/db/eventRepository';
import { EVENT_TYPES, type EventType } from '@/src/db/schema';
import { BonsaiPlaceholder, hashSeed } from '@/src/features/bonsai/BonsaiPlaceholder';
import { usePickerStore } from '@/src/stores/pickerStore';

function parseTypes(typesParam: string | undefined): EventType[] {
  if (!typesParam) return [];
  const validSet = new Set<EventType>(EVENT_TYPES);
  return typesParam
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is EventType => validSet.has(s as EventType));
}

export default function BulkLogConfirmScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const params = useLocalSearchParams<{ types?: string }>();
  const types = React.useMemo(() => parseTypes(params.types), [params.types]);
  const selectedBonsais = usePickerStore((s) => s.bulkContext?.selectedBonsais ?? []);

  // 作業ごとの note state (Sess12 PR-G: 複数作業時に個別 note 入力)
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  // 複数作業時の選択中タブ (default は最初の type)
  const [activeType, setActiveType] = React.useState<EventType | null>(types[0] ?? null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    // types 変化時に activeType を最初の type に
    if (types.length > 0 && (activeType == null || !types.includes(activeType))) {
      setActiveType(types[0]);
    }
  }, [types, activeType]);

  if (types.length === 0) return null;
  const isMulti = types.length >= 2;

  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const bonsaiIds = selectedBonsais.map((b) => b.id);
    try {
      await Promise.all(
        types.map((type) => {
          const trimmed = (notes[type] ?? '').trim();
          return bulkLogEvents({
            bonsaiIds,
            type,
            note: trimmed.length > 0 ? trimmed : null,
          });
        }),
      );
      useToastStore.getState().show(t('bulkLogDoneToast').replace('{count}', String(types.length)));
    } catch (error) {
      console.warn('[bulk-log] failed:', error);
    }
    // Sess12 PR-G 改善 I: 記録タブに直接戻る (dismissAll の 1 階問題回避)
    router.replace('/(tabs)/record');
  };

  const singleTypeLabel = isMulti ? '' : t(`eventType_${types[0]}` as TranslationKey);

  return (
    <View style={styles.container} testID="e2e_bulk_log_confirm_screen">
      <View style={styles.header}>
        <ThemedText style={styles.title}>
          {isMulti
            ? t('bulkLogConfirmTitleMulti').replace('{count}', String(types.length))
            : t('bulkLogConfirmTitle')
                .replace('{label}', singleTypeLabel)
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

      {/* Sess12 PR-G 改善 H: 複数作業時の作業タブ切替 */}
      {isMulti && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeTabRow}
        >
          {types.map((type) => {
            const active = activeType === type;
            return (
              <Pressable
                key={type}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.typeTab, active && styles.typeTabActive]}
                onPress={() => setActiveType(type)}
                testID={`e2e_bulk_log_confirm_tab_${type}`}
              >
                <ThemedText style={[styles.typeTabText, active && styles.typeTabTextActive]}>
                  {t(`eventType_${type}` as TranslationKey)}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

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
            value={activeType ? (notes[activeType] ?? '') : ''}
            onChangeText={(text) => {
              if (activeType) {
                setNotes((prev) => ({ ...prev, [activeType]: text }));
              }
            }}
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
          accessibilityState={{ disabled: isSubmitting }}
          disabled={isSubmitting}
          style={[styles.cta, { backgroundColor: c.tint }, isSubmitting && styles.ctaDisabled]}
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
  // Sess12 PR-G: 作業タブ row (複数作業時のみ表示)
  typeTabRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
  },
  typeTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: BG_SURFACE,
  },
  typeTabActive: {
    backgroundColor: BRAND_GREEN,
    borderColor: BRAND_GREEN,
  },
  typeTabText: { fontSize: 13, color: TEXT_PRIMARY },
  typeTabTextActive: { color: ON_BRAND, fontWeight: '600' },
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
  ctaDisabled: { opacity: 0.5 },
  ctaText: { fontSize: 17, fontWeight: '500', color: ON_BRAND, letterSpacing: 0.6 },
});
