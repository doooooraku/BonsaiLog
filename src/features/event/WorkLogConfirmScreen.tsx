/**
 * 作業記録 詳細 入力画面 (Phase G2 part 2、ADR-0024 Accepted、 Sess19 PR-4 で直接 await 化)。
 *
 * 旧 `WorkLogConfirmSheet.tsx` (`@gorhom/bottom-sheet` snap 78%) を画面化、
 * `(modals)/work-log-confirm` route で `presentation: 'formSheet'` 配下に配置。
 *
 * Sess17 PR-G1: 14 種別固有 form を WorkLogTypeFormFields component に切り出し、
 * WorkLogConfirm (Single) と BulkLogConfirm (Bulk) で 1:1 UI 整合 (ADR-0029 D5)。
 *
 * Sess19 PR-4 (ADR-0031 D1 + D3 + D4): handleSubmit を直接 await pattern に書換、
 * stale closure bug 撲滅 (bonsai-detail useFocusEffect 経由を排除)。 Sess30 PR-2 (ADR-0038 整合):
 * 保存後 `router.replace('/(tabs)/record?selectedDateKey=...')` で **記録 tab** に遷移、
 * 記録した日付が選択状態で開く (旧 `/(tabs)/plan` は Sess23 ADR-0035 D6 由来、 D6 撤回で修正)。
 *
 * Sess19-3 (user 真意「F-05 不要」): F-05「気遣い型」 popup logic 削除、 直接書込のみ。
 *
 * 種別別 form 入力 (14 種別すべて) + 日付 + 写真 + メモ (全種別共通) を入力して保存。
 *
 * Query params:
 * - bonsaiName: 表示用 (サブタイトル)
 * - bonsaiId: createEvent で必須 (Sess19 PR-4 で追加)
 * - type: 作業種別 (EventType、必須)
 */
