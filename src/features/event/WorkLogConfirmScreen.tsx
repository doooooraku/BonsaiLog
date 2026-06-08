/**
 * 作業記録 詳細 入力画面 (ADR-0024 で native presentation `(modals)/work-log-confirm` に移行、
 * `presentation: 'formSheet'`。 Sess19 PR-4 で直接 await 化)。
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
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { FormScreenHeader } from '@/src/components/form/FormScreenHeader';
import { useKeyboardAvoidingProps } from '@/src/core/hooks/useKeyboardAvoidingProps';
import { useUnsavedChangesGuard } from '@/src/core/hooks/useUnsavedChangesGuard';
import { LabeledDateRow } from '@/src/components/form/LabeledDateRow';
import { LabeledTextInput } from '@/src/components/form/LabeledTextInput';
import { PhotoField, type PhotoFieldItem } from '@/src/components/form/PhotoField';
import { useToastStore } from '@/src/components/Toast';
import { getTzOffsetMin, nowUtc } from '@/src/core/datetime';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
// Sess68 PR #C: BORDER_DEFAULT / TEXT_PRIMARY / TEXT_SECONDARY は inline c.* 化。
// Sess70 PR-C3: BRAND_GREEN / ON_BRAND も scheme-aware (c.tint / c.onTint) に移行
// (ADR-0015/0052 Sess69 PR-A Amendment 整合)。
import { useColors } from '@/src/core/theme/useColors';
import {
  convertPlannedToRecorded,
  createEvent,
  findPlannedEventByCondition,
  getEventById,
  updateEvent,
} from '@/src/db/eventRepository';
import { getAllPhotosByEventId, FREE_PHOTO_LIMIT_PER_EVENT } from '@/src/db/photoRepository';
import { addPhotoFromUri, removePhotoById } from '@/src/features/photos/photoOrchestrator';
import type { EventType } from '@/src/db/schema';
import { cancelForEvent } from '@/src/features/notification/cancelForEvent';
import { triggerSummaryReschedule } from '@/src/features/notification/triggerReschedule';
import { useProGuard } from '@/src/features/pro/useProGuard';
import { toLocalDateKey } from '@/src/features/watering/dateUtils';
import { useSettingsStore } from '@/src/stores/settingsStore';
import {
  UNWIRE_PARTS,
  WorkLogTypeFormFields,
  buildWorkLogPayload,
  createWorkLogTypeFormInitialState,
  getWorkLogNotePlaceholderKey,
  type WorkLogTypeFormState,
} from './WorkLogTypeFormFields';
import { payloadToFormState } from './payloadToFormState';

export default function WorkLogConfirmScreen() {
  const { t } = useTranslation();
  // Sess65: container/footer の static BG_PRIMARY を c.background 動的化するため hook 追加。
  const c = useColors();
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
    /** wiring-list「外す」から渡す body_part 初期値 (Sess41 アプローチC プリセット) */
    initialBodyPart?: string;
    /** ADR-0055 Sess77: edit mode trigger (個別 row kebab → 「編集」 経由)。
     *  eventId が指定されたら既存 event を fetch して form を prefill、 保存時 updateEvent を呼ぶ。
     *  fromPlannedId とは排他 (両方指定は invariant 違反、 edit mode 優先)。 */
    eventId?: string;
  }>();
  const bonsaiName = params.bonsaiName ?? '';
  const bonsaiId = params.bonsaiId ?? '';
  const selectedType = (params.type ?? null) as EventType | null;
  const fromPlannedId = params.fromPlannedId ?? null;
  const editingEventId = params.eventId ?? null;
  // ADR-0055 Sess77 PR-3: 3 mode (new / convert / edit) を eventId / fromPlannedId で判別。
  // eventId が優先 (両方指定は invariant 違反、 dev assert は処理省略で production safe 化)。
  const mode: 'new' | 'convert' | 'edit' = editingEventId
    ? 'edit'
    : fromPlannedId
      ? 'convert'
      : 'new';

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
  // ADR-0049 Sess59 PR3: 作業記録写真 ③ Free 上限 3 ガード (PhotoField に props で注入)
  const photoGuard = useProGuard({ feature: 'photo_worklog', currentCount: photos.length });
  const showPhotoLimitPaywall = React.useCallback(() => {
    Alert.alert(
      t('photoLimitTitle'),
      t('photoLimitDesc').replace('{count}', String(FREE_PHOTO_LIMIT_PER_EVENT)),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('proCtaUpgrade'), onPress: photoGuard.openPaywall },
      ],
    );
  }, [t, photoGuard.openPaywall]);
  // Sess17 PR-G1: 14 種別 form state を WorkLogTypeFormState union に集約 (controlled component)。
  const settingsPotUnit = useSettingsStore((s) => s.potUnit);
  const [formState, setFormState] = React.useState<WorkLogTypeFormState>(() => {
    const initial = createWorkLogTypeFormInitialState(settingsPotUnit);
    // wiring-list「外す」から initialBodyPart が渡された場合、unwireParts を事前選択 (Sess41)。
    // UNWIRE_PARTS 検証により不正値は無視。initialFormStateRef もこの値を捕捉するため
    // form を開いただけでは isDirty にならない (未保存ガード誤発火防止)。
    if (
      selectedType === 'unwiring' &&
      params.initialBodyPart &&
      (UNWIRE_PARTS as readonly string[]).includes(params.initialBodyPart)
    ) {
      initial.unwireParts = params.initialBodyPart as (typeof UNWIRE_PARTS)[number];
    }
    return initial;
  });
  // Sess17 PR-G1: wiring 外し予定日は WorkLogTypeFormFields に含めず、 caller (本画面) で
  // LabeledDateRow を直接 render (Single 専用 / Bulk では別 UI、 ADR-0029 D5 §16-3 整合)。
  const [wireUnwireDate, setWireUnwireDate] = React.useState('');
  // Sess19 PR-4: 重複 tap 防止 (await 中の submit lock)。
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Sess39 PR-2 (issue #822): 未保存 changes 確認 dialog。
  // mount 時の initial state を useRef で固定 → form state と diff 比較で isDirty 算出。
  // navigation back 試行時に dialog 表示、 「破棄」 で navigation 完遂、 「編集を続ける」 で残留。
  // ADR-0055 Sess77 PR-3: edit mode では prefill 完了後に initial refs を fetched 値で同期更新
  // (isDirty 誤発火防止)、 prefill 中の二重 fetch は prefilledRef flag で防止。
  const initialNoteRef = React.useRef(note);
  const initialOccurredAtDateRef = React.useRef(occurredAtDate);
  const initialFormStateRef = React.useRef(formState);
  const initialWireUnwireDateRef = React.useRef(wireUnwireDate);
  // ADR-0055 Sess77 PR-4: 編集モードの写真差分計算用 (削除集合 = initial − current の id-set 差分)。
  const initialPhotosRef = React.useRef<readonly PhotoFieldItem[]>(photos);
  const prefilledRef = React.useRef(false);

  // ADR-0055 Sess77 PR-3: edit mode の prefill effect。
  // getEventById + getAllPhotosByEventId で fetch、 payloadToFormState で逆変換、 state + initial refs 同期更新。
  React.useEffect(() => {
    if (mode !== 'edit' || prefilledRef.current || !editingEventId || !selectedType) return;
    void (async () => {
      try {
        const ev = await getEventById(editingEventId);
        if (!ev) return;
        // ev.type は Drizzle $inferSelect で string、 EVENT_TYPES CHECK 制約で 14 種別 enforced。
        // payloadToFormState は不正 type で safeParse fail → base default 返却で defensive。
        const fs = payloadToFormState(ev.type as EventType, ev.payloadJson, settingsPotUnit);
        const occurred = ev.occurredAtUtc.slice(0, 10);
        const noteVal = ev.note ?? '';
        // wiring の scheduled_unwire_at は payloadToFormState で fs.wireUnwireDate に
        // 抽出済 (但し caller 側で別 state なので同期する)
        const wireDateVal = fs.wireUnwireDate;
        setFormState(fs);
        setOccurredAtDate(occurred);
        setNote(noteVal);
        setWireUnwireDate(wireDateVal);
        // 既存写真を prefill (PhotoFieldItem に id 設定、 ADR-0055 PR-2 で追加した field)
        const existingPhotos = await getAllPhotosByEventId(editingEventId);
        const photoItems: PhotoFieldItem[] = existingPhotos.map((p) => ({
          id: p.id,
          uri: p.absoluteUri,
          width: p.width,
          height: p.height,
        }));
        setPhotos(photoItems);
        // initial refs を fetched 値で同期更新 → isDirty 誤発火防止
        initialFormStateRef.current = fs;
        initialOccurredAtDateRef.current = occurred;
        initialNoteRef.current = noteVal;
        initialWireUnwireDateRef.current = wireDateVal;
        initialPhotosRef.current = photoItems; // PR-4 写真差分計算用 base
        prefilledRef.current = true;
      } catch (err) {
        // 編集対象 event が見つからない / 異常時は new mode と同様 base default のまま継続。
        // user は通常 form を「新規記録」 として完了できる (defensive、 crash 回避)。
        console.warn('[WorkLogConfirmScreen] edit mode prefill failed', err);
      }
    })();
  }, [mode, editingEventId, selectedType, settingsPotUnit]);
  // ADR-0055 Sess77 PR-3/PR-4: edit mode の prefill 完了前は isDirty 算出を抑止 (false 固定)、
  // 完了後は通常通り diff 比較。 new/convert mode は従来通り、 photos.length > 0 で dirty 判定。
  // PR-4: photos の diff は id-set 比較で正確化 (削除集合 + 追加集合の どちらかが空でなければ dirty)。
  const isDirty = React.useMemo(() => {
    if (mode === 'edit' && !prefilledRef.current) return false;
    const baseDirty =
      note !== initialNoteRef.current ||
      occurredAtDate !== initialOccurredAtDateRef.current ||
      JSON.stringify(formState) !== JSON.stringify(initialFormStateRef.current) ||
      wireUnwireDate !== initialWireUnwireDateRef.current;
    let photosDirty = false;
    if (mode === 'edit') {
      const initialIds = new Set(
        initialPhotosRef.current.map((p) => p.id).filter((id): id is string => Boolean(id)),
      );
      const currentIds = new Set(photos.map((p) => p.id).filter((id): id is string => Boolean(id)));
      const hasDeleted = [...initialIds].some((id) => !currentIds.has(id));
      const hasAdded = photos.some((p) => !p.id);
      photosDirty = hasDeleted || hasAdded;
    } else {
      photosDirty = photos.length > 0;
    }
    return baseDirty || photosDirty;
  }, [mode, note, occurredAtDate, photos, formState, wireUnwireDate]);
  const { guardVisible, confirmDiscard, cancelDiscard } = useUnsavedChangesGuard({
    isDirty,
    bypass: isSubmitting,
  });

  // Sess19 PR-4 (ADR-0031 D3 + D4): 直接 await + router.replace でカレンダー遷移。
  // Sess23 PR-4-3 (ADR-0035 D7/D8): fromPlannedId 指定時 → atomic 変換、 通常 FAB 経路 → 同条件 planned auto-cancel。
  // ADR-0055 Sess77 PR-3: edit mode (eventId 指定) は updateEvent + 写真追加 + Toast「更新しました」 + router.replace。
  // 写真差分処理 (削除) は PR-4 で 実装、 PR-3 は新規追加のみ (既存写真の uri は変わらないので addPhotoFromUri が
  // id 持ち item には no-op 効果、 厳密には PhotoField の delete UI が PR-4 まで露出しない)。
  const persistAndNavigate = React.useCallback(
    async (payload: Record<string, unknown>, occurredAtUtc: string) => {
      if (!bonsaiId || !selectedType) return;
      try {
        // === edit mode (ADR-0055 Sess77 PR-3 + PR-4 写真差分 + 通知 reschedule) ===
        if (mode === 'edit' && editingEventId) {
          const noteText = note.trim().length > 0 ? note.trim() : null;
          // 1. updateEvent atomic (FTS5 sync 含む)、 先行で成功させる。 失敗時は Alert で UI 復帰。
          await updateEvent(editingEventId, {
            occurredAtUtc,
            payload,
            note: noteText,
          });
          // 2. 写真差分処理 (ADR-0055 §Decision):
          //    - 削除集合 = initialPhotosRef にあって photos に id 不在
          //    - 追加集合 = photos の id を持たない item
          //    partial failure は try/catch で吸収、 rollback はしない (記録本体は保存済が user メリット大、
          //    ADR-0055 §Negative Consequences)。
          const initialMap = new Map(
            initialPhotosRef.current
              .filter((p): p is PhotoFieldItem & { id: string } => Boolean(p.id))
              .map((p) => [p.id, p]),
          );
          const currentIds = new Set(
            photos.map((p) => p.id).filter((id): id is string => Boolean(id)),
          );
          const toDelete = [...initialMap.values()].filter((p) => !currentIds.has(p.id));
          const toAdd = photos.filter((p) => !p.id);
          let photoErrors = 0;
          for (const p of toDelete) {
            try {
              await removePhotoById(p.id, p.uri);
            } catch (err) {
              photoErrors++;
              console.warn('[WorkLogConfirmScreen] photo delete failed', err);
            }
          }
          for (const p of toAdd) {
            try {
              await addPhotoFromUri({
                bonsaiId,
                sourceUri: p.uri,
                eventId: editingEventId,
              });
            } catch (err) {
              photoErrors++;
              console.warn('[WorkLogConfirmScreen] photo add failed', err);
            }
          }
          // 3. 通知 reschedule (ADR-0055 §Decision):
          //    scheduled_unwire_at 変更を確実に反映するため 既存 scheduled を 全 cancel →
          //    SUMMARY 通知再計算で 新値 pickup。 logged → planned に status 変更なし (本 mode は payload 編集のみ)
          //    だが、 wiring scheduled_unwire_at 変更 ケース で必要。
          await cancelForEvent(editingEventId, t);
          void triggerSummaryReschedule(t);
          // 4. Toast: 写真 partial failure があれば 件数を 表示、 なければ「更新しました」 のみ。
          if (photoErrors > 0) {
            useToastStore
              .getState()
              .show(`${t('workLogUpdatedToast')} (photos: ${photoErrors} failed)`);
          } else {
            useToastStore.getState().show(t('workLogUpdatedToast'));
          }
          const dateKey = occurredAtDate || occurredAtUtc.slice(0, 10);
          router.replace(`/(tabs)/record?selectedDateKey=${dateKey}` as Href);
          return;
        }
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
    [bonsaiId, selectedType, note, photos, occurredAtDate, fromPlannedId, mode, editingEventId, t],
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
  // ADR-0055 Sess77 PR-3: mode で title + Save CTA 切替。
  // edit mode → 「{type}を編集」 + 「更新する」、 new/convert mode → 既存「{type} の記録」 + 「保存する」。
  const titleText =
    mode === 'edit'
      ? t('workLogTitleEditing').replace('{type}', titleLabel)
      : t('workLogTitle').replace('{type}', titleLabel);
  const saveCtaLabel = mode === 'edit' ? t('workLogUpdateCta') : t('workLogSaveCta');

  return (
    <View
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_work_log_confirm_screen"
    >
      {/* Sess33 PR-4 (ADR-0039 起票予定): Stack header 廃止 + FormScreenHeader sticky。
          タイトル + bonsaiName は既に ScrollView 内に統合済 → header (sticky) を消して
          full-screen scroll 化。 既存 scrollToEnd (R-46 v3 タイプ A) はそのまま維持。
          Sess65: container/footer の static BG_PRIMARY (washi 固定) を inline c.background 動的化。
          BulkLogConfirmScreen と同 pattern。 */}
      <Stack.Screen options={{ headerShown: false }} />
      <FormScreenHeader testID="e2e_work_log_form_header" />

      <KeyboardAvoidingView style={styles.flexOne} {...kavProps}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <ThemedText style={[styles.title, { color: c.text }]}>{titleText}</ThemedText>
            <ThemedText style={[styles.subject, { color: c.textSecondary }]}>
              {bonsaiName}
            </ThemedText>
          </View>

          {/* Sess16 PR-A2: 日付選択 (mockup 14 種別共通 field、 全 form の先頭に配置)。
              ADR-0055 Sess77 PR-3 (解釈 ① 発見性向上): 直下に inline hint テキスト
              「タップで日付を変更できます」 を 毎回表示 (dismiss flag なし、 19 言語整合)。
              テスター苦情「過去の作業の入力ができないようだ」 = 日付欄が tap で 変更可能なことに
              気づかなかった発見性の低さが真因、 hint で構造解決。 */}
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
            <ThemedText
              style={[styles.dateHint, { color: c.textSecondary }]}
              testID="e2e_work_log_date_hint"
            >
              {t('dateFieldHint')}
            </ThemedText>
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

          {/* Sess16 PR-A3: 写真添付 (mockup 14 種別共通、 Pro 最大 10 枚、 ADR-0049 Sess59 PR3 Free 3 枚) */}
          <View style={styles.field}>
            <PhotoField
              label={t('workLogPhotoField')}
              optional
              optionalText={t('workLogOptional')}
              photos={photos}
              onChange={setPhotos}
              isPro={photoGuard.isPro}
              onLimitReached={showPhotoLimitPaywall}
              testID="e2e_work_log_photo_field"
            />
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: c.background, borderTopColor: c.border }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saveCtaLabel}
            style={[styles.saveBtn, { backgroundColor: c.tint }]}
            onPress={handleSubmit}
            testID="e2e_work_log_save"
          >
            <ThemedText style={[styles.saveText, { color: c.onTint }]}>{saveCtaLabel}</ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      {/* Sess39 PR-2 (issue #822): 未保存 changes 確認 dialog */}
      <ConfirmDialog
        visible={guardVisible}
        title={t('discardChanges')}
        description={t('discardChangesDesc')}
        confirmLabel={t('discard')}
        cancelLabel={t('keepEditing')}
        destructive
        onConfirm={confirmDiscard}
        onCancel={cancelDiscard}
        testID="e2e_discard_dialog_work_log_confirm"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flexOne: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 96 },
  header: { paddingTop: 8, paddingBottom: 16, alignItems: 'center', gap: 4 },
  title: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 20,
    letterSpacing: 0.4,
  },
  subject: { fontSize: 13 },
  field: { marginBottom: 18 },
  // ADR-0055 Sess77 PR-3: 日付欄直下 inline hint (解釈 ① 発見性向上)
  dateHint: { fontSize: 11, marginTop: 4 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 34,
    borderTopWidth: 1,
  },
  // Sess70 PR-C3: bg / color は inline c.tint / c.onTint (scheme-aware)。
  saveBtn: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { fontSize: 17, fontWeight: '500', letterSpacing: 0.4 },
});
