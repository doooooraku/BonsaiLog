/**
 * 一括記録 詳細 入力画面 (Phase G3a、 ADR-0024 / ADR-0025、 Sess17 PR-H2 で 14 種別 form 統合)。
 *
 * Query params:
 * - type: 単一 EventType (例: 'watering')
 *   - 旧 ?types=watering,fertilizing (Sess12 PR-G 複数作業) → Sess16 PR-B1 で廃止
 *
 * 選択盆栽は `usePickerStore.bulkContext.selectedBonsais` から取得。
 *
 * Sess17 PR-H2 (ADR-0029 D5): 14 種別固有 form を WorkLogTypeFormFields component で
 * 統合、 WorkLogConfirm (Single) と Bulk で完全 1:1 UI 整合 (design_system.md §16)。
 * 全選択盆栽に同じ payload を bulkLogEvents で適用 (user 真意「内容全部一緒で OK」)。
 *
 * Sess16 PR-B1: 単一 type に簡略化:
 * - 1 form 入力 + 全 bonsai に同じ内容で bulkLogEvents
 * - タブ式 UI + 複数 type loop 廃止 (user 真意「複数作業記録は不要」)
 * - 完了: router.replace('/(tabs)/record') で記録タブに直接戻る
 */
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LabeledDateRow } from '@/src/components/form/LabeledDateRow';
import { LabeledTextInput } from '@/src/components/form/LabeledTextInput';
import { PhotoField, type PhotoFieldItem } from '@/src/components/form/PhotoField';
import { useToastStore } from '@/src/components/Toast';
import { nowUtc } from '@/src/core/datetime';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
import {
  BG_PRIMARY,
  BG_SURFACE,
  BORDER_DEFAULT,
  ON_BRAND,
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
import { useSettingsStore } from '@/src/stores/settingsStore';

import {
  WorkLogTypeFormFields,
  buildWorkLogPayload,
  createWorkLogTypeFormInitialState,
  getWorkLogNotePlaceholderKey,
  type WorkLogTypeFormState,
} from './WorkLogTypeFormFields';

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
  // Sess16 PR-B2 → PR-H: 日付選択 default = 今日 (Repolog pattern 整合)、 maxToday=true で未来日防止
  // ADR-0008 §TZ 3 層防御: new Date() 引数なし禁止、 nowUtc() 経由
  const [occurredAtDate, setOccurredAtDate] = React.useState(() =>
    (nowUtc() as string).slice(0, 10),
  );
  // Sess16 PR-B2 → PR-H: 写真添付 (caption 削除、 BonsaiBasicForm PendingPhoto 整合)
  const [photos, setPhotos] = React.useState<readonly PhotoFieldItem[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Sess17 PR-H2: 14 種別 form state を Single と同 component で集約 (ADR-0029 D5 §16 1:1 整合)。
  const settingsPotUnit = useSettingsStore((s) => s.potUnit);
  const [formState, setFormState] = React.useState<WorkLogTypeFormState>(() =>
    createWorkLogTypeFormInitialState(settingsPotUnit),
  );

  if (selectedType == null) return null;

  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const bonsaiIds = selectedBonsais.map((b) => b.id);
    const trimmed = note.trim();
    // Sess16 PR-B2: occurredAtDate (YYYY-MM-DD) → ISO UTC、 未指定なら bulkLogEvents default
    const occurredAtUtc = occurredAtDate ? `${occurredAtDate}T00:00:00.000Z` : undefined;
    // Sess17 PR-H2 (ADR-0029 D5): 14 種別固有 payload を全盆栽に同じ内容で適用。
    // wiring 外し予定日は Bulk では UI 出さない方針なので buildWorkLogPayload では未設定
    // (formState.wireUnwireDate は default '' で payload にも含まれない)。
    const payload = buildWorkLogPayload(selectedType, formState);
    try {
      const result = await bulkLogEvents({
        bonsaiIds,
        type: selectedType,
        note: trimmed.length > 0 ? trimmed : null,
        ...(occurredAtUtc ? { occurredAtUtc } : {}),
        payload,
      });
      // Sess16 PR-B2 → PR-H: 全 bonsai に同じ photos 紐付け (caption 削除済、 BonsaiBasicForm pattern 整合)
      if (photos.length > 0 && result.created.length > 0) {
        for (const event of result.created) {
          for (const p of photos) {
            await addPhotoFromUri({
              bonsaiId: event.bonsaiId,
              sourceUri: p.uri,
              eventId: event.id,
            });
          }
        }
      }
      // Sess19 PR-5 (ADR-0031 D1): Toast 件数 hardcode '1' → bonsaiIds.length に修正
      // (副次 bug fix: 2 件選択しても「1 件の作業を記録しました」 と表示されていた)
      useToastStore
        .getState()
        .show(t('bulkLogDoneToast').replace('{count}', String(bonsaiIds.length)));
    } catch (error) {
      console.warn('[bulk-log] failed:', error);
    }
    // Sess12 PR-I: 通知 reschedule (planned → logged 状態変化、 当日通知更新)
    void triggerSummaryReschedule(t);
    // Sess19 PR-5 (ADR-0031 D1): 記録タブ stub に戻る → カレンダー画面に遷移、
    // 記録した日が選択状態 (Single と統一、 user 提案「作業記録カレンダー」 整合)
    const dateKey = occurredAtDate || (occurredAtUtc?.slice(0, 10) ?? '');
    router.replace(`/(tabs)/plan?selectedDateKey=${dateKey}`);
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
        {/* Sess16 PR-B2: 日付選択 (mockup 14 種別共通、 chips の後・form の前)。 */}
        <View style={styles.field}>
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
        </View>

        {/* Sess17 PR-H2 (ADR-0029 D5): 14 種別固有 form を WorkLogTypeFormFields で
            WorkLogConfirm (Single) と 1:1 同じ UI 表示。 */}
        <WorkLogTypeFormFields type={selectedType} state={formState} onChange={setFormState} />

        {/* Sess17 PR-H2: メモ入力 (atom 統一、 typography 整合)。
            Sess18 PR-10: placeholder を type-aware に (getWorkLogNotePlaceholderKey)。 */}
        <View style={styles.field}>
          <LabeledTextInput
            label={t('workLogNote')}
            optional
            optionalText={t('workLogOptional')}
            value={note}
            onChangeText={(v) => setNote(v.slice(0, 2000))}
            placeholder={t(getWorkLogNotePlaceholderKey(selectedType) as TranslationKey)}
            maxLength={2000}
            showCounter
            multiline
            testID="e2e_bulk_log_confirm_note_input"
          />
        </View>

        {/* Sess16 PR-B2: 写真添付 (mockup 14 種別共通、 最大 10 枚、 全 bonsai に同 photos 紐付け)。 */}
        <View style={styles.field}>
          <PhotoField
            label={t('workLogPhotoField')}
            optional
            optionalText={t('workLogOptional')}
            photos={photos}
            onChange={setPhotos}
            testID="e2e_bulk_log_photo_field"
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
    // Sess18 PR-11: design_system §4 (spacing 4/8/12/16) + §5 (borderRadius 16 カード相当) 整合。
    // user 要求「chips の枠を統一」 反映 (Sess17 SS 13-18 で観察された幅バラつき解消)。
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingLeft: 8, // 旧 4 → 8 (左右対称、 spacing token 整合)
    paddingRight: 12, // 旧 10 → 12 (spacing token 整合)
    borderRadius: 16, // 旧 18 → 16 (design_system §5 カード用途、 Q2 user 確認)
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    minWidth: 80, // 短い盆栽名 (例: 「松」) でも視覚的に揃う最低幅
    maxWidth: 140, // 長い名前は ellipsis (flexShrink: 1 + numberOfLines: 1 で吸収)
  },
  chipText: { fontSize: 12, fontWeight: '500', color: TEXT_PRIMARY, flexShrink: 1 },
  body: { padding: 16, gap: 12 },
  field: { marginBottom: 4 },
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