import { Stack, router, useLocalSearchParams, type Href } from 'expo-router';
import React from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormScreenHeader } from '@/src/components/form/FormScreenHeader';
import { useKeyboardAvoidingProps } from '@/src/core/hooks/useKeyboardAvoidingProps';
import { LabeledDateRow } from '@/src/components/form/LabeledDateRow';
import { LabeledTextInput } from '@/src/components/form/LabeledTextInput';
import { PhotoField, type PhotoFieldItem } from '@/src/components/form/PhotoField';
import { useToastStore } from '@/src/components/Toast';
import { getTzOffsetMin, nowUtc } from '@/src/core/datetime';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
import {
  BG_PRIMARY,
  BORDER_DEFAULT,
  BRAND_GREEN,
  ON_BRAND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import {
  convertPlannedToRecorded,
  createEvent,
  findPlannedEventByCondition,
} from '@/src/db/eventRepository';
import { addPhotoFromUri } from '@/src/db/photoRepository';
import type { EventType } from '@/src/db/schema';
import { cancelForEvent } from '@/src/features/notification/cancelForEvent';
import { triggerSummaryReschedule } from '@/src/features/notification/triggerReschedule';
import { toLocalDateKey } from '@/src/features/watering/dateUtils';
import { useSettingsStore } from '@/src/stores/settingsStore';
import {
  WorkLogTypeFormFields,
  buildWorkLogPayload,
  createWorkLogTypeFormInitialState,
  getWorkLogNotePlaceholderKey,
  type WorkLogTypeFormState,
} from './WorkLogTypeFormFields';

export default function WorkLogConfirmScreen() {
  const { t } = useTranslation();
  // Sess28 PR-3 (ADR-0037 D1 / R-46): キーボード回避 props 共通 hook 適用 (KAV、 container 縮小)。
  const kavProps = useKeyboardAvoidingProps();
  // Sess31 PR-1 (R-46 拡張): ScrollView ref + メモ欄 onFocus → scrollToEnd で IME 起動時の可視性確保。
  const scrollRef = React.useRef<ScrollView>(null);
  const handleNoteFocus = React.useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
  }, []);
  const params = useLocalSearchParams<{
    bonsaiName?: string;
    bonsaiId?: string;
    type?: EventType;
    fromPlannedId?: string;
  }>();
  const bonsaiName = params.bonsaiName ?? '';
  const bonsaiId = params.bonsaiId ?? '';
  const selectedType = (params.type ?? null) as EventType | null;
  const fromPlannedId = params.fromPlannedId ?? null;

  const [note, setNote] = React.useState('');
  // Sess36 PR-7 (ADR-0042 関連 fix): TZ 安全な local 「今日」 (toLocalDateKey)。
  // 旧 `nowUtc().slice(0, 10)` は UTC 日付を返すため JST 早朝に「昨日」 default 化する
  // bug を修正 (ADR-0008 §TZ 3 層防御の正しい使い方 = `toLocalDateKey(utc, tzOffsetMin)`、
  // ADR-0008 Notes Amended PR-8 連動)。 Single 動線は現状 date URL param 受信なしのため
  // 常に local 「今日」 default (将来 bonsai-detail からの日付指定機能追加時に拡張可)。
  const [occurredAtDate, setOccurredAtDate] = React.useState(() =>
    toLocalDateKey(nowUtc() as string, getTzOffsetMin()),
  );
  // Sess16 PR-A3 → PR-H: 写真添付 (caption 削除、 BonsaiBasicForm PendingPhoto 整合)。
  const [photos, setPhotos] = React.useState<readonly PhotoFieldItem[]>([]);
  // Sess17 PR-G1: 14 種別 form state を WorkLogTypeFormState union に集約 (controlled component)。
  const settingsPotUnit = useSettingsStore((s) => s.potUnit);
  const [formState, setFormState] = React.useState<WorkLogTypeFormState>(() =>
    createWorkLogTypeFormInitialState(settingsPotUnit),
  );
  // Sess17 PR-G1: wiring 外し予定日は WorkLogTypeFormFields に含めず、 caller (本画面) で
  // LabeledDateRow を直接 render (Single 専用 / Bulk では別 UI、 ADR-0029 D5 §16-3 整合)。
  const [wireUnwireDate, setWireUnwireDate] = React.useState('');
  // Sess19 PR-4: 重複 tap 防止 (await 中の submit lock)。
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Sess19 PR-4 (ADR-0031 D3 + D4): 直接 await + router.replace でカレンダー遷移。
  // Sess23 PR-4-3 (ADR-0035 D7/D8): fromPlannedId 指定時 → atomic 変換、 通常 FAB 経路 → 同条件 planned auto-cancel。
  const persistAndNavigate = React.useCallback(
    async (payload: Record<string, unknown>, occurredAtUtc: string) => {
      if (!bonsaiId || !selectedType) return;
      try {
        let created;
        let convertedCount = 0;
        const noteText = note.trim().length > 0 ? note.trim() : undefined;
        if (fromPlannedId) {
          // ADR-0035 D7 場面 A: 予定→記録変換 (atomic transaction、 R-43 整合)
          created = await convertPlannedToRecorded({
            plannedEventId: fromPlannedId,
            recordPayload: {
              bonsaiId,
              type: selectedType,
              note: noteText,
              payload,
              occurredAtUtc,
            },
          });
          await cancelForEvent(fromPlannedId, t);
          convertedCount = 1;
        } else {
          // ADR-0035 D8 場面 B: 通常 FAB 経路、 同条件 planned 検索 → hit 時 atomic 変換
          const dateKey = (occurredAtDate || occurredAtUtc.slice(0, 10)).slice(0, 10);
          const matched = await findPlannedEventByCondition(dateKey, bonsaiId, selectedType);
          if (matched) {
            created = await convertPlannedToRecorded({
              plannedEventId: matched.id,
              recordPayload: {
                bonsaiId,
                type: selectedType,
                note: noteText,
                payload,
                occurredAtUtc,
              },
            });
            await cancelForEvent(matched.id, t);
            convertedCount = 1;
          } else {
            created = await createEvent({
              bonsaiId,
              type: selectedType,
              status: 'logged',
              note: noteText,
              payload,
              occurredAtUtc,
            });
          }
        }
        // 写真添付: created event の id に紐付け
        if (photos.length > 0) {
          for (const p of photos) {
            await addPhotoFromUri({
              bonsaiId,
              sourceUri: p.uri,
              eventId: created.id,
            });
          }
        }
        void triggerSummaryReschedule(t);
        // Toast 文言分岐 (ADR-0035 D8 統一): convertedCount > 0 で「予定 N 件を記録に変更」 / それ以外で「記録しました」
        if (convertedCount > 0) {
          useToastStore
            .getState()
            .show(t('planEventConvertedToast').replace('{count}', String(convertedCount)));
        } else {
          useToastStore.getState().show(t('workLogDoneToast'));
        }
        // Sess30 PR-2 (ADR-0038 D1 整合): 保存後の遷移先を **記録 tab** に変更。
        // WorkLogConfirmScreen は status='logged' を保存 (新規記録 or 予定→記録変換)
        // → record tab に遷移が user 直感整合 (旧 `/(tabs)/plan` は Sess23 ADR-0035 D6 由来、 D6 撤回で修正)。
        const dateKey = occurredAtDate || occurredAtUtc.slice(0, 10);
        router.replace(`/(tabs)/record?selectedDateKey=${dateKey}` as Href);
      } catch (err) {
        Alert.alert(t('error'), String(err));
        setIsSubmitting(false);
      }
    },
    [bonsaiId, selectedType, note, photos, occurredAtDate, fromPlannedId, t],
  );

  const handleSubmit = async () => {
    if (selectedType == null || !bonsaiId) return;
    if (isSubmitting) return;
    setIsSubmitting(true);

    const payload = buildWorkLogPayload(selectedType, formState);
    if (selectedType === 'wiring' && wireUnwireDate) {
      payload.scheduled_unwire_at = `${wireUnwireDate}T00:00:00.000Z`;
    }
    const occurredAtUtc = occurredAtDate ? `${occurredAtDate}T00:00:00.000Z` : (nowUtc() as string);

    // Sess19-3: F-05「気遣い型」 popup 削除 (user 真意「承知の上で行っているので不要」)。
    // 同日件数チェック + Alert.alert 3 ボタンの分岐をすべて撤廃、 直接書込。
    void persistAndNavigate(payload, occurredAtUtc);
  };

  if (selectedType == null) return null;
  const titleLabel = t(`eventType_${selectedType}` as TranslationKey);

  return (
    <View style={styles.container} testID="e2e_work_log_confirm_screen">
      {/* Sess33 PR-4 (ADR-0039 起票予定): Stack header 廃止 + FormScreenHeader sticky。
          タイトル + bonsaiName は既に ScrollView 内に統合済 → header (sticky) を消して
          full-screen scroll 化。 既存 scrollToEnd (R-46 v3 タイプ A) はそのまま維持。 */}
      <Stack.Screen options={{ headerShown: false }} />
      <FormScreenHeader testID="e2e_work_log_form_header" />

      <KeyboardAvoidingView style={styles.flexOne} {...kavProps}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <ThemedText style={styles.title}>
              {t('workLogTitle').replace('{type}', titleLabel)}
            </ThemedText>
            <ThemedText style={styles.subject}>{bonsaiName}</ThemedText>
          </View>

          {/* Sess16 PR-A2: 日付選択 (mockup 14 種別共通 field、 全 form の先頭に配置)。 */}
          <View style={styles.field}>
            <LabeledDateRow
              label={t('workLogDateField')}
              optional
              optionalText={t('workLogOptional')}
              value={occurredAtDate}
              onChangeText={setOccurredAtDate}
              placeholder={t('workLogDatePlaceholderToday')}
              maxToday
              testID="e2e_work_log_date"
              testIDClear="e2e_work_log_date_clear"
            />
          </View>

          {/* Sess17 PR-G1: 14 種別固有 form を WorkLogTypeFormFields に委譲 (controlled)。 */}
          <WorkLogTypeFormFields type={selectedType} state={formState} onChange={setFormState} />

          {/* wiring 外し予定日 (Single 専用 UI、 Bulk では出さない方針 ADR-0029 D5 §16-3)。 */}
          {selectedType === 'wiring' && (
            <View style={styles.field}>
              <LabeledDateRow
                label={t('workLogWireUnwireDate')}
                optional
                optionalText={t('workLogOptional')}
                value={wireUnwireDate}
                onChangeText={setWireUnwireDate}
                placeholder={t('workLogWireUnwireDatePlaceholder')}
                maxToday={false}
                testID="e2e_work_log_wire_unwire_date"
                testIDClear="e2e_work_log_wire_unwire_date_clear"
              />
            </View>
          )}

          {/* Sess17 PR-F3: メモ TextInput → LabeledTextInput atom 移行 (typography 統一)。
            Sess18 PR-10: placeholder を type-aware に (getWorkLogNotePlaceholderKey)。
            Sess31 PR-1 (R-46 拡張): onFocus で auto-scroll、 IME 起動時の可視性確保。 */}
          <View style={styles.field}>
            <LabeledTextInput
              label={t('workLogNote')}
              optional
              optionalText={t('workLogOptional')}
              value={note}
              onFocus={handleNoteFocus}
              onChangeText={(v) => setNote(v.slice(0, 2000))}
              placeholder={t(getWorkLogNotePlaceholderKey(selectedType) as TranslationKey)}
              maxLength={2000}
              showCounter
              multiline
              testID="e2e_work_log_note"
            />
          </View>

          {/* Sess16 PR-A3: 写真添付 (mockup 14 種別共通、 最大 10 枚)。 */}
          <View style={styles.field}>
            <PhotoField
              label={t('workLogPhotoField')}
              optional
              optionalText={t('workLogOptional')}
              photos={photos}
              onChange={setPhotos}
              testID="e2e_work_log_photo_field"
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('workLogSaveCta')}
            style={styles.saveBtn}
            onPress={handleSubmit}
            testID="e2e_work_log_save"
          >
            <ThemedText style={styles.saveText}>{t('workLogSaveCta')}</ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_PRIMARY },
  flexOne: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 96 },
  header: { paddingTop: 8, paddingBottom: 16, alignItems: 'center', gap: 4 },
  title: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 20,
    color: TEXT_PRIMARY,
    letterSpacing: 0.4,
  },
  subject: { fontSize: 13, color: TEXT_SECONDARY },
  field: { marginBottom: 18 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 34,
    backgroundColor: BG_PRIMARY,
    borderTopWidth: 1,
    borderTopColor: BORDER_DEFAULT,
  },
  saveBtn: {
    height: 56,
    borderRadius: 12,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: ON_BRAND, fontSize: 17, fontWeight: '500', letterSpacing: 0.4 },
});
