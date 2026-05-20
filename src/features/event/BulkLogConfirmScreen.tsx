/**
 * 一括記録 詳細 入力画面 (Phase G3a、 ADR-0024 / ADR-0025、 Sess16 PR-B1 単一 type 化)。
 *
 * Query params:
 * - type: 単一 EventType (例: 'watering')
 *   - 旧 ?types=watering,fertilizing (Sess12 PR-G 複数作業) → Sess16 PR-B1 で廃止
 *
 * 選択盆栽は `usePickerStore.bulkContext.selectedBonsais` から取得。
 *
 * Sess16 PR-B1: 単一 type に簡略化:
 * - 1 note 入力 + 全 bonsai に同じ note で bulkLogEvents
 * - タブ式 UI + 複数 type loop 廃止 (user 真意「複数作業記録は不要」)
 * - 完了: router.replace('/(tabs)/record') で記録タブに直接戻る
 */
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LabeledDateRow } from '@/src/components/form/LabeledDateRow';
import { PhotoField, type PhotoFieldItem } from '@/src/components/form/PhotoField';
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
import { addPhotoFromUri } from '@/src/db/photoRepository';
import { EVENT_TYPES, type EventType } from '@/src/db/schema';
import { triggerSummaryReschedule } from '@/src/features/notification/triggerReschedule';
import { BonsaiPlaceholder, hashSeed } from '@/src/features/bonsai/BonsaiPlaceholder';
import { usePickerStore } from '@/src/stores/pickerStore';

function parseType(typeParam: string | undefined): EventType | null {
  if (!typeParam) return null;
  const trimmed = typeParam.trim();
  if ((EVENT_TYPES as readonly string[]).includes(trimmed)) return trimmed as EventType;
  return null;
}

export default function BulkLogConfirmScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const params = useLocalSearchParams<{ type?: string }>();
  const selectedType = React.useMemo(() => parseType(params.type), [params.type]);
  const selectedBonsais = usePickerStore((s) => s.bulkContext?.selectedBonsais ?? []);

  const [note, setNote] = React.useState('');
  // Sess16 PR-B2: 日付選択 (空 = 今日 default、 maxToday=true で未来日防止)
  const [occurredAtDate, setOccurredAtDate] = React.useState('');
  // Sess16 PR-B2: 写真添付 (form 内 仮 state、 保存時に caller が addPhotoFromUri loop で永続化)
  const [photos, setPhotos] = React.useState<readonly PhotoFieldItem[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (selectedType == null) return null;

  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const bonsaiIds = selectedBonsais.map((b) => b.id);
    const trimmed = note.trim();
    // Sess16 PR-B2: occurredAtDate (YYYY-MM-DD) → ISO UTC、 未指定なら bulkLogEvents default
    const occurredAtUtc = occurredAtDate ? `${occurredAtDate}T00:00:00.000Z` : undefined;
    try {
      const result = await bulkLogEvents({
        bonsaiIds,
        type: selectedType,
        note: trimmed.length > 0 ? trimmed : null,
        ...(occurredAtUtc ? { occurredAtUtc } : {}),
      });
      // Sess16 PR-B2: 全 bonsai に同じ photos 紐付け (各 created event の id に対して addPhotoFromUri loop)
      if (photos.length > 0 && result.created.length > 0) {
        for (const event of result.created) {
          for (const p of photos) {
            await addPhotoFromUri({
              bonsaiId: event.bonsaiId,
              sourceUri: p.uri,
              eventId: event.id,
              caption: p.caption.trim().length > 0 ? p.caption.trim() : null,
            });
          }
        }
      }
      useToastStore.getState().show(t('bulkLogDoneToast').replace('{count}', '1'));
    } catch (error) {
      console.warn('[bulk-log] failed:', error);
    }
    // Sess12 PR-I: 通知 reschedule (planned → logged 状態変化、 当日通知更新)
    void triggerSummaryReschedule(t);
    // Sess12 PR-G 改善 I: 記録タブに直接戻る (dismissAll の 1 階問題回避)
    router.replace('/(tabs)/record');
  };

  const typeLabel = t(`eventType_${selectedType}` as TranslationKey);

  return (
    <View style={styles.container} testID="e2e_bulk_log_confirm_screen">
      <View style={styles.header}>
        <ThemedText style={styles.title}>
          {t('bulkLogConfirmTitle')
            .replace('{label}', typeLabel)
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
        {/* Sess16 PR-B2: 日付選択 (mockup 14 種別共通、 chips の後・note の前)。 */}
        <LabeledDateRow
          label={t('workLogDateField')}
          optional
          optionalText={t('workLogOptional')}
          value={occurredAtDate}
          onChangeText={setOccurredAtDate}
          placeholder={t('workLogDatePlaceholderToday')}
          maxToday
          testID="e2e_bulk_log_date"
          testIDClear="e2e_bulk_log_date_clear"
        />
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
        {/* Sess16 PR-B2: 写真添付 (mockup 14 種別共通、 最大 10 枚、 全 bonsai に同 photos 紐付け)。 */}
        <PhotoField
          label={t('workLogPhotoField')}
          optional
          optionalText={t('workLogOptional')}
          photos={photos}
          onChange={setPhotos}
          testID="e2e_bulk_log_photo_field"
        />
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
