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
import { Stack, router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  findNodeHandle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useKeyboardAvoidingProps } from '@/src/core/hooks/useKeyboardAvoidingProps';
import { FormScreenHeader } from '@/src/components/form/FormScreenHeader';
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
import {
  bulkConvertPlannedToRecorded,
  convertPlannedToRecorded,
  createEvent,
  findPlannedEventByCondition,
} from '@/src/db/eventRepository';
import { cancelForEvent } from '@/src/features/notification/cancelForEvent';
import { addPhotoFromUri } from '@/src/db/photoRepository';
import { EVENT_TYPES, type EventType } from '@/src/db/schema';
import { triggerSummaryReschedule } from '@/src/features/notification/triggerReschedule';
// Sess31 PR-1: BonsaiPlaceholder/hashSeed import 削除 (chip 内の灰色丸を撤去、 SelectedBonsaiChip に集約)
import { SelectedBonsaiChip } from '@/src/features/bonsai/SelectedBonsaiChip';
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
  // Sess28 PR-3 (ADR-0037 D1 / R-46): キーボード回避 props 共通 hook 適用 (KAV、 container 縮小)。
  const kavProps = useKeyboardAvoidingProps();
  // Sess32 PR-1 (R-46 v3): inputRef.measureLayout で ScrollView 内 input 位置を精密取得 + scrollTo。
  // 旧 Sess31 PR-2 の onLayout + memoY 方式は scrollTo の y が max scroll 値で頭打ちになり効果不全 →
  // measureLayout は IME 起動後の latest content layout を反映するため確実。
  const scrollRef = React.useRef<ScrollView>(null);
  const noteInputRef = React.useRef<TextInput>(null);
  const handleNoteFocus = React.useCallback(() => {
    // IME 起動アニメ完了 + KAV resize 完了待ち (Android: 約 350ms、 iOS: 約 250ms 想定で 350 採用)。
    setTimeout(() => {
      const scrollNode = findNodeHandle(scrollRef.current);
      if (scrollNode == null) return;
      // input の ScrollView 内座標 (x, y, w, h) を取得 → scrollTo({y: y - 80}) で input 上端を
      // 画面上から 80px 位置に配置 (header + 余白考慮)。 max scroll 制限はかかるが、 IME 起動後の
      // viewport で input が IME に隠れない位置に scroll される。
      noteInputRef.current?.measureLayout(
        scrollNode,
        (_x, y) => {
          scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
        },
        () => {
          // 失敗時 fallback (measureLayout の error callback)、 scrollToEnd で代替。
          scrollRef.current?.scrollToEnd({ animated: true });
        },
      );
    }, 350);
  }, []);
  const params = useLocalSearchParams<{ type?: string; fromPlannedIds?: string }>();
  const selectedType = React.useMemo(() => parseType(params.type), [params.type]);
  const fromPlannedIds = React.useMemo<string[]>(
    () => (params.fromPlannedIds ? params.fromPlannedIds.split(',').filter(Boolean) : []),
    [params.fromPlannedIds],
  );
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
    const noteValue = trimmed.length > 0 ? trimmed : null;
    let convertedCount = 0;
    let createdEvents: { id: string; bonsaiId: string }[] = [];
    try {
      if (fromPlannedIds.length > 0) {
        // ADR-0035 D7 場面 A: bulk 変換 (各 planned に atomic transaction、 sequential)
        // fromPlannedIds と bonsaiIds は PlanScreen handleBulkConvert で同 events から構築済 (順序一致)
        const inputs = fromPlannedIds.map((plannedId, i) => ({
          plannedEventId: plannedId,
          recordPayload: {
            bonsaiId: bonsaiIds[i] as string,
            type: selectedType,
            note: noteValue,
            payload,
            ...(occurredAtUtc ? { occurredAtUtc } : {}),
          },
        }));
        const result = await bulkConvertPlannedToRecorded(inputs);
        convertedCount = result.converted.length;
        createdEvents = result.converted.map((e) => ({ id: e.id, bonsaiId: e.bonsaiId }));
        // cancelForEvent 連動 (各 planned)
        for (const plannedId of fromPlannedIds) {
          await cancelForEvent(plannedId, t);
        }
      } else {
        // ADR-0035 D8 場面 B: 通常 FAB 経路、 各 bonsai 単位で findPlannedEventByCondition + auto-cancel
        const dateKey = (occurredAtDate || occurredAtUtc?.slice(0, 10) || '').slice(0, 10);
        for (const bid of bonsaiIds) {
          const matched = dateKey
            ? await findPlannedEventByCondition(dateKey, bid, selectedType)
            : null;
          if (matched) {
            const ev = await convertPlannedToRecorded({
              plannedEventId: matched.id,
              recordPayload: {
                bonsaiId: bid,
                type: selectedType,
                note: noteValue,
                payload,
                ...(occurredAtUtc ? { occurredAtUtc } : {}),
              },
            });
            await cancelForEvent(matched.id, t);
            createdEvents.push({ id: ev.id, bonsaiId: ev.bonsaiId });
            convertedCount++;
          } else {
            const ev = await createEvent({
              bonsaiId: bid,
              type: selectedType,
              status: 'logged',
              note: noteValue,
              payload,
              ...(occurredAtUtc ? { occurredAtUtc } : {}),
            });
            createdEvents.push({ id: ev.id, bonsaiId: ev.bonsaiId });
          }
        }
      }
      // Sess16 PR-B2 → PR-H: 全 bonsai に同じ photos 紐付け
      if (photos.length > 0 && createdEvents.length > 0) {
        for (const event of createdEvents) {
          for (const p of photos) {
            await addPhotoFromUri({
              bonsaiId: event.bonsaiId,
              sourceUri: p.uri,
              eventId: event.id,
            });
          }
        }
      }
      // Toast 文言分岐 (ADR-0035 D8 統一)
      if (convertedCount > 0) {
        useToastStore
          .getState()
          .show(t('planEventConvertedToast').replace('{count}', String(convertedCount)));
      } else {
        useToastStore
          .getState()
          .show(t('bulkLogDoneToast').replace('{count}', String(bonsaiIds.length)));
      }
    } catch (error) {
      console.warn('[bulk-log] failed:', error);
    }
    // Sess12 PR-I: 通知 reschedule (planned → logged 状態変化、 当日通知更新)
    void triggerSummaryReschedule(t);
    // Sess30 PR-2 (ADR-0038 D1 整合): 保存後の遷移先を **記録 tab** に変更。
    // 旧 `/(tabs)/plan` (Sess19 ADR-0031 D1 + Sess23 ADR-0035 D6 経由) は、 タブ名 ↔ FAB 動作
    // 整合性違反 (記録 tab FAB から起動 → 保存後 予定 tab 遷移 → タブハイライト不整合) のため修正。
    // BulkLogConfirmScreen は常に status='logged' を保存 → record tab に遷移が user 直感整合。
    const dateKey = occurredAtDate || (occurredAtUtc?.slice(0, 10) ?? '');
    router.replace(`/(tabs)/record?selectedDateKey=${dateKey}`);
  };

  const typeLabel = t(`eventType_${selectedType}` as TranslationKey);

  return (
    <View style={styles.container} testID="e2e_bulk_log_confirm_screen">
      {/* Sess33 PR-1 (ADR-0039 起票予定): Stack header 廃止 + FormScreenHeader sticky。
          タイトル + chips + フォームを全部 ScrollView 内に統合し、 IME 起動時にも
          画面全体スクロール (full-screen scroll) 可能に。 旧 sticky header (タイトル + chips)
          は ScrollView の **外** にあり IME 起動時に縦領域を圧迫していた問題を構造解消。 */}
      <Stack.Screen options={{ headerShown: false }} />
      <FormScreenHeader testID="e2e_bulk_log_form_header" />

      <KeyboardAvoidingView style={styles.flexOne} {...kavProps}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          {/* Sess33 PR-1: タイトル + サブタイトルを ScrollView 内 (旧 sticky header 廃止)。 */}
          <View style={styles.titleBlock}>
            <ThemedText style={styles.title}>
              {t('bulkLogConfirmTitle')
                .replace('{label}', typeLabel)
                .replace('{count}', String(selectedBonsais.length))}
            </ThemedText>
            <ThemedText style={styles.sub}>{t('bulkLogConfirmSub')}</ThemedText>
          </View>

          {/* Sess32 PR-2 (継続): horizontal ScrollView は親 flex に縦 stretch される default を
              `flexGrow:0` で抑制。 Sess33 PR-1 で本体 ScrollView 内に移動 (旧 sticky → scroll 一体)。
              ネスト構造 (外: vertical / 内: horizontal) は RN 標準 pattern、 ジェスチャ衝突なし。 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsRow}
          >
            {selectedBonsais.map((b) => (
              <SelectedBonsaiChip key={b.id} name={b.name} testID={`e2e_bulk_log_chip_${b.id}`} />
            ))}
          </ScrollView>

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
            Sess18 PR-10: placeholder を type-aware に (getWorkLogNotePlaceholderKey)。
            Sess31 PR-1 (R-46 拡張): onFocus で auto-scroll、 IME 起動時にメモ欄を可視範囲に。
            Sess32 PR-1 (R-46 v3): forwardRef + measureLayout で ScrollView 内 y 位置を精密取得、
            旧 onLayout + memoY 方式 (Sess31 PR-2) は max scroll 値で頭打ちになる事象を解消。 */}
          <View style={styles.field}>
            <LabeledTextInput
              ref={noteInputRef}
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
              onFocus={handleNoteFocus}
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
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_PRIMARY },
  flexOne: { flex: 1 },
  // Sess33 PR-1: 旧 `header` style (sticky 用、 paddingTop:8 + alignItems:center) は ScrollView
  // 内タイトルブロックに置換 → `titleBlock` に rename + paddingTop 拡張 (header 直下 spacing)。
  titleBlock: { paddingTop: 12, paddingBottom: 8, alignItems: 'center', gap: 4 },
  title: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 20,
    color: TEXT_PRIMARY,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  sub: { fontSize: 12, color: TEXT_SECONDARY },
  // Sess32 PR-2 + Sess33 PR-1: flexGrow:0 で縦 stretch 抑制 (継続)。
  // marginHorizontal: -16 で body padding (16) を相殺し chips を画面端まで届かせる。
  chipsScroll: {
    flexGrow: 0,
    marginHorizontal: -16,
  },
  chipsRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
  },
  // Sess31 PR-1: 旧 chip + chipText styles は SelectedBonsaiChip component に集約済、 物理削除。
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
