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
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  UIManager,
  View,
  findNodeHandle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { useKeyboardAvoidingProps } from '@/src/core/hooks/useKeyboardAvoidingProps';
import { useUnsavedChangesGuard } from '@/src/core/hooks/useUnsavedChangesGuard';
import { FormScreenHeader } from '@/src/components/form/FormScreenHeader';
import { LabeledDateRow } from '@/src/components/form/LabeledDateRow';
import { LabeledTextInput } from '@/src/components/form/LabeledTextInput';
import { PhotoField, type PhotoFieldItem } from '@/src/components/form/PhotoField';
import { useToastStore } from '@/src/components/Toast';
import { getTzOffsetMin, nowUtc } from '@/src/core/datetime';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
// Sess68 PR #C: BORDER_DEFAULT / TEXT_PRIMARY / TEXT_SECONDARY は inline c.* 化、 ON_BRAND は brand-static で保持。
import { ON_BRAND } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import {
  bulkConvertPlannedToRecorded,
  bulkScheduleEvents,
  convertPlannedToRecorded,
  createEvent,
  findPlannedEventByCondition,
} from '@/src/db/eventRepository';
import { FREE_PHOTO_LIMIT_PER_EVENT } from '@/src/db/photoRepository';
import {
  countActiveRecurrenceGroups,
  bulkCreateRecurrenceRules,
} from '@/src/db/recurrenceRuleRepository';
import { cancelForEvent } from '@/src/features/notification/cancelForEvent';
import { maybePromptNotificationOptIn } from '@/src/features/notification/optInPrompt';
import { addPhotoFromUri } from '@/src/features/photos/photoOrchestrator';
import { useProGuard } from '@/src/features/pro/useProGuard';
import { EVENT_TYPES, type EventType } from '@/src/db/schema';
import { triggerSummaryReschedule } from '@/src/features/notification/triggerReschedule';
import { maybeRequestReview } from '@/src/features/review/maybeRequestReview';
import { toLocalDateKey } from '@/src/features/watering/dateUtils';
import {
  RecurrencePicker,
  DEFAULT_RECURRENCE_VALUE,
  type RecurrenceValue,
} from '@/src/components/form/RecurrencePicker';
import { RECURRENCE_PRESETS } from '@/src/core/recurrence/rrule';
// Sess31 PR-1: BonsaiPlaceholder/hashSeed import 削除 (chip 内の灰色丸を撤去、 SelectedBonsaiChip に集約)
import { SelectedBonsaiChip } from '@/src/features/bonsai/SelectedBonsaiChip';
import { usePickerStore } from '@/src/stores/pickerStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { SERIF_FAMILY } from '@/src/core/theme/typography';

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
  // Sess32 PR-1 → Sess33 PR-2 hotfix (R-46 v3): UIManager.measureLayout で ScrollView 内 input 位置を
  // 精密取得 + scrollTo。 旧実装 `noteInputRef.current?.measureLayout(...)` は forwardRef 経由 ref で
  // 「ref to a native component」 として認識されず Console Error 発生 (Sess32 PR-1 時から潜在)。
  // findNodeHandle + UIManager.measureLayout (公式 native API) で安全に呼び出し。
  const scrollRef = React.useRef<ScrollView>(null);
  const noteInputRef = React.useRef<TextInput>(null);
  const handleNoteFocus = React.useCallback(() => {
    // IME 起動アニメ完了 + KAV resize 完了待ち (Android: 約 350ms、 iOS: 約 250ms 想定で 350 採用)。
    setTimeout(() => {
      const scrollNode = findNodeHandle(scrollRef.current);
      const inputNode = findNodeHandle(noteInputRef.current);
      if (scrollNode == null || inputNode == null) {
        scrollRef.current?.scrollToEnd({ animated: true });
        return;
      }
      // UIManager.measureLayout(node, relativeToNativeNode, onFail, onSuccess) — RN 公式 API。
      // input の ScrollView 内座標 y を取得 → scrollTo({y: y - 80}) で input 上端を画面上 80px に配置
      // (FormScreenHeader 56 + 余白 24)。 IME 起動後 viewport で input が IME に隠れない位置に scroll。
      UIManager.measureLayout(
        inputNode,
        scrollNode,
        () => {
          // 失敗時 fallback、 scrollToEnd で代替。
          scrollRef.current?.scrollToEnd({ animated: true });
        },
        (_x, y) => {
          scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
        },
      );
    }, 350);
  }, []);
  const params = useLocalSearchParams<{
    type?: string;
    fromPlannedIds?: string;
    date?: string;
    mode?: 'schedule' | 'log';
    /** Sess99 #1127: 保存後の戻り先 ('dismiss' = modal 全閉じで起点画面へ、盆栽詳細動線用)。 */
    returnTo?: string;
  }>();
  // Sess79 PR-6 ADR-0056: schedule mode (= 予定追加、 status='planned') と log mode (= 記録、 status='logged') の判別
  const isScheduleMode = params.mode === 'schedule';
  const returnToDismiss = params.returnTo === 'dismiss';
  const selectedType = React.useMemo(() => parseType(params.type), [params.type]);
  const fromPlannedIds = React.useMemo<string[]>(
    () => (params.fromPlannedIds ? params.fromPlannedIds.split(',').filter(Boolean) : []),
    [params.fromPlannedIds],
  );
  const selectedBonsais = usePickerStore((s) => s.bulkContext?.selectedBonsais ?? []);

  const [note, setNote] = React.useState('');
  // Sess36 PR-7 (ADR-0042 関連 fix、 Bug ①+②): カレンダー選択日 URL param 優先、
  // 未指定時は TZ 安全な local 「今日」 (toLocalDateKey)。 旧 `nowUtc().slice(0, 10)` は
  // UTC 日付を返すため JST 早朝に「昨日」 default 化する bug を修正 (ADR-0008 §TZ 3 層防御の
  // 正しい使い方 = `toLocalDateKey(utc, tzOffsetMin)`、 ADR-0008 Notes Amended PR-8 連動)。
  const [occurredAtDate, setOccurredAtDate] = React.useState(
    () => params.date ?? toLocalDateKey(nowUtc() as string, getTzOffsetMin()),
  );
  // Sess16 PR-B2 → PR-H: 写真添付 (caption 削除、 BonsaiBasicForm PendingPhoto 整合)
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
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Sess17 PR-H2: 14 種別 form state を Single と同 component で集約 (ADR-0029 D5 §16 1:1 整合)。
  const settingsPotUnit = useSettingsStore((s) => s.potUnit);
  const [formState, setFormState] = React.useState<WorkLogTypeFormState>(() =>
    createWorkLogTypeFormInitialState(settingsPotUnit),
  );

  // Sess79 PR-6 ADR-0056: 定期予定 (recurring) state、 schedule mode でのみ UI 表示。
  const [recurrenceValue, setRecurrenceValue] =
    React.useState<RecurrenceValue>(DEFAULT_RECURRENCE_VALUE);
  // Pro 境界 (ADR-0049 ⑦ Sess101 Amendment): 現在 active な予定グループ数を useProGuard に渡す
  // (= ここからの保存は盆栽数に関わらず 1 グループ作成 = +1 として判定、 Sess101 #1159)
  const [activeGroupCount, setActiveGroupCount] = React.useState(0);
  React.useEffect(() => {
    if (!isScheduleMode) return;
    void countActiveRecurrenceGroups().then(setActiveGroupCount);
  }, [isScheduleMode]);
  const recurringGuard = useProGuard({
    feature: 'recurring_rule',
    currentCount: activeGroupCount,
  });

  // Sess39 PR-2 (issue #822): 未保存 changes 確認 dialog (WorkLogConfirmScreen と同 pattern)
  const initialNoteRef = React.useRef(note);
  const initialOccurredAtDateRef = React.useRef(occurredAtDate);
  const initialFormStateRef = React.useRef(formState);
  const isDirty = React.useMemo(
    () =>
      note !== initialNoteRef.current ||
      occurredAtDate !== initialOccurredAtDateRef.current ||
      photos.length > 0 ||
      JSON.stringify(formState) !== JSON.stringify(initialFormStateRef.current),
    [note, occurredAtDate, photos, formState],
  );
  const { guardVisible, confirmDiscard, cancelDiscard } = useUnsavedChangesGuard({
    isDirty,
    bypass: isSubmitting,
  });

  if (selectedType == null) return null;

  const handleSave = async () => {
    if (isSubmitting) return;
    // Sess79 PR-6 ADR-0056: recurring 有効 + Free 上限到達 → Paywall 起動 (= ADR-0049 ⑦ Grandfathered 整合)
    if (isScheduleMode && recurrenceValue.enabled && !recurringGuard.canAdd) {
      recurringGuard.openPaywall();
      return;
    }
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
    let recurringCreatedCount = 0;
    try {
      // Sess79 PR-6 ADR-0056: schedule mode 分岐
      if (isScheduleMode) {
        const startAtUtc = occurredAtUtc ?? (nowUtc() as string);
        if (recurrenceValue.enabled) {
          // recurring rule 作成 (各 bonsai につき 1 ルール、 8 週分先まで planned events 自動生成)
          const endAtUtcValue =
            recurrenceValue.endType === 'oneYear'
              ? new Date(new Date(startAtUtc).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()
              : recurrenceValue.endType === 'specific' && recurrenceValue.endDate
                ? `${recurrenceValue.endDate}T23:59:59.000Z`
                : null;
          // Sess99 #1122: 旧 createRecurrenceRule loop → bulkCreateRecurrenceRules に置換。
          // R-73 (複数件 INSERT は bulk ラッパーで原子性保証) 整合 + 1 回の操作 = 1 グループ
          // (group_id 共有) として管理画面に 1 行表示される (案 G2)。
          const created = await bulkCreateRecurrenceRules(
            bonsaiIds.map((bid) => ({
              bonsaiId: bid,
              eventType: selectedType,
              rrule: RECURRENCE_PRESETS[recurrenceValue.preset],
              startAtUtc,
              endAtUtc: endAtUtcValue,
            })),
          );
          recurringCreatedCount = created.length;
        } else {
          // 単発 schedule (= 既存 bulkScheduleEvents pattern 流用、 BulkWorkPicker 直接呼出から移行)
          // bulkScheduleEvents の occurredAtUtc は required、 default は startAtUtc (= 「今日」 fallback 含む)
          await bulkScheduleEvents({
            bonsaiIds,
            type: selectedType,
            occurredAtUtc: occurredAtUtc ?? startAtUtc,
          });
        }
        void triggerSummaryReschedule(t);
        const toastKey = recurrenceValue.enabled
          ? 'recurringRuleCreatedToast'
          : 'bulkScheduleDoneToast';
        const toastCount = recurrenceValue.enabled ? recurringCreatedCount : bonsaiIds.length;
        useToastStore.getState().show(t(toastKey).replace('{count}', String(toastCount)));
        // ADR-0014 Amended: 初回予定登録時の通知 soft-ask 判定 (通知 OFF かつ未提示なら生涯 1 回表示)。
        // Sess99 #1119: BulkWorkPicker 直接保存 path の廃止に伴い本画面へ移植 (挙動維持)。
        maybePromptNotificationOptIn();
        // Sess99 #1127 (案 A): 盆栽詳細起点 (returnTo=dismiss) は modal 群を閉じて起点の
        // 盆栽詳細に戻る (focus reload で新予定が timeline に反映される)。
        // 実機検証 (Sess99 SS-15/20) で判明: (modals) は nested Stack のため dismissAll() /
        // dismiss(2) は**その Stack 内の先頭 (= picker) より下に戻れない**。
        // → dismissAll (modal 群の先頭まで畳む) + back (modal 群自体を閉じる) の 2 段で脱出する。
        // 予定タブ起点 (default) は従来どおりカレンダーへ replace (選択日 restore 付き)。
        if (returnToDismiss) {
          router.dismissAll();
          router.back();
          return;
        }
        const dateKey = occurredAtDate || (occurredAtUtc?.slice(0, 10) ?? '');
        router.replace(`/(tabs)/plan?selectedDateKey=${dateKey}`);
        return;
      }
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
      // ADR-0006 Sess98 Amendment D1: 一括記録の保存成功もハッピーモーメント (log mode のみ、
      // schedule mode は上で早期 return 済)。 try 内 = 保存成功時のみ発火、 遷移をブロックしない。
      void maybeRequestReview();
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
    <View
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_bulk_log_confirm_screen"
    >
      {/* Sess33 PR-1 (ADR-0039 起票予定): Stack header 廃止 + FormScreenHeader sticky。
          タイトル + chips + フォームを全部 ScrollView 内に統合し、 IME 起動時にも
          画面全体スクロール (full-screen scroll) 可能に。 旧 sticky header (タイトル + chips)
          は ScrollView の **外** にあり IME 起動時に縦領域を圧迫していた問題を構造解消。
          Sess65: container.backgroundColor = BG_PRIMARY (washi 固定) を inline c.background 動的化。
          dark mode で header dark + body washi の混在 (ユーザー報告 #3) の根本修正。 */}
      <Stack.Screen options={{ headerShown: false }} />
      <FormScreenHeader testID="e2e_bulk_log_form_header" />

      <KeyboardAvoidingView style={styles.flexOne} {...kavProps}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          {/* Sess33 PR-1: タイトル + サブタイトルを ScrollView 内 (旧 sticky header 廃止)。
              Sess99 #1119: schedule mode は予定追加用タイトルに切替。 */}
          <View style={styles.titleBlock}>
            <ThemedText style={[styles.title, { color: c.text }]}>
              {t(isScheduleMode ? 'bulkScheduleConfirmTitle' : 'bulkLogConfirmTitle')
                .replace('{label}', typeLabel)
                .replace('{count}', String(selectedBonsais.length))}
            </ThemedText>
            <ThemedText style={[styles.sub, { color: c.textSecondary }]}>
              {t('bulkLogConfirmSub')}
            </ThemedText>
          </View>

          {/* Sess32 PR-2 (継続): horizontal ScrollView は親 flex に縦 stretch される default を
              `flexGrow:0` で抑制。 Sess33 PR-1 で本体 ScrollView 内に移動 (旧 sticky → scroll 一体)。
              ネスト構造 (外: vertical / 内: horizontal) は RN 標準 pattern、 ジェスチャ衝突なし。 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={[styles.chipsRow, { borderBottomColor: c.border }]}
          >
            {selectedBonsais.map((b) => (
              <SelectedBonsaiChip key={b.id} name={b.name} testID={`e2e_bulk_log_chip_${b.id}`} />
            ))}
          </ScrollView>

          {/* Sess16 PR-B2: 日付選択 (mockup 14 種別共通、 chips の後・form の前)。
              Sess99 #1119: schedule mode は未来日の予定が本筋のため maxToday を外す
              (= 過去日も従来の即書込と同様に許容、 制限強化はしない)。 */}
          <View style={styles.field}>
            <LabeledDateRow
              label={t('workLogDateField')}
              optional
              optionalText={t('workLogOptional')}
              value={occurredAtDate}
              onChangeText={setOccurredAtDate}
              placeholder={t('workLogDatePlaceholderToday')}
              maxToday={!isScheduleMode}
              testID="e2e_bulk_log_date"
              testIDClear="e2e_bulk_log_date_clear"
            />
          </View>

          {/* Sess17 PR-H2 (ADR-0029 D5): 14 種別固有 form を WorkLogTypeFormFields で
            WorkLogConfirm (Single) と 1:1 同じ UI 表示。
            Sess99 #1119: schedule mode では非表示 — 保存 path (bulkScheduleEvents /
            createRecurrenceRule) が payload を持たないため、 表示したまま保存すると入力が
            無言で捨てられる (silent data loss)。 種別固有入力は記録時 (planned → logged 変換) に行う。 */}
          {!isScheduleMode ? (
            <WorkLogTypeFormFields type={selectedType} state={formState} onChange={setFormState} />
          ) : null}

          {/* Sess79 PR-6 ADR-0056: schedule mode でのみ RecurrencePicker 表示 (= 定期予定 toggle + 6 preset + 終了日 3 択) */}
          {isScheduleMode ? (
            <View style={styles.field}>
              <RecurrencePicker
                value={recurrenceValue}
                onChange={setRecurrenceValue}
                disabled={false}
              />
            </View>
          ) : null}

          {/* Sess17 PR-H2: メモ入力 (atom 統一、 typography 整合)。
            Sess18 PR-10: placeholder を type-aware に (getWorkLogNotePlaceholderKey)。
            Sess31 PR-1 (R-46 拡張): onFocus で auto-scroll、 IME 起動時にメモ欄を可視範囲に。
            Sess32 PR-1 (R-46 v3): forwardRef + measureLayout で ScrollView 内 y 位置を精密取得、
            旧 onLayout + memoY 方式 (Sess31 PR-2) は max scroll 値で頭打ちになる事象を解消。 */}
          {/* Sess99 #1119: メモ + 写真は schedule mode では非表示 — 保存 path が note / photos を
            持たず silent data loss になるため (status='planned' は写真なしが仕様、 #1062 整合)。 */}
          {!isScheduleMode ? (
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
          ) : null}

          {/* Sess16 PR-B2: 写真添付 (mockup 14 種別共通、 Pro 最大 10 枚、 全 bonsai に同 photos 紐付け、 ADR-0049 Sess59 PR3 Free 3 枚) */}
          {!isScheduleMode ? (
            <View style={styles.field}>
              <PhotoField
                label={t('workLogPhotoField')}
                optional
                optionalText={t('workLogOptional')}
                photos={photos}
                onChange={setPhotos}
                isPro={photoGuard.isPro}
                onLimitReached={showPhotoLimitPaywall}
                testID="e2e_bulk_log_photo_field"
              />
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.background }]}>
          {/* Sess99 #1119: schedule mode は既存 bulkScheduleConfirmCta (Sess79 由来) を流用。 */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(
              isScheduleMode ? 'bulkScheduleConfirmCta' : 'bulkLogSaveCta',
            ).replace('{count}', String(selectedBonsais.length))}
            accessibilityState={{ disabled: isSubmitting }}
            disabled={isSubmitting}
            style={[styles.cta, { backgroundColor: c.tint }, isSubmitting && styles.ctaDisabled]}
            onPress={handleSave}
            testID="e2e_bulk_log_save_cta"
          >
            <ThemedText style={styles.ctaText}>
              {t(isScheduleMode ? 'bulkScheduleConfirmCta' : 'bulkLogSaveCta').replace(
                '{count}',
                String(selectedBonsais.length),
              )}
            </ThemedText>
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
        testID="e2e_discard_dialog_bulk_log_confirm"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flexOne: { flex: 1 },
  // Sess33 PR-1: 旧 `header` style (sticky 用、 paddingTop:8 + alignItems:center) は ScrollView
  // 内タイトルブロックに置換 → `titleBlock` に rename + paddingTop 拡張 (header 直下 spacing)。
  titleBlock: { paddingTop: 12, paddingBottom: 8, alignItems: 'center', gap: 4 },
  title: {
    fontFamily: SERIF_FAMILY,
    fontSize: 20,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  sub: { fontSize: 12 },
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
